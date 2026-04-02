/** Normalized prediction for a stop (seconds from Unix epoch). */
export type ArrivalPrediction = {
  stopId: string;
  routeId: string;
  tripId: string | null;
  arrivalTimeSec: number;
};

export type RealtimeFetchResult = {
  predictions: ArrivalPrediction[];
  feedTimestampSec: number | null;
  source: 'live' | 'mock' | 'unavailable';
};
