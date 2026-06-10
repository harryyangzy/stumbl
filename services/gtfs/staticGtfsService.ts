import { Asset } from 'expo-asset';
import { readAsStringAsync } from 'expo-file-system/legacy';

import { parseGtfsTable } from '@/lib/csv';
import type { GtfsRoute, GtfsStop, GtfsStopTime, GtfsTrip } from '@/types/gtfs';

import routesTxt from '../../data/google_transit/routes.txt';
import stopTimesTxt from '../../data/google_transit/stop_times.txt';
import stopsTxt from '../../data/google_transit/stops.txt';
import tripsTxt from '../../data/google_transit/trips.txt';

async function loadBundledText(mod: number): Promise<string> {
  const asset = Asset.fromModule(mod);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  return readAsStringAsync(uri);
}

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

/** Lowercase words (letters/digits only) for fuzzy name matching. */
function normalizeMatchWords(s: string): string {
  const parts =
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .match(/[a-z0-9]+/g) ?? [];
  return parts.join(' ');
}

/** All alnum from name/query, no spaces — "Main St" → "mainst". */
function alnumCompressed(s: string): string {
  return normalizeMatchWords(s).replace(/\s/g, '');
}

/** True if every character of `needle` appears in order in `haystack`. */
function subsequenceMatch(haystack: string, needle: string): boolean {
  if (!needle) return true;
  let i = 0;
  for (let j = 0; j < haystack.length && i < needle.length; j++) {
    if (haystack[j] === needle[i]) i++;
  }
  return i === needle.length;
}

/** Query normalized once per search; stop fields precomputed at GTFS load. */
function scoreStopMatchPrecomputed(
  qTrim: string,
  qWords: string,
  qComp: string,
  code: string | null,
  nameWords: string,
  nameComp: string
): number {
  if (!qTrim || !qComp) return 0;

  const codeLc = (code ?? '').toLowerCase().trim();

  if (codeLc && codeLc === qTrim.replace(/\s/g, '')) return 1000;
  if (codeLc && codeLc.includes(qTrim)) return 880;

  if (nameWords === qWords) return 960;
  if (nameComp === qComp) return 950;

  if (nameWords.includes(qWords)) return 520 + (nameWords.startsWith(qWords) ? 60 : 0);
  if (nameComp.includes(qComp)) return 500 + (nameComp.startsWith(qComp) ? 50 : 0);

  const tokens = qWords.split(' ').filter(Boolean);
  if (tokens.length > 1 && tokens.every((t) => nameWords.includes(t))) return 430;

  if (qComp.length >= 2 && subsequenceMatch(nameComp, qComp)) return 380;
  if (qComp.length === 1 && nameComp.includes(qComp)) return 320;

  return 0;
}

/** Service IDs active on a calendar day (weekday / Sat / Sun — extend with calendar_dates later). */
export function serviceIdsForLocalDate(d: Date): string[] {
  const day = d.getDay();
  if (day === 0) return ['SUN'];
  if (day === 6) return ['SAT'];
  return ['WEEKDAY'];
}

export function gtfsClockToDate(serviceDayStart: Date, clock: string): Date {
  const [hs, ms, ss] = clock.split(':');
  let h = parseInt(hs, 10);
  const m = parseInt(ms, 10);
  const s = parseInt(ss, 10);
  let addDays = 0;
  while (h >= 24) {
    h -= 24;
    addDays += 1;
  }
  const out = new Date(serviceDayStart);
  out.setDate(out.getDate() + addDays);
  out.setHours(h, m, s, 0);
  return out;
}

type StopSearchRow = { stop: GtfsStop; nameWords: string; nameComp: string };

export class StaticGtfsService {
  private stops: GtfsStop[] = [];
  /** Precomputed at load — avoids NFD/regex on every stop on every keystroke (~2k stops). */
  private stopSearchRows: StopSearchRow[] = [];
  private routes = new Map<string, GtfsRoute>();
  private trips = new Map<string, GtfsTrip>();
  private tripsByRoute = new Map<string, GtfsTrip[]>();
  private stopTimesByTrip = new Map<string, GtfsStopTime[]>();
  private stopTimesAtStop = new Map<string, GtfsStopTime[]>();

