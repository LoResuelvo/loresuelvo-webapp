export interface CoverageZoneBoundary {
  type: string;
  placeId: string;
}

export interface CoverageZone {
  id: number;
  name: string;
  boundary?: CoverageZoneBoundary;
}
