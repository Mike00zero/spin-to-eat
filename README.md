# Spin to Eat

Can't decide where to eat? Spin the wheel, get a food type, and see the best-rated
restaurants of that type near you — with Google ratings, reviews, photos, price
level, and a map.

Built with **Expo + React Native (TypeScript)**, so one codebase runs on iPhone and Android.

## Run it on your phone (about 5 minutes)

1. Install [Node.js](https://nodejs.org) (LTS version).
2. Install the **Expo Go** app on your phone (App Store / Google Play).
3. In a terminal, inside this folder:

   ```bash
   npm install
   npx expo install --fix        # aligns package versions with your Expo SDK
   npx expo start
   ```

4. Scan the QR code with your phone's camera (iPhone) or the Expo Go app (Android).

> If Expo Go says the project's SDK is too old, run
> `npx expo install expo@latest && npx expo install --fix` and start again.

The app runs immediately with **demo restaurants** (fake names, placeholder images).
To show real places, add a Google key (next section).

## Turn on real restaurants (Google Places)

1. Go to [Google Cloud Console](https://console.cloud.google.com/), create a project,
   and enable billing (Google gives a monthly free credit).
2. Enable **Places API (New)**. For Android maps in a standalone build, also enable
   **Maps SDK for Android**.
3. Create an API key under *APIs & Services → Credentials*.
4. Copy `.env.example` to `.env` and paste the key:

   ```
   EXPO_PUBLIC_GOOGLE_PLACES_KEY=your-key-here
   ```

5. Restart `npx expo start`.

> **Before launching publicly:** a key inside a mobile app can be extracted. Restrict
> it to your app's bundle ID / package name in Google Cloud, or move the Places call
> behind a small server (e.g. a serverless function) that holds the key.

## How it works

| Piece | File |
|---|---|
| Wheel (spin animation, picks the food type) | `src/components/SpinWheel.tsx` |
| Food types on the wheel + search terms | `src/cuisines.ts` |
| Google Places search, sorted highest rating first | `src/api/places.ts` |
| Demo data used when there's no key | `src/api/demo.ts` |
| Screens: spin → results (list/map) → restaurant details | `src/screens/` |
| Colors | `src/theme.ts` |

**Changing the wheel:** the artwork is `assets/wheel.png`. The 8 entries in
`src/cuisines.ts` must stay in the same clockwise order as the wedges, starting
at 12 o'clock (Steak, Comfort Food, Chicken, Mexican, Chinese, Sushi, Burgers, Pizza).
To rename a wedge or change what gets searched (e.g. make the bowl "Bar Food"),
edit its `label` and `query`.

**Search area:** about 5 miles around the user (`SEARCH_RADIUS_METERS` in `places.ts`).
If location permission is denied, the app falls back to Times Square, NYC
(`FALLBACK_COORDS` in `src/hooks/useLocation.ts`).

## Publishing to the App Store / Google Play

Use [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npm install -g eas-cli
eas build --platform all
```

Before that, change `bundleIdentifier` / `package` in `app.json` from
`com.example.spintoeat` to your own, and set `android.config.googleMaps.apiKey`.
