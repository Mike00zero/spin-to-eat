import React, { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';
import { DetailsScreen } from './src/screens/DetailsScreen';
import { useLocation } from './src/hooks/useLocation';
import { Cuisine, Restaurant } from './src/types';
import { colors } from './src/theme';

// Three screens, so a tiny state machine is all the navigation we need.
type Route =
  | { name: 'home' }
  | { name: 'results'; cuisine: Cuisine }
  | { name: 'details'; cuisine: Cuisine; restaurant: Restaurant };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [cache, setCache] = useState<Restaurant[] | null>(null);
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
        onBack={goBack}
        onOpen={(restaurant) => setRoute({ name: 'details', cuisine: route.cuisine, restaurant })}
      />
    );
  } else {
    screen = <DetailsScreen restaurant={route.restaurant} cuisine={route.cuisine} onBack={goBack} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {screen}
    </SafeAreaProvider>
  );
}
