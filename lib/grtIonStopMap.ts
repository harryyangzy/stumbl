/**
 * GRT ION LRT uses dedicated stop IDs in GTFS-RT (6108–6123 / 6001–6016) that differ
 * from bus-platform IDs in static GTFS (e.g. 1126 Conestoga Station).
 */

const ION_LRT_STATIONS = [
  { key: 'conestoga', match: ['conestoga station'] },
  { key: 'northfield', match: ['northfield station'] },
  { key: 'research', match: ['research and technology'] },
  { key: 'uwaterloo', match: ['university of waterloo station', 'university of waterloo'] },
  { key: 'laurier', match: ['laurier', 'waterloo park'] },
  { key: 'public_square', match: ['waterloo public square'] },
  { key: 'willis', match: ['willis way station', 'willis way'] },
  { key: 'allen', match: ['allen station'] },
  { key: 'grh', match: ['grand river hospital station', 'grand river hospital'] },
  { key: 'central', match: ['central station'] },
  { key: 'city_hall', match: ['kitchener city hall station', 'kitchener city hall'] },
  { key: 'victoria_park', match: ['victoria park station', 'victoria park'] },
  { key: 'frederick', match: ['frederick station'] },
  { key: 'queen', match: ['queen station'] },
  { key: 'market', match: ['kitchener market station', 'kitchener market'] },
  { key: 'fairway', match: ['fairway station'] },
] as const;

const ION_RT_FORWARD = ION_LRT_STATIONS.map((_, i) => String(6108 + i));
const ION_RT_REVERSE = ION_LRT_STATIONS.map((_, i) => String(6001 + (ION_LRT_STATIONS.length - 1 - i)));

const rtIdToKey = new Map<string, string>();
for (let i = 0; i < ION_LRT_STATIONS.length; i++) {
  rtIdToKey.set(ION_RT_FORWARD[i], ION_LRT_STATIONS[i].key);
  rtIdToKey.set(ION_RT_REVERSE[i], ION_LRT_STATIONS[i].key);
}

export const ION_ROUTE_ID = '301';
export const ION_ROUTE_SHORT = '301';

export function ionStationKeyFromStopName(stopName: string): string | null {
  const n = stopName.toLowerCase();
  for (const station of ION_LRT_STATIONS) {
    if (station.match.some((m) => n.includes(m))) return station.key;
  }
  return null;
}

export function isIonLrtStation(stopName: string): boolean {
  return ionStationKeyFromStopName(stopName) !== null;
}

export function ionRtStopIdsForKey(key: string): string[] {
  const idx = ION_LRT_STATIONS.findIndex((s) => s.key === key);
  if (idx < 0) return [];
  return [ION_RT_FORWARD[idx], ION_RT_REVERSE[idx]];
}

/** All GTFS + GTFS-RT stop IDs that refer to the same ION station. */
export function resolveIonStopIds(params: {
  stopId: string;
  stopName: string;
  staticStopIdsByIonKey?: Map<string, Set<string>>;
}): Set<string> {
  const { stopId, stopName, staticStopIdsByIonKey } = params;
  const key = rtIdToKey.get(stopId) ?? ionStationKeyFromStopName(stopName);
  if (!key) return new Set([stopId]);

  const ids = new Set<string>([stopId, ...ionRtStopIdsForKey(key)]);
  const staticIds = staticStopIdsByIonKey?.get(key);
  if (staticIds) {
    for (const id of staticIds) ids.add(id);
  }
  return ids;
}

export function buildStaticStopIdsByIonKey(
  stops: { stopId: string; stopName: string }[]
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const stop of stops) {
    const key = ionStationKeyFromStopName(stop.stopName);
    if (!key) continue;
    const set = map.get(key) ?? new Set<string>();
    set.add(stop.stopId);
    map.set(key, set);
  }
  return map;
}
