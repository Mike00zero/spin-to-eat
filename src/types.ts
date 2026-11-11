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
  name: string;
  address: string;
  location: Coords;
  rating: number; // 0–5
  ratingCount: number;
  priceLevel: number | null; // 1–4 ($–$$$$), null if unknown
  photos: string[]; // image URLs
  reviews: Review[];
  openNow?: boolean;
  mapsUrl?: string;
  distanceKm: number;
};
