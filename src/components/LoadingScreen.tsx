import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '../theme';

/** Must match `imageWidth` for expo-splash-screen in app.json, so the hand-off is seamless. */
const WHEEL_SIZE = 200;
const SPIN_MS = 1300;
const FADE_MS = 280;

/**
 * Opening animation. It starts exactly where the native splash leaves off (same image,
 * size, position and background), spins the wheel to a stop, shows the name, then fades
 * away to reveal the home screen, which has been rendering underneath the whole time.
 */
export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const spin = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const started = useRef(false);

  const start = async () => {
    if (started.current) return;
    started.current = true;
    await SplashScreen.hideAsync().catch(() => {});
    const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
    Animated.sequence([
      Animated.parallel([
        reduceMotion
          ? Animated.delay(500)
          : Animated.timing(spin, { toValue: 1, duration: SPIN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(text, { toValue: 1, duration: 450, delay: reduceMotion ? 0 : 350, useNativeDriver: true }),
      ]),
      Animated.delay(250),
      Animated.timing(fade, { toValue: 0, duration: FADE_MS, useNativeDriver: true }),
    ]).start(() => onDone());
  };

  // Safety net: never leave the user stuck behind the loader.
  useEffect(() => {
    const t = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
      onDone();
    }, 5000);
    return () => clearTimeout(t);
  }, [onDone]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '1080deg'] });
  const rise = text.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: fade }]} onLayout={start} pointerEvents="none">
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Image source={require('../../assets/splash-icon.png')} style={styles.wheel} resizeMode="contain" />
      </Animated.View>
      {/* Absolutely positioned so the wheel stays dead-centre, like the native splash. */}
      <Animated.View style={[styles.textWrap, { opacity: text, transform: [{ translateY: rise }] }]}>
        <Text style={styles.title}>Spin to Dine</Text>
        <Text style={styles.subtitle}>Can't decide? Let the wheel pick.</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  wheel: { width: WHEEL_SIZE, height: WHEEL_SIZE },
  textWrap: { position: 'absolute', top: '50%', marginTop: WHEEL_SIZE / 2 - 10, alignItems: 'center' },
  title: { fontSize: 34, fontWeight: '900', color: colors.red, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 4, fontWeight: '600' },
});
