import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
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

export const SpinWheel = forwardRef<SpinWheelHandle, Props>(({ size, onSpinStart, onResult }, ref) => {
  const rotation = useRef(new Animated.Value(0)).current;
  const total = useRef(0); // cumulative degrees, so every spin keeps going forward
  const [spinning, setSpinning] = useState(false);

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
      easing: Easing.bezier(0.15, 0.85, 0.25, 1),
      useNativeDriver: true,
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
      <View pointerEvents="none" style={styles.pointerWrap}>
        <View style={styles.pointerBorder} />
        <View style={styles.pointer} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  pointerWrap: { position: 'absolute', top: 0, alignItems: 'center' },
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
