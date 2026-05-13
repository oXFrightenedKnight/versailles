export type Road = {
  id: string;
  points: { q: number; r: number; d1: number; d2: number; isConstructing: boolean }[];

  // used to track construction of a single road point. once progress is enough,
  // it sets next point with isConstructing flag to false
  constructing: {
    progress: number;
    owner: string; // the owner of this construction
  } | null;
};
