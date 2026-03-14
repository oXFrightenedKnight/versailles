type AxialCoord = {
  q: number;
  r: number;
};

type CubeCoord = {
  x: number;
  y: number;
  z: number;
};

export function axialToCube(q: number, r: number) {
  // translate axial cooridantes to cube in order to do math
  // this step is not required because we can just use q, r, s
  const x = q;
  const z = r;
  const y = -x - z;
  return { x, y, z };
}

function cubeDistance(a: CubeCoord, b: CubeCoord) {
  // we send two coordinates, and find which axis has the biggest difference
  // distance and return it (it is a whole number)

  // this identifies how many steps we will have
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
}

function cubeToAxial(c: { x: number; y: number; z: number }) {
  return { q: c.x, r: c.z };
}

function cubeLerp(a: CubeCoord, b: CubeCoord, t: number) {
  // we find new cube point by adding a step to our path
  // we then round it to get our hex at that specific step

  // if cube distance is for ex. 4, we will do cube lerp
  // 4 times and each time it will find a point that is
  // 25% of total distance, 50%, 75%, and 100%.
  // this results in 4 points, that we then round up
  // to get out hex for every step.
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

function cubeRound(c: { x: number; y: number; z: number }) {
  // round up and recalculate to ensure that x + y + z = 0 remains true
  // if false, invlaidate the axis with the biggest rounding difference
  let rx = Math.round(c.x);
  let ry = Math.round(c.y);
  let rz = Math.round(c.z);

  const xDiff = Math.abs(rx - c.x);
  const yDiff = Math.abs(ry - c.y);
  const zDiff = Math.abs(rz - c.z);

  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  return { x: rx, y: ry, z: rz };
}

function hexLine(a: AxialCoord, b: AxialCoord) {
  const ac = axialToCube(a.q, a.r);
  const bc = axialToCube(b.q, b.r);

  const N = cubeDistance(ac, bc);
  const results: AxialCoord[] = [];

  // for every step in cube distance,
  // find intermediate hex coords that will be added to result
  for (let i = 0; i <= N; i++) {
    const t = N === 0 ? 0 : i / N;
    const lerped = cubeLerp(ac, bc, t);
    const rounded = cubeRound(lerped);
    results.push(cubeToAxial(rounded));
  }

  return results;
}

/**
 * Returns the shortest axial path between two hexes, including both endpoints.
 * Use `slice(1, -1)` on the result if you only care about the missing interior hexes.
 */
export function findHexPathBetween(start: AxialCoord, end: AxialCoord) {
  return hexLine(start, end);
}
