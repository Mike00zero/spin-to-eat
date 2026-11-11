import React, { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';
import { DetailsScreen } from './src/screens/DetailsScreen';
import { useLocation } from './src/hooks/useLocation';
import { Cuisine, Restaurant, SortMode } from './src/types';
import { cuisineById } from './src/cuisines';
import { colors } from './src/theme';

// Three screens, so a tiny state machine is all the navigation we need.
// cuisine === null means "browse everything" (the user skipped the spin).
type Route =
  | { name: 'home' }
  | { name: 'results'; cuisine: Cuisine | null }
  | { name: 'details'; cuisine: Cuisine | null; restaurant: Restaurant };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [cache, setCache] = useState<Restaurant[] | null>(null);
  // Lives here so the chosen sort survives a trip to the details screen.
  const [sort, setSort] = useState<SortMode>('rating');
  // Cuisine filter for browse mode; null = all.
  const [filter, setFilter] = useState<string | null>(null);
  const { coords, usingFallback } = useLocation();

  const goBack = () => {
    if (route.name === 'details') setRoute({ name: 'results', cuisine: route.cuisine });
    else if (route.name === 'results') setRoute({ name: 'home' });
  };

  // Android hardware back button
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (route.name === 'home') return false;
      goBack();
      return true;
    });
    return () => sub.remove();
  });

  let screen: React.ReactNode;
  if (route.name === 'home') {
    screen = (
      <HomeScreen
        onFindPlaces={(cuisine) => {
          setCache(null);
          setSort('rating');
          setFilter(null);
          setRoute({ name: 'results', cuisine });
        }}
      />
    );
  } else if (!coords) {
    screen = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }}>
        <ActivityIndicator size="large" color={colors.orange} />
      </View>
    );
  } else if (route.name === 'results') {
    screen = (
      <ResultsScreen
        cuisine={route.cuisine}
        coords={coords}
        usingFallbackLocation={usingFallback}
        cache={cache}
        setCache={setCache}
        sort={sort}
        setSort={setSort}
        filter={filter}
        setFilter={setFilter}
        onBack={goBack}
        onOpen={(restaurant) => setRoute({ name: 'details', cuisine: route.cuisine, restaurant })}
      />
    );
  } else {
    screen = <DetailsScreen restaurant={route.restaurant} cuisine={cuisineById(route.restaurant.cuisineId)} onBack={goBack} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {screen}
    </SafeAreaProvider>
  );
}
