import { Coords, Cuisine, Restaurant } from '../types';

// Fake restaurants so the app works before a Google API key is added.
// Everything here is clearly placeholder data.

const NAME_PARTS: Record<string, string[]> = {
  steak: ['Prime Cut', 'The Ember Room', 'Ironwood Grill', 'Sizzle & Sear', 'Butcher Block', 'Rancher’s Table'],
  comfort: ['Mama’s Kitchen', 'The Cozy Plate', 'Golden Fry House', 'Main Street Diner', 'Tater & Co.', 'Sunday Supper'],
  chicken: ['Cluck Yeah', 'Crispy Coop', 'The Wing Spot', 'Golden Drumstick', 'Hen House', 'Fry Bird'],
  mexican: ['Taco Fiesta', 'La Cocina Verde', 'El Sol Taqueria', 'Casa Lupita', 'Salsa Shack', 'Tres Amigos'],
  chinese: ['Golden Dragon', 'Lucky Wok', 'Jade Garden', 'Panda Palace', 'Red Lantern', 'Bamboo House'],
  sushi: ['Sakura Sushi', 'Koi Roll Bar', 'Umami House', 'Wasabi Lane', 'Blue Fin', 'Tokyo Table'],
  burgers: ['Smash Bros. Burgers', 'Patty Wagon', 'The Stack', 'Grill Masters', 'Bun & Done', 'Big Bite'],
  pizza: ['Slice of Heaven', 'Brick Oven Co.', 'Pie Hole', 'Napoli Express', 'Crust & Crumb', 'Tony’s Pizzeria'],
};

const STREETS = ['Main St', 'Oak Ave', 'Elm St', 'Maple Dr', 'Park Blvd', 'Market St', 'River Rd', '2nd Ave'];

const REVIEW_SNIPPETS = [
  'Absolutely loved it. Friendly staff and the food came out fast.',
  'Solid spot. Portions were generous and prices were fair.',
  'A bit of a wait on the weekend but worth it.',
  'One of the best in town. We keep coming back!',
  'Good food, cozy vibe. Parking can be tricky.',
  'Decent, though my order was a little cold. Would try again.',
];
const AUTHORS = ['Jordan P.', 'Alex R.', 'Sam K.', 'Taylor M.', 'Chris L.', 'Morgan D.'];
const WHEN = ['a week ago', '2 weeks ago', 'a month ago', '3 months ago', 'yesterday'];

// Small seeded RNG so the same cuisine shows the same demo list.
function rng(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

export function demoRestaurants(cuisine: Cuisine, near: Coords): Restaurant[] {
  const rand = rng(cuisine.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0));
  const names = NAME_PARTS[cuisine.id] ?? NAME_PARTS.pizza;

  return names.map((name, i) => {
    const latitude = near.latitude + (rand() - 0.5) * 0.06;
    const longitude = near.longitude + (rand() - 0.5) * 0.06;
    const rating = Math.round((3.5 + rand() * 1.5) * 10) / 10;
    const dLat = (latitude - near.latitude) * 111;
    const dLon = (longitude - near.longitude) * 111 * Math.cos((near.latitude * Math.PI) / 180);
    return {
      id: `demo-${cuisine.id}-${i}`,
      cuisineId: cuisine.id,
      name,
      address: `${100 + Math.floor(rand() * 900)} ${STREETS[i % STREETS.length]}`,
      location: { latitude, longitude },
      rating,
      ratingCount: 40 + Math.floor(rand() * 1800),
      priceLevel: 1 + Math.floor(rand() * 4),
      photos: [], // the UI shows a styled placeholder when there are no photos
      reviews: [0, 1, 2].map((k) => ({
        author: AUTHORS[(i + k) % AUTHORS.length],
        rating: Math.min(5, Math.max(2, Math.round(rating + (rand() - 0.5) * 2))),
        when: WHEN[(i + k) % WHEN.length],
        text: REVIEW_SNIPPETS[(i * 2 + k) % REVIEW_SNIPPETS.length],
      })),
      openNow: rand() > 0.25,
      distanceKm: Math.sqrt(dLat * dLat + dLon * dLon),
    };
  });
}
