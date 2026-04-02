# Stumbl

iOS-focused Expo app that helps you leave for the bus on time: pick a London Transit Commission (LTC) stop, a route, walking time, and buffer, then track a single commute via a home screen widget.

## Requirements

- Node 20+
- Xcode (for device/simulator builds with widgets)
- **Widgets do not run in Expo Go.** Use a [development build](https://docs.expo.dev/develop/development-builds/introduction/) (`expo run:ios` after prebuild).

## Install

```bash
npm install
```

This repo pins `expo-widgets@55.0.8` and uses `.npmrc` with `legacy-peer-deps=true` so it resolves cleanly on **Expo SDK 54**. When you upgrade to SDK 55+, you can align `expo-widgets` with the SDK and remove `legacy-peer-deps` if you prefer.

### Metro / “Web Bundling failed” / `react-native-web`

Expo’s Metro dev server can still answer **`platform=web`** requests (e.g. opening the dev server URL in a browser). That path needs **`react-native-web`** and **`react-dom`**, which are included here via `npx expo install react-native-web react-dom`.

`app.config.ts` sets **`platforms: ['ios']`** so the CLI does not treat web as a primary target (no “Web is waiting…” line, `w` is disabled). If you remove those packages, web resolution errors can come back.

### Expo Go vs development build

**Stumbl uses `expo-widgets`, which does not run in Expo Go.** After `npx expo prebuild` / `npm run ios`, use a **development build** (`npm run ios` or press `s` in the terminal to switch away from Expo Go).

The home screen widget UI uses **`@expo/ui`** (native module **`ExpoUI`**). That module is **not** in Expo Go. The JS entry no longer imports it on startup in Go, so onboarding and the in-app UI should load. In a **dev build**, if you still see `Cannot find native module ExpoUI`, reinstall native bits and rebuild:

```bash
npx expo prebuild --platform ios --clean
cd ios && pod install && cd ..
npm run ios
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Start Metro / Expo dev server |
| `npm run ios` | Prebuild (if needed) and run the iOS app (`expo run:ios`) |
| `npm run prebuild` | Generate the `ios/` native project (widgets extension included) |

## Configuration

- **`app.config.ts`** — app name, iOS bundle id (`ca.stumbl.app`), `expo-router`, `expo-widgets` plugin (`StumblWidget`, app group `group.ca.stumbl.app`).
- **`lib/config.ts`** — `USE_MOCK_REALTIME` (default `true` for offline dev), GTFS-RT URLs, timeouts, staleness window.
- **`metro.config.js`** — bundles `.txt` GTFS files from `data/google_transit/`.

## Architecture (high level)

| Layer | Location |
| --- | --- |
| UI / navigation | `app/` (Expo Router), `components/ui/` |
| Onboarding flow | `app/(onboarding)/` |
| Post-setup home | `app/(main)/` |
| Domain | `services/countdown/countdownService.ts` |
| Static GTFS | `services/gtfs/staticGtfsService.ts` + `data/google_transit/*.txt` |
| Realtime GTFS-RT JSON | `services/realtime/realtimeGtfsService.ts` |
| Widget mapping | `services/widget/widgetViewModel.ts` |
| Persistence | `store/commuteStore.ts` (Zustand + AsyncStorage) |
| iOS widget UI | `features/widget/StumblWidget.tsx` (`expo-widgets` + `@expo/ui` Swift UI) |

Swap **static** feeds by replacing files under `data/google_transit/` (keep headers). Swap **realtime** by changing URLs or implementing a new fetcher behind `RealtimeGtfsService`.

## Realtime endpoints (LTC)

- Trip updates: `https://gtfs.ltconline.ca/TripUpdate/TripUpdates.json`
- Alerts: `https://gtfs.ltconline.ca/Alert/Alerts.json`
- Vehicle positions: `https://gtfs.ltconline.ca/Vehicle/VehiclePositions.json`

Set `USE_MOCK_REALTIME` to `false` in `lib/config.ts` to use the live trip-updates feed (requires network). If the feed fails or is stale, countdown falls back to **scheduled** times from static GTFS.

## Google Maps

`services/maps/googleMaps.ts` builds a coordinate search URL for the saved stop. The app uses `Linking.openURL` from the home screen and wires `addUserInteractionListener` so **interactive widget controls** (if you add them later) can open the same URL. The stock `expo-widgets` template does not attach a global `widgetURL` for whole-widget taps; v1 focuses on in-app Maps and documented widget gallery setup.

## Dependencies (why they are here)

| Package | Role |
| --- | --- |
| `expo` / `react-native` | Core runtime |
| `expo-router` | File-based navigation |
| `expo-widgets` | iOS widget extension + `updateSnapshot` / timeline API |
| `@expo/ui` | SwiftUI primitives for the widget target |
| `expo-file-system` + `expo-asset` | Read bundled GTFS `.txt` at runtime |
| `@react-native-async-storage/async-storage` | Persist one saved commute |
| `expo-linking` | Open Google Maps URLs |
| `zustand` | Lightweight store with persist middleware |
| `nativewind` | Tailwind for global styling hook (screens mostly use `StyleSheet` + tokens) |
| `react-native-reanimated` / `react-native-worklets` | Required by current Expo / NativeWind toolchain |

## Mock GTFS note

The committed `data/google_transit/` set is a **small sample** so the app runs immediately. Replace it with the full LTC Google Transit export (same filenames) for production search and schedules.

## Widget preview in the app

`WidgetPreviewCard` mirrors widget copy. The real widget is updated from `useCommuteCountdownRefresh` in `app/_layout.tsx` (30s interval).

## License

Private / your terms.
