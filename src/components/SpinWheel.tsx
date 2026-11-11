import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Defs, LinearGradient, Polygon, Stop } from 'react-native-svg';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { CUISINES, SEGMENT_DEGREES } from '../cuisines';
import { Cuisine } from '../types';

export type SpinWheelHandle = { spin: () => void };

type Props = {
  size: number;
  onSpinStart?: () => void;
  onResult: (cuisine: Cuisine) => void;
};

const SPIN_MS = 10000;
// Fast launch, then a long coast with a drawn-out crawl over the last few wedges,
// so you can hear the clicks spread out one by one before it settles.
const SPIN_EASING = Easing.bezier(0.1, 0.7, 0.1, 1);
const CLICK_POOL = 10; // several players so rapid ticks can overlap instead of cutting each other off
const TICK_SOUNDS = [
  require('../../assets/tick1.wav'),
  require('../../assets/tick2.wav'),
  require('../../assets/tick3.wav'),
];
const FULL_SPEED = 1500; // deg/s treated as "top speed" when mapping speed to sound
// At top speed edges pass ~50×/s; spacing clicks at least this far apart keeps them from
// piling on top of each other (which sums into clipping). Inaudible as a skip at that speed.
const MIN_TICK_GAP_MS = 30;
const HAPTIC_GAP_MS = 45; // light haptic with each tick, capped so it doesn't turn into a buzz
const POINTER = 52; // pointer size in px
const POINTER_OVERHANG = 24; // how far the pointer sits above the wheel's top edge

// Triangle corners in a 100×100 box. Every layer reuses them; thick round-joined
// strokes are what give the shape its soft, rounded corners.
const TRI = '14,14 86,14 50,80';

/** Glossy red pointer with a thick white rim and a soft drop shadow. */
function Pointer() {
  return (
    <Svg width={POINTER} height={POINTER} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="red" x1="0" y1="0" x2="0.35" y2="1">
          <Stop offset="0" stopColor="#FF6A45" />
          <Stop offset="0.55" stopColor="#E8431E" />
          <Stop offset="1" stopColor="#B81F12" />
        </LinearGradient>
        <LinearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#F1E6DA" />
        </LinearGradient>
        <LinearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" />
          <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {/* drop shadow */}
      <Polygon points={TRI} translateY={4} fill="#5A1E00" fillOpacity={0.28} stroke="#5A1E00" strokeOpacity={0.28} strokeWidth={22} strokeLinejoin="round" />
      {/* white rim */}
      <Polygon points={TRI} fill="url(#rim)" stroke="url(#rim)" strokeWidth={20} strokeLinejoin="round" />
      {/* thin dark edge where the rim meets the red */}
      <Polygon points={TRI} fill="#9E1A0E" stroke="#9E1A0E" strokeWidth={7} strokeLinejoin="round" />
      {/* red body */}
      <Polygon points={TRI} fill="url(#red)" stroke="url(#red)" strokeWidth={4} strokeLinejoin="round" />
      {/* glossy highlight across the top */}
      <Polygon points={TRI} fill="url(#gloss)" stroke="url(#gloss)" strokeWidth={4} strokeLinejoin="round" />
    </Svg>
  );
}

// Start the audio session up front instead of on the first tick; waking it mid-spin
// is one cause of a crackly first spin.
let audioConfigured = false;
function configureAudio() {
  if (audioConfigured) return;
  audioConfigured = true;
  // playsInSilentMode: false → the wheel stays quiet when the phone's mute switch is on
  // (game sound effects shouldn't override it). mixWithOthers keeps the user's music playing.
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
}

const PRIME_FALLBACK_MS = 1500; // if a player never reports loading, use it anyway after this

/**
 * A pool of "ball hits a fret" click players, always parked at 0 and ready to fire
 * instantly. (Calling seekTo(0) then play() right away is racy: seekTo is async, so play()
 * often runs while the player is still at the end of the clip and the tick is silently lost.)
 * Three slightly different clicks are mixed so fast runs don't sound like a machine gun.
 */
function useTickPool() {
  const pool = useRef<{ player: AudioPlayer; ready: boolean }[]>([]);

  useEffect(() => {
    configureAudio();
    const timers: ReturnType<typeof setTimeout>[] = [];
    const entries = Array.from({ length: CLICK_POOL }, (_, i) => {
      // Not ready until loaded and primed: each player plays once silently first, so the
      // decoder and output are warm and the first real spin doesn't crackle.
      const entry = { player: createAudioPlayer(TICK_SOUNDS[i % TICK_SOUNDS.length]), ready: false, primed: false };
      const prime = () => {
        if (entry.primed) return;
        entry.primed = true;
        entry.player.volume = 0;
        entry.player.play();
      };
      if (entry.player.isLoaded) prime();
      timers.push(setTimeout(() => { if (!entry.primed) { entry.primed = true; entry.ready = true; } }, PRIME_FALLBACK_MS));
      entry.player.addListener('playbackStatusUpdate', (status) => {
        if (status.isLoaded && !entry.primed) prime();
        if (status.didJustFinish) {
          entry.player.pause();
          entry.player.seekTo(0).then(() => { entry.ready = true; }).catch(() => { entry.ready = true; });
        }
      });
      return entry;
    });
    pool.current = entries;
    return () => {
      timers.forEach(clearTimeout);
      entries.forEach((e) => e.player.remove());
    };
  }, []);

  const lastPlayed = useRef(0);

  /** speed: 0 (stopped) … 1 (full speed). Ticks get louder as the wheel slows. */
  return (speed: number) => {
    const now = Date.now();
    if (now - lastPlayed.current < MIN_TICK_GAP_MS) return;
    const ready = pool.current.filter((e) => e.ready);
    if (!ready.length) return; // every player is mid-tick; at that speed one more wouldn't be heard anyway
    const entry = ready[Math.floor(Math.random() * ready.length)];
    entry.ready = false;
    lastPlayed.current = now;
    entry.player.volume = 0.3 + 0.6 * (1 - speed);
    entry.player.play();
  };
}

