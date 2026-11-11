import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  const full = Math.round(rating);
  return (
    <Text style={{ fontSize: size, letterSpacing: 1 }} accessibilityLabel={`${rating} out of 5 stars`}>
      <Text style={{ color: colors.star }}>{'★'.repeat(full)}</Text>
      <Text style={{ color: '#E2D6C3' }}>{'★'.repeat(5 - full)}</Text>
    </Text>
  );
}

export function Price({ level }: { level: number | null }) {
  if (!level) return <Text style={styles.meta}>Price n/a</Text>;
  return (
    <Text style={styles.meta} accessibilityLabel={`Price level ${level} of 4`}>
      <Text style={{ color: colors.green, fontWeight: '700' }}>{'$'.repeat(level)}</Text>
      <Text style={{ color: '#C9CDD3' }}>{'$'.repeat(4 - level)}</Text>
    </Text>
  );
}

export function formatDistance(km: number) {
  const miles = km * 0.621371;
  return miles < 0.1 ? 'nearby' : `${miles.toFixed(1)} mi`;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  style,
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
  disabled?: boolean;
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        primary ? styles.btnPrimary : styles.btnSecondary,
        { opacity: disabled ? 0.5 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}
    >
      <Text style={[styles.btnText, { color: primary ? '#fff' : colors.navy }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ children }: { children: React.ReactNode }) {
  return <View style={styles.chip}>{children}</View>;
}

const styles = StyleSheet.create({
  meta: { fontSize: 14, color: colors.muted },
  btn: { paddingVertical: 16, paddingHorizontal: 22, borderRadius: radius.pill, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.orange },
  btnSecondary: { backgroundColor: '#fff', borderWidth: 2, borderColor: colors.line },
  btnText: { fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: '#FFF1DC',
  },
});
