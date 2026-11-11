import { Coords, Cuisine, Restaurant, Review, SortMode } from '../types';
import { CUISINES } from '../cuisines';
import { demoRestaurants } from './demo';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? '';
export const isDemoMode = !API_KEY;

const SEARCH_RADIUS_METERS = 8000; // ~5 miles

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.photos',
  'places.reviews',
  'places.googleMapsUri',
  'places.googleMapsLinks.reviewsUri',
  'places.websiteUri',
  'places.currentOpeningHours.openNow',
].join(',');

const PRICE_LEVELS: Record<string, number | null> = {
  PRICE_LEVEL_FREE: 1,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
  PRICE_LEVEL_UNSPECIFIED: null,
};

export function distanceKm(a: Coords, b: Coords): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function photoUrl(photoName: string, width = 800) {
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${width}&key=${API_KEY}`;
}

/** Highest rated first; ties broken by distance (nearest to the user first). */
export function sortByRating(list: Restaurant[]): Restaurant[] {
  return [...list].sort((a, b) => b.rating - a.rating || a.distanceKm - b.distanceKm);
}

/** Sort for the results screen. Ties fall back to rating, then distance. */
export function sortRestaurants(list: Restaurant[], mode: SortMode): Restaurant[] {
  const byRating = (a: Restaurant, b: Restaurant) => b.rating - a.rating || a.distanceKm - b.distanceKm;
  switch (mode) {
    case 'price':
      // Cheapest first; places with no price info go last.
      return [...list].sort(
        (a, b) => (a.priceLevel ?? Infinity) - (b.priceLevel ?? Infinity) || byRating(a, b),
      );
    case 'nearest':
      return [...list].sort((a, b) => a.distanceKm - b.distanceKm || b.rating - a.rating);
    case 'farthest':
      return [...list].sort((a, b) => b.distanceKm - a.distanceKm || b.rating - a.rating);
    default:
      return sortByRating(list);
  }
}

/**
 * Find restaurants of a cuisine near the user using the Google Places API (New)
 * Text Search endpoint. Falls back to demo data when no API key is set.
 */
export async function searchRestaurants(cuisine: Cuisine, near: Coords): Promise<Restaurant[]> {
  if (isDemoMode) {
    await new Promise((r) => setTimeout(r, 600));
    return sortByRating(demoRestaurants(cuisine, near));
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: cuisine.query,
      pageSize: 20,
      locationBias: {
        circle: { center: near, radius: SEARCH_RADIUS_METERS },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Places error ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  const places: any[] = json.places ?? [];

  const restaurants: Restaurant[] = places
    .filter((p) => p.location)
    .map((p) => {
      const location: Coords = { latitude: p.location.latitude, longitude: p.location.longitude };
      const reviews: Review[] = (p.reviews ?? []).map((r: any) => ({
        author: r.authorAttribution?.displayName ?? 'Google user',
        authorPhoto: r.authorAttribution?.photoUri,
        rating: r.rating ?? 0,
        when: r.relativePublishTimeDescription ?? '',
        text: r.text?.text ?? r.originalText?.text ?? '',
      }));
      return {
        id: p.id,
        cuisineId: cuisine.id,
        name: p.displayName?.text ?? 'Unnamed',
        address: p.formattedAddress ?? '',
        location,
        rating: p.rating ?? 0,
        ratingCount: p.userRatingCount ?? 0,
        priceLevel: p.priceLevel ? PRICE_LEVELS[p.priceLevel] ?? null : null,
        photos: (p.photos ?? []).slice(0, 6).map((ph: any) => photoUrl(ph.name)),
        reviews,
        openNow: p.currentOpeningHours?.openNow,
        mapsUrl: p.googleMapsUri,
        reviewsUrl: p.googleMapsLinks?.reviewsUri,
        websiteUrl: p.websiteUri,
        distanceKm: distanceKm(near, location),
      };
    })
    // Keep it local: drop anything far outside the search area.
    .filter((r) => r.distanceKm <= (SEARCH_RADIUS_METERS / 1000) * 2);

  return sortByRating(restaurants);
}

/**
 * Browse mode: run every wheel cuisine's search in parallel and merge them,
 * so each result is tagged with a cuisine the user can filter by. A place
 * found by more than one search keeps the first cuisine (wheel order).
 * Costs one Places request per cuisine (8 total).
 */
export async function searchAllRestaurants(near: Coords): Promise<Restaurant[]> {
  const settled = await Promise.allSettled(CUISINES.map((c) => searchRestaurants(c, near)));
  const ok = settled.filter((s): s is PromiseFulfilledResult<Restaurant[]> => s.status === 'fulfilled');
  if (ok.length === 0) throw (settled[0] as PromiseRejectedResult).reason;

  const seen = new Set<string>();
  const merged: Restaurant[] = [];
  for (const { value } of ok) {
    for (const r of value) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      merged.push(r);
    }
  }
  return sortByRating(merged);
}
