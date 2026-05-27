import { CubeCoord, Hex, HEX_DIRECTIONS } from "#data/hex_map";

export function cubeDistance(a: CubeCoord, b: CubeCoord) {
  // we send two coordinates, and find which axis has the biggest difference
  // distance and return it (it is a whole number)

  // this identifies how many steps we will have
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
}

export function axialToCube(q: number, r: number) {
  // translate axial cooridantes to cube in order to do math
  // this step is not required because we can just use q, r, s
  const x = q;
  const z = r;
  const y = -x - z;
  return { x, y, z };
}

export function getHexByAxial(q: number, r: number, mapHexes: Hex[]) {
  return mapHexes.find((hex) => hex.q === q && hex.r === r);
}

export function findNeighbors(hex: Hex, hexes: Hex[], axialMap?: Map<string, Hex>) {
  const neighbors: Hex[] = [];

  for (const dir of HEX_DIRECTIONS) {
    const q = hex.q + dir.dq;
    const r = hex.r + dir.dr;

    let neighbor: Hex | undefined = undefined;

    if (axialMap) {
      neighbor = axialMap.get(`${q},${r}`);
    } else {
      neighbor = hexes.find((n) => n.q === q && n.r === r);
    }

    if (neighbor) neighbors.push(neighbor);
  }

  return neighbors;
}
