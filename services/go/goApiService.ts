import { REALTIME_FETCH_TIMEOUT_MS } from '@/lib/config';
import {
  getMetrolinxApiKey,
  metrolinxApiUrl,
} from '@/lib/metrolinxApiKey';
import { goRouteDirection } from '@/services/gtfs/staticGtfsService';
import type { ArrivalPrediction, RealtimeFetchResult } from '@/types/realtime';
import type { SavedCommute } from '@/types/commute';

type MetrolinxMetadata = {
  ErrorCode?: string;
  ErrorMessage?: string;
  TimeStamp?: string;
};

type NextServiceRow = Record<string, unknown>;

function parseApiTime(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 1e12 ? Math.floor(value / 1000) : Math.floor(value);
  }
  if (typeof value !== 'string') return null;

  const dotNet = /\/Date\((\d+)\)\//.exec(value);
  if (dotNet) return Math.floor(parseInt(dotNet[1], 10) / 1000);

  const parsed = Date.parse(value.replace(' ', 'T'));
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
}

function flattenNextService(payload: unknown): NextServiceRow[] {
  if (Array.isArray(payload)) return payload as NextServiceRow[];
  if (!payload || typeof payload !== 'object') return [];
  const obj = payload as Record<string, unknown>;
  const rows: NextServiceRow[] = [];
  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) rows.push(...(value as NextServiceRow[]));
  }
  return rows;
}

/**
 * A GO departure is inbound when it heads to Union Station. Live feeds vary
 * between "LW - Union Station" and "LW - Union Station GO", so we match the
 * substring (which still excludes the outbound "Unionville GO" terminus).
 */
function rowIsInbound(row: NextServiceRow): boolean {
  const raw = row.DirectionName ?? row.directionName ?? row.Direction ?? row.direction;
  return typeof raw === 'string' && /union station/i.test(raw);
}

function lineCodeFromRow(row: NextServiceRow): string | null {
  const raw =
    row.LineCode ??
    row.lineCode ??
    row.RouteCode ??
    row.routeCode ??
    row.Line ??
    row.line;
  return typeof raw === 'string' && raw.trim() ? raw.trim().toUpperCase() : null;
}

function isMetrolinxSuccess(metadata: MetrolinxMetadata | null | undefined): boolean {
  const code = metadata?.ErrorCode;
  if (!code) return true;
  return code === '0' || code === '200';
}

function arrivalSecFromRow(row: NextServiceRow): number | null {
  return (
    parseApiTime(row.ComputedDepartureTime) ??
    parseApiTime(row.ScheduledDepartureTime) ??
    parseApiTime(row.DepartureTime) ??
    parseApiTime(row.departureTime) ??
    parseApiTime(row.ArrivalTime) ??
    parseApiTime(row.arrivalTime) ??
    parseApiTime(row.ScheduledTime) ??
    parseApiTime(row.scheduledTime) ??
    parseApiTime(row.Time) ??
    parseApiTime(row.time)
  );
}

async function fetchJson<T>(path: string): Promise<T | null> {
  const apiKey = getMetrolinxApiKey();
  if (!apiKey) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REALTIME_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(metrolinxApiUrl(path, apiKey), {
      headers: { Accept: 'application/json' },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** GO stop code for API calls — prefers GTFS stop_code, falls back to stop_id. */
export function goStopCodeForCommute(commute: SavedCommute): string {
  const staticStopCode = commute.stopId;
  return staticStopCode;
}

export async function fetchGoNextService(
  stopCode: string
): Promise<{ rows: NextServiceRow[]; metadata: MetrolinxMetadata | null }> {
  const data = await fetchJson<{
    Metadata?: MetrolinxMetadata;
    NextService?: unknown;
  }>(`api/V1/Stop/NextService/${encodeURIComponent(stopCode)}`);

  if (!data) return { rows: [], metadata: null };
  if (!isMetrolinxSuccess(data.Metadata)) {
    return { rows: [], metadata: data.Metadata ?? null };
  }
  return { rows: flattenNextService(data.NextService), metadata: data.Metadata ?? null };
}

export function nextServiceToPredictions(params: {
  rows: NextServiceRow[];
  commute: SavedCommute;
  routeShortName: string;
  /** Restrict to one travel direction; null keeps both (legacy commutes). */
  direction?: 'inbound' | 'outbound' | null;
}): ArrivalPrediction[] {
  const { rows, commute, routeShortName, direction = null } = params;
  const line = routeShortName.toUpperCase();
  const predictions: ArrivalPrediction[] = [];

  for (const row of rows) {
    const rowLine = lineCodeFromRow(row);
    if (rowLine && rowLine !== line) continue;
    if (direction && (direction === 'inbound') !== rowIsInbound(row)) continue;
    const arrivalTimeSec = arrivalSecFromRow(row);
    if (arrivalTimeSec == null) continue;
    predictions.push({
      stopId: commute.stopId,
      routeId: commute.routeId,
      tripId: String(row.TripNumber ?? row.tripNumber ?? row.TripId ?? row.tripId ?? 'GO'),
      arrivalTimeSec,
    });
  }

  predictions.sort((a, b) => a.arrivalTimeSec - b.arrivalTimeSec);
  return predictions;
}

export async function fetchGoTripUpdatesProtobuf(): Promise<ArrayBuffer | null> {
  const apiKey = getMetrolinxApiKey();
  if (!apiKey) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REALTIME_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(metrolinxApiUrl('api/V1/Gtfs/Feed/TripUpdates', apiKey), {
      headers: { Accept: 'application/x-protobuf, application/octet-stream, */*' },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchGoNextServiceRealtime(
  commute: SavedCommute,
  now: Date
): Promise<RealtimeFetchResult> {
  const nowSec = Math.floor(now.getTime() / 1000);
  const stopCode = goStopCodeForCommute(commute);
  const { rows, metadata } = await fetchGoNextService(stopCode);
  const predictions = nextServiceToPredictions({
    rows,
    commute,
    routeShortName: commute.routeShortName,
    direction: goRouteDirection(commute.routeId),
  });
  const headerTs = metadata?.TimeStamp ? parseApiTime(metadata.TimeStamp) : nowSec;
  return {
    predictions,
    feedTimestampSec: headerTs,
    source: predictions.length > 0 ? 'live' : 'unavailable',
  };
}

export async function fetchGoScheduledArrivalsAfter(
  commute: SavedCommute,
  after: Date,
  count = 4
): Promise<Date[]> {
  const stopCode = goStopCodeForCommute(commute);
  const { rows } = await fetchGoNextService(stopCode);
  const predictions = nextServiceToPredictions({
    rows,
    commute,
    routeShortName: commute.routeShortName,
    direction: goRouteDirection(commute.routeId),
  });

  return predictions
    .map((p) => new Date(p.arrivalTimeSec * 1000))
    .filter((d) => d.getTime() > after.getTime())
    .slice(0, count);
}
