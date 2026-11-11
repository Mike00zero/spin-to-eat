export type Cuisine = {
  id: string;
  label: string;
  emoji: string;
  query: string;
  color: string;
};

export type Coords = { latitude: number; longitude: number };

export type Review = {
  author: string;
  authorPhoto?: string;
  rating: number;
  when: string;
  text: string;
};

export type Restaurant = {
  id: string;
  cuisineId: string; // which wheel cuisine search found it
  name: string;
  address: string;
  location: Coords;
  rating: number; // 0–5
  ratingCount: number;
  priceLevel: number | null; // 1–4 ($–$$$$), null if unknown
  photos: string[]; // image URLs
  reviews: Review[];
  openNow?: boolean;
  hours?: string[]; // 7 lines, Monday first, e.g. "Monday: 11:00 AM – 10:00 PM"
  mapsUrl?: string;
  websiteUrl?: string;
  reviewsUrl?: string; // Google Maps page listing all reviews
  distanceKm: number;
};

export type SortMode = 'rating' | 'price' | 'nearest' | 'farthest';
