# Stumbl

iOS-focused Expo app that helps you leave for the bus or train on time: pick a stop, a route, walking time, and buffer, then track a single commute via a home screen widget.

Supported agencies: **Grand River Transit** (Waterloo Region), **London Transit**, and **GO Transit** (Greater Golden Horseshoe).

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

### Expo Go (“unknown error” / app won’t open)

`npm start` sets **`EXPO_NO_WIDGETS=1`**. Metro then resolves **`expo-widgets`** to **`stubs/expo-widgets.ts`**, so `requireNativeModule('ExpoWidgets')` never runs (Expo Go does not ship that native module).

- **`npm start`** — use with **Expo Go** (widgets stubbed; screens work).
- **`npm run start:native`** — real `expo-widgets` JS; use only with a **development build** from `npm run ios`, not Expo Go.
- Before **`npx expo prebuild`**, run it in a shell **without** `EXPO_NO_WIDGETS` set (`unset EXPO_NO_WIDGETS` or a fresh terminal) so the **expo-widgets** plugin is included.

Also: keep **Expo Go** updated for **SDK 54**, scan the **current** QR (Metro may use 8082/8083 if 8081 is busy), and try **`npx expo start --tunnel`** if the phone cannot reach your Mac’s LAN IP.

### Expo Go vs development build

**Real home screen widgets need a development build** (`npm run ios` after prebuild), not Expo Go.

The widget UI uses **`@expo/ui`** (`ExpoUI`), which is not loaded in Expo Go. In a **dev build**, if you still see `Cannot find native module ExpoUI`, reinstall native bits and rebuild:

```bash
npx expo prebuild --platform ios --clean
cd ios && pod install && cd ..
npm run ios
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Start Metro with **`EXPO_NO_WIDGETS=1`** (Expo Go–friendly stub) |
| `npm run start:native` | Start Metro with real `expo-widgets` (dev client / not Expo Go) |
| `npm run ios` | Prebuild (if needed) and run the iOS app (`expo run:ios`) |
| `npm run prebuild` | Generate the `ios/` native project (widgets extension included) |

## Configuration

- **`app.config.ts`** — app name, iOS bundle id (`ca.stumbl.app`), `expo-router`; **`expo-widgets` plugin is omitted when `EXPO_NO_WIDGETS=1`** (default `npm start`).
- **`lib/transitAgencies.ts`** — London Transit (LTC), Grand River Transit (GRT), and GO Transit configs, GTFS bundles, and realtime URLs.
- **`lib/config.ts`** — re-exports shared realtime timing flags from `transitAgencies.ts`.
- **`metro.config.js`** — bundles `.txt` GTFS files from `data/gtfs/`.

### GO Transit API key

GO schedules and live arrivals use the [Metrolinx Open Data API](https://opendata.metrolinx.com/). Copy `.env.example` to `.env` and set your subscription key:

```bash
cp .env.example .env
# edit .env — EXPO_PUBLIC_METROLINX_API_KEY=your_key
```

Restart Metro after changing `.env`. Without a key, GO stop search still works from bundled static data, but countdowns fall back to unavailable.

## Architecture (high level)

| Layer | Location |
| --- | --- |
| UI / navigation | `app/` (Expo Router), `components/ui/` |
| Onboarding flow | `app/(onboarding)/` |
| Post-setup home | `app/(onboarding)/summary.tsx` (widget preview + edit slideover) |
| Domain | `services/countdown/countdownService.ts` |
| Static GTFS | `services/gtfs/staticGtfsService.ts` + `data/gtfs/{ltc,grt,go}/*` |
| Realtime GTFS-RT / Metrolinx API | `services/realtime/realtimeGtfsService.ts`, `services/go/goApiService.ts` |
| Widget mapping | `services/widget/widgetViewModel.ts` |
| Persistence | `store/commuteStore.ts` (Zustand + AsyncStorage) |
| iOS widget UI | `features/widget/StumblWidget.tsx` (`expo-widgets` + `@expo/ui` Swift UI) |

Swap **static** feeds by replacing files under `data/gtfs/ltc/`, `data/gtfs/grt/`, or `data/gtfs/go/`. Swap **realtime** in `lib/transitAgencies.ts` (LTC/GRT) or via the Metrolinx API key (GO).

## Supported cities

On first launch, pick **London Transit**, **Grand River Transit (Waterloo Region)**, or **GO Transit** on the welcome screen. That choice drives stop search, routes, schedules, and live arrivals for the saved commute.

| Agency | Static GTFS | Realtime |
| --- | --- | --- |
| London Transit (LTC) | `data/gtfs/ltc/` | `http://gtfs.ltconline.ca/TripUpdate/TripUpdates.pb` |
| Grand River Transit (GRT) | `data/gtfs/grt/` | GRT bus + ION HTTPS feeds (merged) |
| GO Transit | `data/gtfs/go/` (rail stops/routes only) | Metrolinx GTFS-RT TripUpdates + `Stop/NextService` fallback |

## Realtime endpoints

Grand River Transit publishes separate bus and ION (LRT) GTFS-RT protobuf feeds over HTTPS. The app merges both trip-update feeds:

- Bus trip updates: `https://webapps.regionofwaterloo.ca/api/grt-routes/api/tripupdates/1`
- ION trip updates: `https://webapps.regionofwaterloo.ca/api/grt-routes/api/tripupdates/2`
- Bus alerts: `https://webapps.regionofwaterloo.ca/api/grt-routes/api/servicealerts/1`
- ION alerts: `https://webapps.regionofwaterloo.ca/api/grt-routes/api/servicealerts/2`
- Bus vehicle positions: `https://webapps.regionofwaterloo.ca/api/grt-routes/api/vehiclepositions/1`
- ION vehicle positions: `https://webapps.regionofwaterloo.ca/api/grt-routes/api/vehiclepositions/2`

Set `USE_MOCK_REALTIME` to `false` in `lib/config.ts` to use the live trip-updates feeds (requires network). If the feed fails or is stale, countdown falls back to **scheduled** times from static GTFS.

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

## Static GTFS note

Bundled feeds live in `data/gtfs/ltc/` (London), `data/gtfs/grt/` (Waterloo Region), and `data/gtfs/go/` (GO rail corridors). Refresh them from each agency’s open-data page when schedules change. GRT and GO use `calendar_dates` only; LTC uses `calendar.txt` plus `calendar_dates` exceptions. GO’s bundle omits full `stop_times.txt` (schedules come from the Metrolinx API).

Extra files in `data/` (`GRT_Stops.csv`, `ION_Stops.csv`, sample `TripUpdates.pb`) are reference downloads and are **not** read by the app.

## Widget preview in the app

`WidgetPreviewCard` mirrors widget copy. The real widget is updated from `useCommuteCountdownRefresh` in `app/_layout.tsx` (30s interval).

## License

Private / your terms.