  async load(): Promise<void> {
    const [stopsRaw, routesRaw, tripsRaw, stopTimesRaw] = await Promise.all([
      loadBundledText(stopsTxt),
      loadBundledText(routesTxt),
      loadBundledText(tripsTxt),
      loadBundledText(stopTimesTxt),
    ]);

    this.stops = parseGtfsTable(stopsRaw).map((r) => ({
      stopId: r.stop_id,
      stopName: r.stop_name,
      stopLat: parseFloat(r.stop_lat),
      stopLon: parseFloat(r.stop_lon),
      stopCode: r.stop_code || null,
    }));

    this.stopSearchRows = this.stops.map((stop) => ({
      stop,
      nameWords: normalizeMatchWords(stop.stopName),
      nameComp: alnumCompressed(stop.stopName),
    }));

    for (const r of parseGtfsTable(routesRaw)) {
      this.routes.set(r.route_id, {
        routeId: r.route_id,
        shortName: r.route_short_name,
        longName: r.route_long_name,
      });
    }

    for (const r of parseGtfsTable(tripsRaw)) {
      const trip: GtfsTrip = {
        tripId: r.trip_id,
        routeId: r.route_id,
        serviceId: r.service_id,
        headsign: r.trip_headsign,
      };
      this.trips.set(trip.tripId, trip);
      const list = this.tripsByRoute.get(trip.routeId) ?? [];
      list.push(trip);
      this.tripsByRoute.set(trip.routeId, list);
    }

    for (const r of parseGtfsTable(stopTimesRaw)) {
      const st: GtfsStopTime = {
        tripId: r.trip_id,
        stopId: r.stop_id,
        arrivalTime: r.arrival_time,
        stopSequence: parseInt(r.stop_sequence, 10),
      };
      const byTrip = this.stopTimesByTrip.get(st.tripId) ?? [];
      byTrip.push(st);
      this.stopTimesByTrip.set(st.tripId, byTrip);
      const atStop = this.stopTimesAtStop.get(st.stopId) ?? [];
      atStop.push(st);
      this.stopTimesAtStop.set(st.stopId, atStop);
    }

    for (const [, arr] of this.stopTimesByTrip) {
      arr.sort((a, b) => a.stopSequence - b.stopSequence);
    }
  }

  searchStops(query: string, limit = 40): GtfsStop[] {
    const q = normalizeQuery(query);
    if (!q) {
      return [];
    }

    const qTrim = query.trim().toLowerCase();
    const qWords = normalizeMatchWords(query);
    const qComp = alnumCompressed(query);
    if (!qComp) {
      return [];
    }

    const scored: { stop: GtfsStop; score: number }[] = [];
    for (const row of this.stopSearchRows) {
      const score = scoreStopMatchPrecomputed(
        qTrim,
        qWords,
        qComp,
        row.stop.stopCode,
        row.nameWords,
        row.nameComp
      );
      if (score > 0) scored.push({ stop: row.stop, score });
    }
    scored.sort(
      (a, b) =>
        b.score - a.score ||
        a.stop.stopName.localeCompare(b.stop.stopName, undefined, { sensitivity: 'base' })
    );
    return scored.slice(0, limit).map((x) => x.stop);
  }

