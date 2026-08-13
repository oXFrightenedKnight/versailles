export type Road = {
  id: string;
  points: RoadPoint[];

  // used to track construction of a single road point. once progress is enough,
  // it sets next point with isConstructing flag to false
  constructing: {
    progress: number;
    owner: string; // the owner of this construction
  } | null;
};

export type Point = { q: number; r: number };
export type RoadPoint = Point & { d1: number; d2: number; isConstructing: boolean };

// base road cost per 1 segment
export const BASE_ROAD_COST = 50;
