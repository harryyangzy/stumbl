import { Asset } from 'expo-asset';
import { readAsStringAsync } from 'expo-file-system/legacy';

import { parseGtfsTable } from '@/lib/csv';
import {
  buildStaticStopIdsByIonKey,
  ION_ROUTE_ID,
  ION_ROUTE_SHORT,
  ionStationKeyFromStopName,
  isIonLrtStation,
} from '@/lib/grtIonStopMap';
import {
  getTransitAgency,
  type TransitAgencyConfig,
  type TransitAgencyId,
} from '@/lib/transitAgencies';
import type { SavedCommute } from '@/types/commute';
import type { GtfsRoute, GtfsStop, GtfsStopTime, GtfsTrip } from '@/types/gtfs';
import { fetchGoScheduledArrivalsAfter } from '@/services/go/goApiService';

import goCalendarDatesTxt from '../../data/gtfs/go/calendar_dates.txt';
import goRoutesTxt from '../../data/gtfs/go/routes.txt';
import goStopRoutesJson from '../../data/gtfs/go/stop_routes.json';
import goStopTimesTxt from '../../data/gtfs/go/stop_times.txt';
import goStopsTxt from '../../data/gtfs/go/stops.txt';
import goTripsTxt from '../../data/gtfs/go/trips.txt';
import ltcCalendarDatesTxt from '../../data/gtfs/ltc/calendar_dates.txt';
import ltcCalendarTxt from '../../data/gtfs/ltc/calendar.txt';
import ltcRoutesTxt from '../../data/gtfs/ltc/routes.txt';
import ltcStopTimesTxt from '../../data/gtfs/ltc/stop_times.txt';
import ltcStopsTxt from '../../data/gtfs/ltc/stops.txt';
import ltcTripsTxt from '../../data/gtfs/ltc/trips.txt';
import grtCalendarDatesTxt from '../../data/gtfs/grt/calendar_dates.txt';
import grtRoutesTxt from '../../data/gtfs/grt/routes.txt';
import grtStopTimesTxt from '../../data/gtfs/grt/stop_times.txt';
import grtStopsTxt from '../../data/gtfs/grt/stops.txt';
import grtTripsTxt from '../../data/gtfs/grt/trips.txt';

type GtfsBundleModules = {
  stops: number;
  routes: number;
  trips: number;
  stopTimes: number;
  calendarDates: number;
  calendar?: number;
};

const GTFS_BUNDLES: Record<TransitAgencyId, GtfsBundleModules> = {
  ltc: {
    stops: ltcStopsTxt,
    routes: ltcRoutesTxt,
    trips: ltcTripsTxt,
    stopTimes: ltcStopTimesTxt,
    calendarDates: ltcCalendarDatesTxt,
    calendar: ltcCalendarTxt,
  },
  grt: {
    stops: grtStopsTxt,
    routes: grtRoutesTxt,
    trips: grtTripsTxt,
    stopTimes: grtStopTimesTxt,
    calendarDates: grtCalendarDatesTxt,
  },
  go: {
    stops: goStopsTxt,
    routes: goRoutesTxt,
    trips: goTripsTxt,
    stopTimes: goStopTimesTxt,
    calendarDates: goCalendarDatesTxt,
  },
};

type GoStopRouteRow = { routeId: string; shortName: string; headsign: string };
const GO_STOP_ROUTES = goStopRoutesJson as Record<string, GoStopRouteRow[]>;

type CalendarRow = {
  serviceId: string;
  startDate: string;
  endDate: string;
  weekdays: boolean[];
};

type CalendarException = {
  serviceId: string;
  date: string;
  added: boolean;
};

async function loadBundledText(mod: number): Promise<string> {
  const asset = Asset.fromModule(mod);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  return readAsStringAsync(uri);
}

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

function normalizeMatchWords(s: string): string {
  const parts =
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .match(/[a-z0-9]+/g) ?? [];
  return parts.join(' ');
}