export const SpinWheel = forwardRef<SpinWheelHandle, Props>(({ size, onSpinStart, onResult }, ref) => {
  const rotation = useRef(new Animated.Value(0)).current;
  const flapper = useRef(new Animated.Value(0)).current;
  const total = useRef(0); // cumulative degrees, so every spin keeps going forward
  const lastWedge = useRef(0);
  const lastHaptic = useRef(0);
  const [spinning, setSpinning] = useState(false);
  const playTick = useTickPool();
  const speed = useRef(0); // current wheel speed, 0 … 1
  const lastSample = useRef({ value: 0, time: 0 });

  const tick = () => {
    playTick(speed.current);
    // Kick the pointer like a peg just hit it, then let it spring back.
    flapper.setValue(1);
    Animated.spring(flapper, { toValue: 0, speed: 40, bounciness: 6, useNativeDriver: true }).start();
    const now = Date.now();
    if (now - lastHaptic.current >= HAPTIC_GAP_MS) {
      lastHaptic.current = now;
      Haptics.selectionAsync().catch(() => {});
    }
  };

  // The wheel animation is JS-driven, so this listener receives the exact angle drawn each
  // frame: a tick fires precisely when a wedge edge (every SEGMENT_DEGREES) crosses the pointer.
  useEffect(() => {
    const id = rotation.addListener(({ value }) => {
      // Measure how fast the wheel is turning right now so the sound can follow it.
      const now = Date.now();
      const prev = lastSample.current;
      if (now > prev.time) {
        const degPerSec = ((value - prev.value) / (now - prev.time)) * 1000;
        speed.current = Math.max(0, Math.min(1, degPerSec / FULL_SPEED));
        lastSample.current = { value, time: now };
      }

      const wedge = Math.floor(value / SEGMENT_DEGREES);
      if (wedge !== lastWedge.current) {
        lastWedge.current = wedge;
        tick();
      }
    });
    return () => rotation.removeListener(id);
  }, [rotation]);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    onSpinStart?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    lastSample.current = { value: total.current, time: Date.now() };

    const index = Math.floor(Math.random() * CUISINES.length);
    // Wedge `index` is centered at (index + 0.5) * SEGMENT clockwise from 12 o'clock.
    // Rotating clockwise by R moves it to angle + R; we want it under the pointer (0°).
    const center = (index + 0.5) * SEGMENT_DEGREES;
    const jitter = (Math.random() - 0.5) * SEGMENT_DEGREES * 0.6; // land off-center, feels natural
    const targetMod = (((360 - center + jitter) % 360) + 360) % 360;
    const currentMod = ((total.current % 360) + 360) % 360;
    const extraTurns = 7 + Math.floor(Math.random() * 3); // more turns keep the launch fast over a long spin
    const delta = extraTurns * 360 + ((targetMod - currentMod + 360) % 360);
    total.current += delta;

    Animated.timing(rotation, {
      toValue: total.current,
      duration: SPIN_MS,
      easing: SPIN_EASING,
      // JS-driven on purpose: keeps the drawn angle and the tick listener in perfect sync.
      useNativeDriver: false,
    }).start(() => {
      speed.current = 0;
      setSpinning(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onResult(CUISINES[index]);
    });
  };

  useImperativeHandle(ref, () => ({ spin }));

  const rotate = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={{ width: size, height: size + POINTER_OVERHANG, alignItems: 'center' }}>
      <Pressable onPress={spin} accessibilityRole="button" accessibilityLabel="Spin the food wheel" style={{ marginTop: POINTER_OVERHANG }}>
        <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }}>
          <Image source={require('../../assets/wheel.png')} style={{ width: size, height: size }} resizeMode="contain" />
        </Animated.View>
      </Pressable>
      {/* Pointer at 12 o'clock */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pointerWrap,
          { transform: [{ rotate: flapper.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-22deg'] }) }] },
        ]}
      >
        <Pointer />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  // Sized to the pointer and pivoting at its top so it flicks like a flapper.
  pointerWrap: { position: 'absolute', top: 0, width: POINTER, height: POINTER, transformOrigin: 'top' },
});
