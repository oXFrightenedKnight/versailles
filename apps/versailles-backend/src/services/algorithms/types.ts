export type BFSResult = {
  startHexId: number;
  cameFrom: Map<number, number | null>;
};