function alnumCompressed(s: string): string {
  return normalizeMatchWords(s).replace(/\s/g, '');
}

function subsequenceMatch(haystack: string, needle: string): boolean {
  if (!needle) return true;
  let i = 0;
  for (let j = 0; j < haystack.length && i < needle.length; j++) {
    if (haystack[j] === needle[i]) i++;
  }
  return i === needle.length;
}

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

export function formatGtfsServiceDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
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

/** Drop the leading line code from a GO headsign, e.g. "LW - Aldershot GO" → "Aldershot GO". */
function stripLinePrefix(headsign: string): string {
  return headsign.replace(/^[A-Za-z0-9]+\s*-\s*/, '').trim();
}

function topCountKey(counts: Map<string, number>): string | null {
  let best: string | null = null;
  let bestN = -1;
  for (const [key, n] of counts) {
    if (n > bestN) {
      best = key;
      bestN = n;
    }
  }
  return best;
}

/** GO route id with a direction suffix: `#0` = outbound (away from Union), `#1` = inbound (to Union). */
export function goRouteIdWithDirection(routeId: string, directionId: '0' | '1'): string {
  return `${routeId}#${directionId}`;
}

export function goBaseRouteId(routeId: string): string {
  const i = routeId.indexOf('#');
  return i === -1 ? routeId : routeId.slice(0, i);
}

export function goRouteDirection(routeId: string): 'inbound' | 'outbound' | null {
  if (routeId.endsWith('#1')) return 'inbound';
  if (routeId.endsWith('#0')) return 'outbound';
  return null;
}

export class StaticGtfsService {
  readonly agencyId: TransitAgencyId;
  private agency: TransitAgencyConfig;
  private stops: GtfsStop[] = [];
  private stopSearchRows: StopSearchRow[] = [];
  private routes = new Map<string, GtfsRoute>();
  private trips = new Map<string, GtfsTrip>();
  private tripsByRoute = new Map<string, GtfsTrip[]>();
  private stopTimesAtStop = new Map<string, GtfsStopTime[]>();
  private calendarRows: CalendarRow[] = [];
  private calendarExceptions: CalendarException[] = [];
  private calendarDatesOnlyByYmd = new Map<string, Set<string>>();
  private ionStopIdsByKey = new Map<string, Set<string>>();
  /** GRT (and GO) platform variants that share a display name. */
  private stopIdsByNameKey = new Map<string, Set<string>>();
  /** GO only: per-route representative terminus for each direction (inbound = to Union). */
  private goRouteDirections = new Map<string, { inbound: string; outbound: string }>();

  constructor(agencyId: TransitAgencyId) {
    this.agencyId = agencyId;
    this.agency = getTransitAgency(agencyId);
  }

  private dedupeStopsByName(stops: GtfsStop[]): GtfsStop[] {
    const byKey = new Map<string, GtfsStop[]>();
    for (const stop of stops) {
      const key = normalizeMatchWords(stop.stopName);
      if (!key) continue;
      const list = byKey.get(key) ?? [];
      list.push(stop);
      byKey.set(key, list);
    }

    const out: GtfsStop[] = [];
    for (const group of byKey.values()) {
      if (group.length === 1) {
        out.push(group[0]);
        continue;
      }
      group.sort((a, b) => {
        const aCount = this.stopTimesAtStop.get(a.stopId)?.length ?? 0;
        const bCount = this.stopTimesAtStop.get(b.stopId)?.length ?? 0;
        return bCount - aCount || a.stopId.localeCompare(b.stopId);
      });
      out.push(group[0]);
    }
    return out;
  }

  private maybeDedupeStops(stops: GtfsStop[]): GtfsStop[] {
    return this.agency.dedupeStopsByName ? this.dedupeStopsByName(stops) : stops;
  }

