#!/usr/bin/env node
/**
 * Prototype: compare Google Maps Routes API transit departures against the LTC
 * GTFS-realtime feed for one stop, side by side.
 *
 * Usage:
 *   node --env-file=.env scripts/compare-google-ltc.mjs [--minutes 90]
 *
 * Defaults to Wharncliffe at Moir NB (#2043) -> Natural Science (#1222) on
 * routes 02 / 102. Override with --stop, --lat, --lon, --dest-lat, --dest-lon,
 * --routes.
 *
 * Google has no "departures at a stop" endpoint, so this asks computeRoutes for
 * transit trips from the stop to a downstream stop, then keeps stepping the
 * departure time forward to collect successive buses. Each call is billed.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { transit_realtime: rt } = require('gtfs-realtime-bindings');

const LTC_FEED = 'http://gtfs.ltconline.ca/TripUpdate/TripUpdates.pb';
const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const TZ = 'America/Toronto';
const MAX_GOOGLE_CALLS = 12;

function parseArgs(argv) {
  const opts = {
    stop: 'WHARMOIR',
    lat: 42.986267,
    lon: -81.262822,
    destLat: 43.010172,
    destLon: -81.273174,
    routes: ['02', '102'],
    minutes: 90,
  };
  for (let i = 0; i < argv.length; i += 2) {
    const [k, v] = [argv[i], argv[i + 1]];
    if (k === '--stop') opts.stop = v;
    else if (k === '--lat') opts.lat = Number(v);
    else if (k === '--lon') opts.lon = Number(v);
    else if (k === '--dest-lat') opts.destLat = Number(v);
    else if (k === '--dest-lon') opts.destLon = Number(v);
    else if (k === '--routes') opts.routes = v.split(',');
    else if (k === '--minutes') opts.minutes = Number(v);
    else throw new Error(`Unknown arg ${k}`);
  }
  return opts;
}

const fmt = (ms) =>
  new Date(ms).toLocaleTimeString('en-CA', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });

/** Normalize "2", "02", "2A" etc. to the LTC route_id form ("02"). */
function normRoute(name) {
  const digits = String(name ?? '').match(/\d+/)?.[0];
  return digits ? digits.padStart(2, '0') : String(name ?? '');
}

