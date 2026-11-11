import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import { CUISINES, SEGMENT_DEGREES } from '../cuisines';
import { Cuisine } from '../types';
import { colors } from '../theme';

export type SpinWheelHandle = { spin: () => void };

type Props = {
  size: number;
  onSpinStart?: () => void;
  onResult: (cuisine: Cuisine) => void;
};

const SPIN_MS = 4200;
const SPIN_EASING = Easing.bezier(0.15, 0.85, 0.25, 1);
const CLICK_POOL = 8; // several players so rapid ticks can overlap instead of cutting each other off
const HAPTIC_GAP_MS = 45; // light haptic with each tick, capped so it doesn't turn into a buzz

/**
 * A pool of players that are always parked at 0 and ready to fire instantly.
 * (Calling seekTo(0) then play() right away is racy: seekTo is async, so play() often
 * runs while the player is still at the end of the clip and the tick is silently lost.)
 */
function useTickPool() {
  const pool = useRef<{ player: AudioPlayer; ready: boolean }[]>([]);

  useEffect(() => {
    const entries = Array.from({ length: CLICK_POOL }, () => {
      const entry = { player: createAudioPlayer(require('../../assets/click.wav')), ready: true };
      entry.player.volume = 0.7;
      entry.player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          entry.player.pause();
          entry.player.seekTo(0).then(() => { entry.ready = true; }).catch(() => { entry.ready = true; });
        }
      });
      return entry;
    });
    pool.current = entries;
    return () => entries.forEach((e) => e.player.remove());
  }, []);

  return () => {
    const entry = pool.current.find((e) => e.ready);
    if (!entry) return; // every player is mid-tick; at that speed one more wouldn't be heard anyway
    entry.ready = false;
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

  const tick = () => {
    playTick();
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

    const index = Math.floor(Math.random() * CUISINES.length);
    // Wedge `index` is centered at (index + 0.5) * SEGMENT clockwise from 12 o'clock.
    // Rotating clockwise by R moves it to angle + R; we want it under the pointer (0°).
    const center = (index + 0.5) * SEGMENT_DEGREES;
    const jitter = (Math.random() - 0.5) * SEGMENT_DEGREES * 0.6; // land off-center, feels natural
    const targetMod = (((360 - center + jitter) % 360) + 360) % 360;
    const currentMod = ((total.current % 360) + 360) % 360;
    const extraTurns = 5 + Math.floor(Math.random() * 3);
    const delta = extraTurns * 360 + ((targetMod - currentMod + 360) % 360);
    total.current += delta;

    Animated.timing(rotation, {
      toValue: total.current,
      duration: SPIN_MS,
      easing: SPIN_EASING,
      // JS-driven on purpose: keeps the drawn angle and the tick listener in perfect sync.
      useNativeDriver: false,
    }).start(() => {
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
    <View style={{ width: size, height: size + 18, alignItems: 'center' }}>
      <Pressable onPress={spin} accessibilityRole="button" accessibilityLabel="Spin the food wheel" style={{ marginTop: 18 }}>
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
        <View style={styles.pointerBorder} />
        <View style={styles.pointer} />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  // Sized to the pointer and pivoting at its top so it flicks like a flapper.
  pointerWrap: { position: 'absolute', top: 0, width: 38, height: 38, alignItems: 'center', transformOrigin: 'top' },
  pointerBorder: {
    position: 'absolute',
    top: -3,
    width: 0,
    height: 0,
    borderLeftWidth: 19,
    borderRightWidth: 19,
    borderTopWidth: 38,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderTopWidth: 30,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.navy,
  },
});