  private serviceIdsForDate(d: Date): Set<string> {
    if (this.agency.calendarMode === 'calendar_dates_only') {
      return new Set(this.calendarDatesOnlyByYmd.get(formatGtfsServiceDate(d)) ?? []);
    }

    const ymd = formatGtfsServiceDate(d);
    const day = d.getDay();
    const ids = new Set<string>();
    for (const row of this.calendarRows) {
      if (ymd >= row.startDate && ymd <= row.endDate && row.weekdays[day]) {
        ids.add(row.serviceId);
      }
    }
    for (const ex of this.calendarExceptions) {
      if (ex.date !== ymd) continue;
      if (ex.added) ids.add(ex.serviceId);
      else ids.delete(ex.serviceId);
    }
    return ids;
  }

  async load(): Promise<void> {
    const bundle = GTFS_BUNDLES[this.agencyId];
    const loads: Promise<string>[] = [
      loadBundledText(bundle.stops),
      loadBundledText(bundle.routes),
      loadBundledText(bundle.trips),
      loadBundledText(bundle.stopTimes),
      loadBundledText(bundle.calendarDates),
    ];
    if (bundle.calendar != null) {
      loads.push(loadBundledText(bundle.calendar));
    }

    const raw = await Promise.all(loads);
    const stopsRaw = raw[0];
    const routesRaw = raw[1];
    const tripsRaw = raw[2];
    const stopTimesRaw = raw[3];
    const calendarDatesRaw = raw[4];
    const calendarRaw = raw[5];

    let stopRows = parseGtfsTable(stopsRaw);
    if (this.agency.excludeParentStations) {
      stopRows = stopRows.filter((r) => r.location_type !== '1');
    }

    this.stops = stopRows.map((r) => ({
      stopId: r.stop_id,
      stopName: r.stop_name,
      stopLat: parseFloat(r.stop_lat),
      stopLon: parseFloat(r.stop_lon),
      stopCode: r.stop_code || null,
    }));

    this.ionStopIdsByKey = this.agency.ionSupport
      ? buildStaticStopIdsByIonKey(this.stops)
      : new Map();

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

    if (this.agency.ionSupport && !this.routes.has(ION_ROUTE_ID)) {
      this.routes.set(ION_ROUTE_ID, {
        routeId: ION_ROUTE_ID,
        shortName: ION_ROUTE_SHORT,
        longName: 'ION',
      });
    }

    const goDirCounts = new Map<string, { in: Map<string, number>; out: Map<string, number> }>();
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

      if (this.agencyId === 'go') {
        const dest = stripLinePrefix(r.trip_headsign ?? '');
        if (dest) {
          const bucket = goDirCounts.get(r.route_id) ?? { in: new Map(), out: new Map() };
          const target = r.direction_id === '1' ? bucket.in : bucket.out;
          target.set(dest, (target.get(dest) ?? 0) + 1);
          goDirCounts.set(r.route_id, bucket);
        }
      }
    }

    if (this.agencyId === 'go') {
      this.goRouteDirections = new Map();
      for (const [routeId, b] of goDirCounts) {
        // Prefer the branch that matches the line's namesake (e.g. Kitchener line →
        // "Kitchener GO" over the more frequent short-turn "Bramalea GO"); otherwise
        // fall back to the most-served outbound terminus.
        const longName = this.routes.get(routeId)?.longName ?? '';
        const namesake = longName
          ? [...b.out.keys()].find((k) => k.toLowerCase().includes(longName.toLowerCase()))
          : undefined;
        this.goRouteDirections.set(routeId, {
          inbound: topCountKey(b.in) ?? 'Union Station GO',
          outbound: namesake ?? topCountKey(b.out) ?? '',
        });
      }
    }

    for (const r of parseGtfsTable(stopTimesRaw)) {
      const st: GtfsStopTime = {
        tripId: r.trip_id,
        stopId: r.stop_id,
        arrivalTime: r.arrival_time,
        stopSequence: parseInt(r.stop_sequence, 10),
      };
      const atStop = this.stopTimesAtStop.get(st.stopId) ?? [];
      atStop.push(st);
      this.stopTimesAtStop.set(st.stopId, atStop);
    }

