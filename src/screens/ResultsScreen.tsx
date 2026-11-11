import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Callout, Marker } from 'react-native-maps';
import { isDemoMode, searchRestaurants } from '../api/places';
import { RestaurantCard } from '../components/RestaurantCard';
import { Button, formatDistance, Price } from '../components/ui';
import { Coords, Cuisine, Restaurant } from '../types';
import { colors, radius } from '../theme';

type Props = {
  cuisine: Cuisine;
  coords: Coords;
  usingFallbackLocation: boolean;
  onBack: () => void;
  onOpen: (r: Restaurant) => void;
  // Keeps results when returning from the details screen.
  cache: Restaurant[] | null;
  setCache: (r: Restaurant[]) => void;
};

export function ResultsScreen({ cuisine, coords, usingFallbackLocation, onBack, onOpen, cache, setCache }: Props) {
  const [tab, setTab] = useState<'list' | 'map'>('list');
  const [items, setItems] = useState<Restaurant[] | null>(cache);
  const [error, setError] = useState<string | null>(null);
  const map = useRef<MapView>(null);

  const load = useCallback(async () => {
    setError(null);
    setItems(null);
    try {
      const list = await searchRestaurants(cuisine, coords);
      setItems(list);
      setCache(list);
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong.');
    }
  }, [cuisine, coords, setCache]);

  useEffect(() => {
    if (!cache) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fitMap = () => {
    if (!items?.length) return;
    map.current?.fitToCoordinates([coords, ...items.map((r) => r.location)], {
      edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
      animated: false,
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.back}>
          <Text style={styles.backText}>‹ Spin</Text>
        </Pressable>
        <Text style={styles.title}>
          {cuisine.emoji} {cuisine.label} near you
        </Text>
        <Text style={styles.sub}>
          Sorted by Google rating, highest first
          {usingFallbackLocation ? ' · location off, showing NYC' : ''}
        </Text>
        <View style={styles.tabs}>
          {(['list', 'map'] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'list' ? 'List' : 'Map'}</Text>
            </Pressable>
          ))}
        </View>
        {isDemoMode && <Text style={styles.demo}>Demo data · add a Google API key to see real restaurants</Text>}
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Button title="Try again" onPress={load} />
        </View>
      ) : !items ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.orange} />
          <Text style={styles.sub}>Finding the best {cuisine.label.toLowerCase()}…</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.title}>No {cuisine.label.toLowerCase()} spots nearby</Text>
          <Button title="Spin again" onPress={onBack} />
        </View>
      ) : tab === 'list' ? (
        <FlatList
          data={items}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          renderItem={({ item, index }) => (
            <RestaurantCard restaurant={item} rank={index + 1} cuisine={cuisine} onPress={() => onOpen(item)} />
          )}
          ListFooterComponent={<Text style={styles.attrib}>Ratings, reviews & photos from Google</Text>}
        />
      ) : (
        <MapView
          ref={map}
          style={{ flex: 1 }}
          showsUserLocation
          onMapReady={fitMap}
          initialRegion={{ ...coords, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
        >
          {items.map((r, i) => (
            <Marker key={r.id} coordinate={r.location} pinColor={i === 0 ? colors.red : colors.orange}>
              <Callout onPress={() => onOpen(r)}>
                <View style={{ maxWidth: 220, padding: 4 }}>
                  <Text style={{ fontWeight: '800' }}>
                    #{i + 1} {r.name}
                  </Text>
                  <Text style={{ color: colors.muted }}>
                    ★ {r.rating.toFixed(1)} · {formatDistance(r.distanceKm)}
                  </Text>
                  <Price level={r.priceLevel} />
                  <Text style={{ color: colors.orange, fontWeight: '700', marginTop: 4 }}>View details ›</Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  back: { paddingVertical: 6, alignSelf: 'flex-start' },
  backText: { fontSize: 17, color: colors.orange, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '900', color: colors.ink, textAlign: 'left' },
  sub: { fontSize: 14, color: colors.muted, marginTop: 2 },
  demo: { fontSize: 12, color: colors.navy, marginTop: 8, fontWeight: '600' },
  tabs: { flexDirection: 'row', backgroundColor: '#F3E6D0', borderRadius: radius.pill, padding: 4, marginTop: 12 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: radius.pill, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontWeight: '700', color: colors.muted },
  tabTextActive: { color: colors.ink },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  error: { color: colors.red, textAlign: 'center' },
  attrib: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 6 },
});
