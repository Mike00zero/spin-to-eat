import { Cuisine } from './types';

/**
 * The 8 wedges of the wheel, listed CLOCKWISE starting at 12 o'clock.
 * The order must match assets/wheel.png — wedge 0 is the steak just
 * right of the top center line, wedge 7 is the pizza just left of it.
 *
 * `query` is what we send to Google Places, so you can tune results here.
 */
export const CUISINES: Cuisine[] = [
  { id: 'steak', label: 'Steak', emoji: '🥩', query: 'steakhouse', color: '#F26B1D' },
  { id: 'comfort', label: 'Comfort Food', emoji: '🍟', query: 'comfort food restaurant', color: '#2F3F5C' },
  { id: 'chicken', label: 'Chicken', emoji: '🍗', query: 'fried chicken restaurant', color: '#F9C230' },
  { id: 'mexican', label: 'Mexican', emoji: '🌮', query: 'mexican restaurant tacos', color: '#5E9E3A' },
  { id: 'chinese', label: 'Chinese', emoji: '🥡', query: 'chinese restaurant', color: '#E8431E' },
  { id: 'sushi', label: 'Sushi', emoji: '🍣', query: 'sushi restaurant', color: '#2F3F5C' },
  { id: 'burgers', label: 'Burgers', emoji: '🍔', query: 'burger restaurant', color: '#E8431E' },
  { id: 'pizza', label: 'Pizza', emoji: '🍕', query: 'pizza restaurant', color: '#F9C230' },
];

export const SEGMENT_DEGREES = 360 / CUISINES.length;