    if (this.agency.dedupeStopsByName) {
      this.stopIdsByNameKey = new Map();
      for (const stop of this.stops) {
        const key = normalizeMatchWords(stop.stopName);
        if (!key) continue;
        const set = this.stopIdsByNameKey.get(key) ?? new Set<string>();
        set.add(stop.stopId);
        this.stopIdsByNameKey.set(key, set);
      }
    }

    if (this.agency.calendarMode === 'calendar_dates_only') {
      this.calendarDatesOnlyByYmd = new Map();
      for (const r of parseGtfsTable(calendarDatesRaw)) {
        if (r.exception_type !== '1') continue;
        const date = r.date;
        const serviceId = r.service_id;
        if (!date || !serviceId) continue;
        const set = this.calendarDatesOnlyByYmd.get(date) ?? new Set<string>();
        set.add(serviceId);
        this.calendarDatesOnlyByYmd.set(date, set);
      }
    } else if (calendarRaw) {
      this.calendarRows = parseGtfsTable(calendarRaw).map((r) => ({
        serviceId: r.service_id,
        startDate: r.start_date,
        endDate: r.end_date,
        weekdays: [
          r.sunday === '1',
          r.monday === '1',
          r.tuesday === '1',
          r.wednesday === '1',
          r.thursday === '1',
          r.friday === '1',
          r.saturday === '1',
        ],
      }));
      this.calendarExceptions = parseGtfsTable(calendarDatesRaw).map((r) => ({
        serviceId: r.service_id,
        date: r.date,
        added: r.exception_type === '1',
      }));
    }
  }

  searchStops(query: string, limit = 40): GtfsStop[] {
    const q = normalizeQuery(query);
    if (!q) return [];

    const qTrim = query.trim().toLowerCase();
    const qWords = normalizeMatchWords(query);
    const qComp = alnumCompressed(query);
    if (!qComp) return [];

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
    return this.maybeDedupeStops(scored.map((x) => x.stop)).slice(0, limit);
  }

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
    const pad = 0.02;
    return {
      minLat: minLat - pad,
      maxLat: maxLat + pad,
      minLon: minLon - pad,
      maxLon: maxLon + pad,
    };
  }

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
    return this.maybeDedupeStops(scored.map((x) => x.stop)).slice(0, limit);
  }

  routesServingStop(stopId: string): { route: GtfsRoute; headsign: string }[] {
    if (this.agencyId === 'go') {
      const rows = GO_STOP_ROUTES[stopId] ?? [];
      const stop = this.getStop(stopId);
      /** Union is the shared inbound terminus — trains only depart it outbound. */
      const isUnion = stopId === 'UN' || /union station/i.test(stop?.stopName ?? '');
      const out: { route: GtfsRoute; headsign: string }[] = [];
      for (const row of rows) {
        const route = this.routes.get(row.routeId);
        if (!route) continue;
        const dirs = this.goRouteDirections.get(row.routeId);
        const outboundHead = dirs?.outbound || route.longName;
        const inboundHead = dirs?.inbound || 'Union Station GO';
        if (outboundHead) {
          out.push({
            route: { ...route, routeId: goRouteIdWithDirection(row.routeId, '0') },
            headsign: outboundHead,
          });
        }
        if (!isUnion) {
          out.push({
            route: { ...route, routeId: goRouteIdWithDirection(row.routeId, '1') },
            headsign: inboundHead,
          });
        }
      }
      return out.sort((a, b) =>
        a.route.shortName.localeCompare(b.route.shortName, undefined, { numeric: true })
      );
    }

    const times = this.stopTimesAtStop.get(stopId) ?? [];
    const seen = new Map<string, { route: GtfsRoute; headsign: string }>();
    for (const sid of this.resolvePlatformStopIds(stopId)) {
      for (const st of this.stopTimesAtStop.get(sid) ?? []) {
        const trip = this.trips.get(st.tripId);
        if (!trip) continue;
        const route = this.routes.get(trip.routeId);
        if (!route) continue;
        if (!seen.has(trip.routeId)) {
          seen.set(trip.routeId, { route, headsign: trip.headsign });
        }
      }
    }

    if (this.agency.ionSupport) {
      const stop = this.getStop(stopId);
      if (stop && isIonLrtStation(stop.stopName)) {
        const ionRoute = this.routes.get(ION_ROUTE_ID);
        if (ionRoute && !seen.has(ION_ROUTE_ID)) {
          seen.set(ION_ROUTE_ID, {
            route: ionRoute,
            headsign:
              ionStationKeyFromStopName(stop.stopName) === 'conestoga' ? 'Fairway' : 'Conestoga',
          });
        }
      }
    }

    return [...seen.values()].sort((a, b) =>
      a.route.shortName.localeCompare(b.route.shortName, undefined, { numeric: true })
    );
  }

  ionStopIdsByStationKey(): Map<string, Set<string>> {
    return this.ionStopIdsByKey;
  }

  /** All GTFS stop IDs for the same platform group (e.g. GRT bay variants). */
  resolvePlatformStopIds(stopId: string, stopName?: string): Set<string> {
    if (!this.agency.dedupeStopsByName) return new Set([stopId]);
    const stop = this.getStop(stopId);
    const key = normalizeMatchWords(stopName ?? stop?.stopName ?? '');
    if (!key) return new Set([stopId]);
    const ids = this.stopIdsByNameKey.get(key);
    if (!ids?.size) return new Set([stopId]);
    return new Set(ids);
  }

  async getScheduledArrivalsForCommute(
    commute: SavedCommute,
    after: Date,
    count = 4
  ): Promise<Date[]> {
    if (this.agency.metrolinxApi) {
      return fetchGoScheduledArrivalsAfter(commute, after, count);
    }
    return this.getScheduledArrivalsAfter(commute.stopId, commute.routeId, after, count);
  }

  getScheduledArrivalsAfter(stopId: string, routeId: string, after: Date, count = 4): Date[] {
    const serviceIds = this.serviceIdsForDate(after);
    const tripsForRoute = this.tripsByRoute.get(routeId) ?? [];
    const tripIds = new Set(
      tripsForRoute.filter((t) => serviceIds.has(t.serviceId)).map((t) => t.tripId)
    );

    const serviceDayStart = new Date(after);
    serviceDayStart.setHours(0, 0, 0, 0);

    const candidates: Date[] = [];
    for (const sid of this.resolvePlatformStopIds(stopId)) {
      for (const st of this.stopTimesAtStop.get(sid) ?? []) {
        if (!tripIds.has(st.tripId)) continue;
        const dt = gtfsClockToDate(serviceDayStart, st.arrivalTime);
        if (dt.getTime() > after.getTime()) candidates.push(dt);
      }
    }

    candidates.sort((a, b) => a.getTime() - b.getTime());

    const nextDayStart = new Date(serviceDayStart);
    nextDayStart.setDate(nextDayStart.getDate() + 1);

    if (candidates.length < count) {
      const nextServiceIds = this.serviceIdsForDate(nextDayStart);
      const nextTripIds = new Set(
        tripsForRoute.filter((t) => nextServiceIds.has(t.serviceId)).map((t) => t.tripId)
      );
      for (const sid of this.resolvePlatformStopIds(stopId)) {
        for (const st of this.stopTimesAtStop.get(sid) ?? []) {
          if (!nextTripIds.has(st.tripId)) continue;
          candidates.push(gtfsClockToDate(nextDayStart, st.arrivalTime));
        }
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

const singletons = new Map<TransitAgencyId, StaticGtfsService>();

export async function getStaticGtfsService(
  agencyId: TransitAgencyId = 'grt'
): Promise<StaticGtfsService> {
  let svc = singletons.get(agencyId);
  if (!svc) {
    svc = new StaticGtfsService(agencyId);
    await svc.load();
    singletons.set(agencyId, svc);
  }
  return svc;
}
