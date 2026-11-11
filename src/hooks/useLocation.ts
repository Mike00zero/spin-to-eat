import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { Coords } from '../types';

// Used when the user declines location access (Times Square, NYC).
export const FALLBACK_COORDS: Coords = { latitude: 40.758, longitude: -73.9855 };

export function useLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let haveFix = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') throw new Error('denied');
        const last = await Location.getLastKnownPositionAsync();
        if (last && !cancelled) {
          haveFix = true;
          setCoords({ latitude: last.coords.latitude, longitude: last.coords.longitude });
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch {
        if (!cancelled && !haveFix) {
          setCoords(FALLBACK_COORDS);
          setUsingFallback(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { coords, usingFallback };
}
