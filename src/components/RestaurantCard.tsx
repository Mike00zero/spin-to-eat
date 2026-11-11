import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Cuisine, Restaurant } from '../types';
import { colors, radius, shadow } from '../theme';
import { formatDistance, Price, Stars } from './ui';

export function Photo({
  uri,
  cuisine,
  height,
  width,
  rounded = true,
}: {
  uri?: string;
  cuisine: Cuisine;
  height: number;
  width?: number;
  rounded?: boolean;
}) {
  const style = { height, width: width ?? '100%', borderRadius: rounded ? radius.md : 0 } as const;
  if (uri) return <Image source={{ uri }} style={[style, { backgroundColor: colors.line }]} resizeMode="cover" />;
  return (
    <View style={[style, styles.placeholder, { backgroundColor: cuisine.color }]}>
      <Text style={{ fontSize: height * 0.4 }}>{cuisine.emoji}</Text>
    </View>
  );
}

export function RestaurantCard({
  restaurant: r,
  rank,
  cuisine,
  onPress,
}: {
  restaurant: Restaurant;
  rank: number;
  cuisine: Cuisine;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1 }]}>
      <View>
        <Photo uri={r.photos[0]} cuisine={cuisine} height={160} />
        <View style={styles.rank}>
          <Text style={styles.rankText}>#{rank}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {r.name}
        </Text>
        <View style={styles.row}>
          <Text style={styles.rating}>{r.rating.toFixed(1)}</Text>
          <Stars rating={r.rating} />
          <Text style={styles.meta}>({r.ratingCount.toLocaleString()})</Text>
        </View>
        <View style={[styles.row, { marginTop: 4 }]}>
          <Price level={r.priceLevel} />
          <Text style={styles.dot}>·</Text>
          <Text style={styles.meta}>{formatDistance(r.distanceKm)}</Text>
          {r.openNow !== undefined && (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={[styles.meta, { color: r.openNow ? colors.green : colors.red, fontWeight: '700' }]}>
                {r.openNow ? 'Open now' : 'Closed'}
              </Text>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 10, marginBottom: 14, ...shadow },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  rank: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: colors.navy,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  rankText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  body: { paddingHorizontal: 6, paddingTop: 10, paddingBottom: 4 },
  name: { fontSize: 18, fontWeight: '800', color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  rating: { fontSize: 14, fontWeight: '800', color: colors.ink },
  meta: { fontSize: 14, color: colors.muted },
  dot: { color: colors.muted },
});
