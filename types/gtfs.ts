export type GtfsStop = {
  stopId: string;
  stopName: string;
  stopLat: number;
  stopLon: number;
  stopCode: string | null;
};

export type GtfsRoute = {
  routeId: string;
  shortName: string;
  longName: string;
};

export type GtfsTrip = {
  tripId: string;
  routeId: string;
  serviceId: string;
  headsign: string;
};

export type GtfsStopTime = {
  tripId: string;
  stopId: string;
  arrivalTime: string;
  stopSequence: number;
};