  /** Bounding box of all stops, slightly padded — used to constrain address geocoding. */
  bounds(): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLon = Infinity;
    let maxLon = -Infinity;
    for (const s of this.stops) {
      if (!Number.isFinite(s.stopLat) || !Number.isFinite(s.stopLon)) continue;
      if (s.stopLat < minLat) minLat = s.stopLat;
      if (s.stopLat > maxLat) maxLat = s.stopLat;
      if (s.stopLon < minLon) minLon = s.stopLon;
      if (s.stopLon > maxLon) maxLon = s.stopLon;
    }
    const pad = 0.02; // ~2 km so addresses just outside the outermost stop still resolve
    return {
      minLat: minLat - pad,
      maxLat: maxLat + pad,
      minLon: minLon - pad,
      maxLon: maxLon + pad,
    };
  }

  /** Stops closest to a point, nearest first (equirectangular approx — fine at city scale). */
  nearestStops(lat: number, lon: number, limit = 4): GtfsStop[] {
    const cosLat = Math.cos((lat * Math.PI) / 180);
    const scored: { stop: GtfsStop; d2: number }[] = [];
    for (const s of this.stops) {
      if (!Number.isFinite(s.stopLat) || !Number.isFinite(s.stopLon)) continue;
      const dLat = s.stopLat - lat;
      const dLon = (s.stopLon - lon) * cosLat;
      scored.push({ stop: s, d2: dLat * dLat + dLon * dLon });
    }
    scored.sort((a, b) => a.d2 - b.d2);
    return scored.slice(0, limit).map((x) => x.stop);
  }

  routesServingStop(stopId: string): { route: GtfsRoute; headsign: string }[] {
    const times = this.stopTimesAtStop.get(stopId) ?? [];
    const seen = new Map<string, { route: GtfsRoute; headsign: string }>();
    for (const st of times) {
      const trip = this.trips.get(st.tripId);
      if (!trip) continue;
      const route = this.routes.get(trip.routeId);
      if (!route) continue;
      const key = trip.routeId;
      if (!seen.has(key)) {
        seen.set(key, { route, headsign: trip.headsign });
      }
    }
    return [...seen.values()].sort((a, b) =>
      a.route.shortName.localeCompare(b.route.shortName, undefined, { numeric: true })
    );
  }

  /**
   * Next scheduled arrivals at stop for route after `after` (local device clock).
   * Uses service_ids for the calendar day of `after`.
   */
  getScheduledArrivalsAfter(stopId: string, routeId: string, after: Date, count = 4): Date[] {
    const serviceIds = new Set(serviceIdsForLocalDate(after));
    const tripsForRoute = this.tripsByRoute.get(routeId) ?? [];
    const tripIds = new Set(
      tripsForRoute.filter((t) => serviceIds.has(t.serviceId)).map((t) => t.tripId)
    );

    const serviceDayStart = new Date(after);
    serviceDayStart.setHours(0, 0, 0, 0);

    const candidates: Date[] = [];
    for (const st of this.stopTimesAtStop.get(stopId) ?? []) {
      if (!tripIds.has(st.tripId)) continue;
      const dt = gtfsClockToDate(serviceDayStart, st.arrivalTime);
      if (dt.getTime() > after.getTime()) {
        candidates.push(dt);
      }
    }

    candidates.sort((a, b) => a.getTime() - b.getTime());

    const nextDayStart = new Date(serviceDayStart);
    nextDayStart.setDate(nextDayStart.getDate() + 1);

    if (candidates.length < count) {
      const nextServiceIds = new Set(serviceIdsForLocalDate(nextDayStart));
      const nextTripIds = new Set(
        tripsForRoute.filter((t) => nextServiceIds.has(t.serviceId)).map((t) => t.tripId)
      );
      for (const st of this.stopTimesAtStop.get(stopId) ?? []) {
        if (!nextTripIds.has(st.tripId)) continue;
        const dt = gtfsClockToDate(nextDayStart, st.arrivalTime);
        candidates.push(dt);
      }
      candidates.sort((a, b) => a.getTime() - b.getTime());
    }

    return candidates.slice(0, count);
  }

  getStop(stopId: string): GtfsStop | undefined {
    return this.stops.find((s) => s.stopId === stopId);
  }

  getRoute(routeId: string): GtfsRoute | undefined {
    return this.routes.get(routeId);
  }
}

let singleton: StaticGtfsService | null = null;

export async function getStaticGtfsService(): Promise<StaticGtfsService> {
  if (!singleton) {
    const next = new StaticGtfsService();
    await next.load();
    singleton = next;
  }
  return singleton;
}
