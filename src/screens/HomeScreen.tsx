import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SpinWheel, SpinWheelHandle } from '../components/SpinWheel';
import { Button } from '../components/ui';
import { Cuisine } from '../types';
import { colors, radius, shadow } from '../theme';

/** onFindPlaces(null) means browse every cuisine without spinning. */
export function HomeScreen({ onFindPlaces }: { onFindPlaces: (c: Cuisine | null) => void }) {
  const { width, height } = useWindowDimensions();
  const wheelSize = Math.min(width - 48, height * 0.46, 380);
  const wheel = useRef<SpinWheelHandle>(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Cuisine | null>(null);
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!result) return;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
  }, [result, pop]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Spin to Eat</Text>
        <Text style={styles.subtitle}>Can't decide? Let the wheel pick.</Text>
      </View>

      <View style={styles.wheelArea}>
        <SpinWheel
          ref={wheel}
          size={wheelSize}
          onSpinStart={() => {
            setSpinning(true);
            setResult(null);
          }}
          onResult={(c) => {
            setSpinning(false);
            setResult(c);
          }}
        />
      </View>

      <View style={styles.bottom}>
        {result ? (
          <Animated.View
            style={[
              styles.resultCard,
              { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] },
            ]}
          >
            <Text style={styles.resultKicker}>TONIGHT YOU'RE HAVING</Text>
            <Text style={styles.resultText}>
              {result.emoji} {result.label}
            </Text>
            <Button title="Show me places" onPress={() => onFindPlaces(result)} style={{ alignSelf: 'stretch' }} />
            <Button title="Spin again" variant="secondary" onPress={() => wheel.current?.spin()} style={{ alignSelf: 'stretch', marginTop: 10 }} />
          </Animated.View>
        ) : (
          <View style={styles.idle}>
            <Text style={styles.hint}>{spinning ? 'Spinning…' : 'Tap the wheel or the button to spin'}</Text>
            <Button title={spinning ? 'Spinning…' : 'SPIN'} onPress={() => wheel.current?.spin()} disabled={spinning} style={{ alignSelf: 'stretch' }} />
          </View>
        )}
        <Pressable
          onPress={() => onFindPlaces(null)}
          disabled={spinning}
          style={({ pressed }) => [styles.browse, { opacity: spinning ? 0.4 : pressed ? 0.6 : 1 }]}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Text style={styles.browseText}>Skip the spin · browse all restaurants ›</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  header: { alignItems: 'center', paddingTop: 12 },
  title: { fontSize: 34, fontWeight: '900', color: colors.red, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: colors.muted, marginTop: 2 },
  wheelArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottom: { paddingHorizontal: 20, paddingBottom: 16, minHeight: 210, justifyContent: 'flex-end' },
  idle: { alignItems: 'center', gap: 12 },
  browse: { alignSelf: 'center', paddingVertical: 10, marginTop: 6 },
  browseText: { color: colors.navy, fontWeight: '700', fontSize: 15 },
  hint: { color: colors.muted, fontSize: 14 },
  resultCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 18,
    alignItems: 'center',
    ...shadow,
  },
  resultKicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, color: colors.muted },
  resultText: { fontSize: 30, fontWeight: '900', color: colors.ink, marginVertical: 10 },
});