function metersBetween(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function fetchLtc(opts, nowMs, horizonMs) {
  const res = await fetch(LTC_FEED);
  if (!res.ok) throw new Error(`LTC feed HTTP ${res.status}`);
  const feed = rt.FeedMessage.decode(new Uint8Array(await res.arrayBuffer()));
  const out = [];
  for (const e of feed.entity) {
    const tu = e.tripUpdate;
    if (!tu || !opts.routes.includes(tu.trip.routeId)) continue;
    for (const stu of tu.stopTimeUpdate) {
      if (stu.stopId !== opts.stop) continue;
      const t = Number(stu.arrival?.time || stu.departure?.time) * 1000;
      if (t <= nowMs || t > horizonMs) continue;
      const delay = stu.arrival?.delay ?? stu.departure?.delay ?? 0;
      out.push({ route: tu.trip.routeId, ms: t, delaySec: delay });
    }
  }
  return {
    feedAgeSec: Math.round(nowMs / 1000 - Number(feed.header.timestamp)),
    departures: out.sort((a, b) => a.ms - b.ms),
  };
}

async function googleCall(opts, key, departMs) {
  const latLng = (latitude, longitude) => ({ location: { latLng: { latitude, longitude } } });
  const res = await fetch(ROUTES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Ios-Bundle-Identifier': 'ca.stumbl.app',
      'X-Goog-FieldMask': 'routes.legs.steps.travelMode,routes.legs.steps.transitDetails',
    },
    body: JSON.stringify({
      origin: latLng(opts.lat, opts.lon),
      destination: latLng(opts.destLat, opts.destLon),
      travelMode: 'TRANSIT',
      departureTime: new Date(departMs).toISOString(),
      computeAlternativeRoutes: true,
      transitPreferences: { allowedTravelModes: ['BUS'] },
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Routes API ${res.status}: ${JSON.stringify(body.error ?? body)}`);

  const found = [];
  for (const route of body.routes ?? []) {
    for (const leg of route.legs ?? []) {
      for (const step of leg.steps ?? []) {
        const td = step.transitDetails;
        if (step.travelMode !== 'TRANSIT' || !td) continue;
        const stop = td.stopDetails?.departureStop;
        const loc = stop?.location?.latLng;
        const near =
          loc &&
          metersBetween(
            { lat: opts.lat, lon: opts.lon },
            { lat: loc.latitude, lon: loc.longitude }
          ) < 75;
        if (!near) continue;
        const route = normRoute(td.transitLine?.nameShort ?? td.transitLine?.name);
        if (!opts.routes.includes(route)) continue;
        found.push({
          route,
          ms: Date.parse(td.stopDetails.departureTime),
          headsign: td.headsign ?? '',
          stopName: stop.name ?? '',
        });
        break; // first transit step only
      }
    }
  }
  return found;
}

async function fetchGoogle(opts, key, nowMs, horizonMs) {
  const seen = new Map();
  let cursor = nowMs;
  let calls = 0;
  while (cursor < horizonMs && calls < MAX_GOOGLE_CALLS) {
    calls++;
    const found = await googleCall(opts, key, cursor);
    const fresh = found.filter((d) => d.ms >= cursor && d.ms <= horizonMs);
    for (const d of fresh) seen.set(`${d.route}@${d.ms}`, d);
    if (fresh.length === 0) break;
    cursor = Math.min(...fresh.map((d) => d.ms)) + 60_000;
  }
  return { calls, departures: [...seen.values()].sort((a, b) => a.ms - b.ms) };
}

/** Pair each Google departure with the closest unused LTC departure on the same route (within 20 min). */
function pair(google, ltc) {
  const used = new Set();
  const rows = google.map((g) => {
    let best = null;
    ltc.forEach((l, i) => {
      if (used.has(i) || l.route !== g.route) return;
      const diff = Math.abs(l.ms - g.ms);
      if (diff <= 20 * 60_000 && (!best || diff < best.diff)) best = { i, diff };
    });
    if (best) used.add(best.i);
    return { g, l: best ? ltc[best.i] : null };
  });
  ltc.forEach((l, i) => {
    if (!used.has(i)) rows.push({ g: null, l });
  });
  return rows.sort((a, b) => (a.g ?? a.l).ms - (b.g ?? b.l).ms);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    console.error(
      'Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY (Routes API enabled) to run this comparison.'
    );
    process.exit(1);
  }
  const nowMs = Date.now();
  const horizonMs = nowMs + opts.minutes * 60_000;

  const [ltc, google] = await Promise.all([
    fetchLtc(opts, nowMs, horizonMs),
    fetchGoogle(opts, key, nowMs, horizonMs),
  ]);

  console.log(`Stop ${opts.stop}, routes ${opts.routes.join('/')}, now ${fmt(nowMs)}`);
  console.log(`LTC feed age ${ltc.feedAgeSec}s · Google calls ${google.calls}`);
  if (google.departures[0]) console.log(`Google stop: ${google.departures[0].stopName}`);
  console.log('');
  console.log('Route  Google            LTC feed                 Diff');
  for (const { g, l } of pair(google.departures, ltc.departures)) {
    const route = (g ?? l).route.padEnd(5);
    const gCol = g ? `${fmt(g.ms)} ${g.headsign.slice(0, 8)}`.padEnd(17) : '—'.padEnd(17);
    const lCol = l
      ? `${fmt(l.ms)} (${l.delaySec >= 0 ? '+' : ''}${Math.round(l.delaySec / 60)}m vs sched)`.padEnd(
          24
        )
      : '—'.padEnd(24);
    const diff = g && l ? `${Math.round((g.ms - l.ms) / 60_000)} min` : 'only one source';
    console.log(`${route}  ${gCol} ${lCol} ${diff}`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
