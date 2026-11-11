import React, { useRef } from 'react';
import { Animated, Image, Linking, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { Photo } from '../components/RestaurantCard';
import { Button, Chip, formatDistance, Price, Stars } from '../components/ui';
import { Cuisine, Restaurant } from '../types';
import { colors, radius, shadow } from '../theme';

const EDGE_WIDTH = 30; // swipe must start this close to the left edge (keeps the photo carousel swipeable)
const DISMISS_FRACTION = 0.35; // drag past this much of the screen to go back…
const DISMISS_VELOCITY = 0.6; // …or flick faster than this (px/ms)

/**
 * iOS-style "swipe from the left edge to go back". The page follows the finger;
 * letting go far enough (or with a flick) slides it away and calls onBack, otherwise
 * it springs back into place.
 */
function useSwipeBack(width: number, onBack: () => void) {
  const x = useRef(new Animated.Value(0)).current;
  const latest = useRef({ width, onBack });
  latest.current = { width, onBack };

  const responder = useRef(
    PanResponder.create({
      // Capture so the horizontal photo ScrollView doesn't grab an edge swipe first.
      onMoveShouldSetPanResponderCapture: (_, g) =>
        g.x0 <= EDGE_WIDTH && g.dx > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => x.setValue(Math.max(0, g.dx)),
      onPanResponderRelease: (_, g) => {
        const { width: w, onBack: back } = latest.current;
        if (g.dx > w * DISMISS_FRACTION || g.vx > DISMISS_VELOCITY) {
          Animated.timing(x, { toValue: w, duration: 180, useNativeDriver: true }).start(() => back());
        } else {
          Animated.spring(x, { toValue: 0, bounciness: 0, speed: 20, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(x, { toValue: 0, bounciness: 0, speed: 20, useNativeDriver: true }).start();
      },
    }),
  ).current;

  return { x, handlers: responder.panHandlers };
}

export function DetailsScreen({ restaurant: r, cuisine, onBack }: { restaurant: Restaurant; cuisine: Cuisine; onBack: () => void }) {
  const { width } = useWindowDimensions();
  const photos = r.photos.length ? r.photos : [undefined];
  const swipe = useSwipeBack(width, onBack);

  const openDirections = () => {
    const { latitude, longitude } = r.location;
    const label = encodeURIComponent(r.name);
    const url = Platform.select({
      ios: `maps://?daddr=${latitude},${longitude}&q=${label}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    });
    Linking.openURL(url).catch(() => {});
  };

  // Prefer the dedicated reviews link from Places; otherwise fall back to the
  // place's Maps page, or a Maps search by name + address (demo mode).
  const allReviewsUrl =
    r.reviewsUrl ??
    r.mapsUrl ??
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name} ${r.address}`)}`;

  return (
    <Animated.View style={[styles.root, styles.edgeShadow, { transform: [{ translateX: swipe.x }] }]} {...swipe.handlers}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {photos.map((uri, i) => (
              <Photo key={i} uri={uri} cuisine={cuisine} height={280} width={width} rounded={false} />
            ))}
          </ScrollView>
          <SafeAreaView edges={['top']} style={styles.backWrap} pointerEvents="box-none">
            <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
              <Text style={styles.backText}>‹ Back</Text>
            </Pressable>
          </SafeAreaView>
          {r.photos.length > 1 && (
            <View style={styles.photoCount}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{r.photos.length} photos · swipe</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.name}>{r.name}</Text>
          <View style={styles.row}>
            <Text style={styles.bigRating}>{r.rating.toFixed(1)}</Text>
            <Stars rating={r.rating} size={18} />
            <Text style={styles.meta}>{r.ratingCount.toLocaleString()} Google reviews</Text>
          </View>
          <View style={[styles.row, { marginTop: 10 }]}>
            <Chip>
              <Price level={r.priceLevel} />
            </Chip>
            <Chip>
              <Text style={styles.meta}>{formatDistance(r.distanceKm)} away</Text>
            </Chip>
            {r.openNow !== undefined && (
              <Chip>
                <Text style={{ color: r.openNow ? colors.green : colors.red, fontWeight: '700' }}>{r.openNow ? 'Open now' : 'Closed now'}</Text>
              </Chip>
            )}
          </View>
          {!!r.address && <Text style={[styles.meta, { marginTop: 12 }]}>{r.address}</Text>}
          {!!r.websiteUrl && (
            <Pressable
              onPress={() => Linking.openURL(r.websiteUrl!).catch(() => {})}
              style={({ pressed }) => [{ marginTop: 6, alignSelf: 'flex-start' }, pressed && { opacity: 0.6 }]}
              hitSlop={8}
              accessibilityRole="link"
            >
              <Text style={styles.website} numberOfLines={1}>
                🌐 {r.websiteUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
              </Text>
            </Pressable>
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <Button title="Directions" onPress={openDirections} style={{ flex: 1 }} />
            {r.mapsUrl && (
              <Button title="Google Maps" variant="secondary" onPress={() => Linking.openURL(r.mapsUrl!)} style={{ flex: 1 }} />
            )}
          </View>

          <View style={styles.mapCard}>
            <MapView
              style={{ height: 170 }}
              scrollEnabled={false}
              zoomEnabled={false}
              initialRegion={{ ...r.location, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
            >
              <Marker coordinate={r.location} pinColor={colors.red} />
            </MapView>
          </View>

          {!!r.hours?.length && (
            <>
              <Text style={styles.section}>Hours</Text>
              <View style={styles.hoursCard}>
                {r.hours.map((line, i) => {
                  // Google lists Monday first; JS getDay() is 0 = Sunday.
                  const today = i === (new Date().getDay() + 6) % 7;
                  const split = line.indexOf(': ');
                  const day = split > 0 ? line.slice(0, split) : line;
                  const times = split > 0 ? line.slice(split + 2) : '';
                  return (
                    <View key={i} style={[styles.hoursRow, today && styles.hoursToday]}>
                      <Text style={[styles.hoursDay, today && styles.hoursTodayText]}>{day}</Text>
                      <Text style={[styles.hoursTime, today && styles.hoursTodayText]}>{times}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          <Text style={styles.section}>What people are saying</Text>
          {r.reviews.length === 0 && <Text style={styles.meta}>No reviews yet.</Text>}
          {r.reviews.map((rev, i) => (
            <View key={i} style={styles.review}>
              <View style={styles.row}>
                {rev.authorPhoto ? (
                  <Image source={{ uri: rev.authorPhoto }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: cuisine.color, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ color: '#fff', fontWeight: '800' }}>{rev.author[0]}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: colors.ink }}>{rev.author}</Text>
                  <View style={styles.row}>
                    <Stars rating={rev.rating} size={12} />
                    <Text style={[styles.meta, { fontSize: 12 }]}>{rev.when}</Text>
                  </View>
                </View>
              </View>
              {!!rev.text && <Text style={styles.reviewText}>{rev.text}</Text>}
            </View>
          ))}
          <Pressable
            onPress={() => Linking.openURL(allReviewsUrl).catch(() => {})}
            style={({ pressed }) => [styles.allReviews, pressed && { opacity: 0.6 }]}
            hitSlop={8}
            accessibilityRole="link"
          >
            <Text style={styles.allReviewsText}>
              Read all {r.ratingCount > 0 ? `${r.ratingCount.toLocaleString()} ` : ''}reviews on Google ›
            </Text>
          </Pressable>
          <Text style={styles.attrib}>Reviews & photos from Google</Text>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  // Soft shadow on the left edge, visible while the page is dragged aside.
  edgeShadow: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: -4, height: 0 }, elevation: 8 },
  backWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  backBtn: {
    marginLeft: 12,
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  backText: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  photoCount: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  content: { padding: 18 },
  name: { fontSize: 28, fontWeight: '900', color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  bigRating: { fontSize: 18, fontWeight: '900', color: colors.ink },
  meta: { fontSize: 14, color: colors.muted },
  mapCard: { marginTop: 18, borderRadius: radius.md, overflow: 'hidden', ...shadow },
  section: { fontSize: 20, fontWeight: '900', color: colors.ink, marginTop: 24, marginBottom: 8 },
  hoursCard: { backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 6, paddingHorizontal: 6 },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6, paddingHorizontal: 8, borderRadius: radius.sm },
  hoursToday: { backgroundColor: colors.cream },
  hoursDay: { color: colors.muted, fontSize: 14, width: 96 },
  hoursTime: { color: colors.ink, fontSize: 14, flex: 1, textAlign: 'right' },
  hoursTodayText: { color: colors.ink, fontWeight: '800' },
  review: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, marginBottom: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  reviewText: { marginTop: 8, color: colors.ink, lineHeight: 20 },
  website: { color: colors.red, fontWeight: '700', fontSize: 14 },
  allReviews: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 16, marginTop: 4 },
  allReviewsText: { color: colors.red, fontWeight: '800', fontSize: 15 },
  attrib: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 10 },
});
