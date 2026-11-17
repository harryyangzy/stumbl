import type { CommuteRoute, SavedCommute } from '@/types/commute';

/** All lines the commute tracks; falls back to the primary route for older saves. */
export function commuteRoutes(commute: SavedCommute): CommuteRoute[] {
  if (commute.routes && commute.routes.length > 0) return commute.routes;
  return [
    {
      routeId: commute.routeId,
      routeShortName: commute.routeShortName,
      headsign: commute.headsign,
    },
  ];
}

/** Single-line view of the commute, for services that work one route at a time. */
export function commuteForRoute(commute: SavedCommute, route: CommuteRoute): SavedCommute {
  return {
    ...commute,
    routeId: route.routeId,
    routeShortName: route.routeShortName,
    headsign: route.headsign,
    routes: [route],
  };
}
