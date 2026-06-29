import { graphObj, Hex } from "#data/hex_map";
import { Road } from "#data/roads";
import { hasBuilding } from "./buildings";
import { axialToCube, cubeDistance, getHexByAxial } from "./hex_map";

// Consider re-using the graph
export function startDijkstrasAlgo({
  startingHex,
  endHex,
  mapHexes,
  roads,
  useSimpleGraph,
}: {
  startingHex: Hex;
  endHex: Hex;
  mapHexes: Hex[];
  roads: Road[];
  useSimpleGraph?: boolean;
}) {
  const weightedGraph = useSimpleGraph
    ? Object.fromEntries(createSimpleHexGraph(mapHexes, startingHex))
    : Object.fromEntries(createWeightedGraph({ mapHexes, roads, startingHex }));
  const totalNodes = Object.keys(weightedGraph).length;

  const endingPointKey = `${endHex.q},${endHex.r}`;

  // create id set of all nodes
  const nodeIds = new Set<number>();
  for (const [key, neighbors] of Object.entries(weightedGraph)) {
    const [q, r] = key.split(",").map(Number); // get node coordinates
    const nodeHex = getHexByAxial(q, r, mapHexes);
    if (nodeHex) nodeIds.add(nodeHex.id);

    for (const n of neighbors) nodeIds.add(n.hexId);
  }

  // type of { hexId: distance }. Set all nodes to infinity, except starting
  const requiredSteps = new Map<number, number>();
  for (const id of nodeIds) requiredSteps.set(id, Infinity);
  requiredSteps.set(startingHex.id, 0);

  const path = new Map<number, number>();
  const visitedHexIds = new Set<number>();

  let atHexId: number | null = startingHex.id;
  let safety = 0;

  while (atHexId !== null && visitedHexIds.size < totalNodes && safety < 10000) {
    safety++;

    const hex = mapHexes.find((h) => h.id === atHexId);
    if (!hex) throw new Error("Hex not found!");

    const atPoint = `${hex.q},${hex.r}`;
    if (atPoint === endingPointKey) break;

    const neighbors = weightedGraph[atPoint] ?? [];
    const currentDistance = requiredSteps.get(hex.id);

    if (currentDistance === undefined) break;

    // update estimates for neighbors
    for (const graphObj of neighbors) {
      const prevDistance = requiredSteps.get(graphObj.hexId);
      if (prevDistance === undefined) continue;

      const newDistance = currentDistance + graphObj.distance;

      if (newDistance < prevDistance) {
        requiredSteps.set(graphObj.hexId, newDistance);
        path.set(graphObj.hexId, hex.id);
      }
    }

    // add current node as visited
    visitedHexIds.add(hex.id);

    // find node with smallest distance that is UNEXPLORED
    let smallest: number | null = null;
    for (const [hexId, dist] of requiredSteps) {
      if (visitedHexIds.has(hexId)) continue;
      if (dist === Infinity) continue;

      if (smallest === null || dist < (requiredSteps.get(smallest) ?? Infinity)) {
        smallest = hexId;
      }
    }

    if (smallest === null) break;
    atHexId = smallest;
  }

  let fromHexId = endHex.id;
  const pointPath: { q: number; r: number }[] = [];

  while (fromHexId !== startingHex.id) {
    const hex = mapHexes.find((h) => h.id === fromHexId);
    if (!hex) break;

    const prevHexId = path.get(fromHexId);
    if (prevHexId === undefined) break;

    pointPath.push({ q: hex.q, r: hex.r });

    fromHexId = prevHexId;
  }

  // only push if there are other points in array
  if (pointPath.length > 0) {
    pointPath.push({ q: startingHex.q, r: startingHex.r });
  }

  return pointPath.length > 0 ? pointPath.reverse() : null;
}

function createWeightedGraph({
  mapHexes,
  roads,
  startingHex,
}: {
  mapHexes: Hex[];
  roads: Road[];
  startingHex: Hex;
}) {
  const weightedGraph = new Map<string, graphObj>();

  // find hexes that have multiple roads intersecting to use as nodes
  const pointRoadMap = new Map<string, Road[]>();
  for (const road of roads) {
    for (const point of road.points) {
      const prevRoads = pointRoadMap.get(`${point.q},${point.r}`) ?? [];
      pointRoadMap.set(`${point.q},${point.r}`, [...prevRoads, road]);
    }
  }

  // filter out points with buildings
  const buildingPoints = new Map<string, Road[]>();
  for (const [key, roads] of pointRoadMap) {
    if (hasBuilding(key, mapHexes)) {
      buildingPoints.set(key, roads);
    }
  }

  // filter out points that belong to start hex owner
  const ownerPoints = new Set<string>();
  for (const [key, _] of pointRoadMap) {
    const point = key.split(",");
    const hex = getHexByAxial(Number(point[0]), Number(point[1]), mapHexes);

    if (hex && hex.owner === startingHex.owner) {
      ownerPoints.add(key);
    }
  }

  // get building points
  // find all hexes that have buildings AND have road(s)
  const nodes = new Set<string>();
  const nodePointMap = new Map<string, Road[]>();

  for (const [key, roads] of pointRoadMap) {
    const hasRoad = roads.length > 0;

    const noConstruction = roads.every((r) => r.points.every((p) => !p.isConstructing));

    const hasBuildingHere = buildingPoints.has(key);

    const belongsToOwner = ownerPoints.has(key);

    if (
      (hasRoad && noConstruction && belongsToOwner) ||
      (hasBuildingHere && hasRoad && noConstruction && belongsToOwner)
    ) {
      nodes.add(key);
      nodePointMap.set(key, roads);
    }
  }

  // turn intersects into array and loop over to add to graph
  for (const [key, roads] of nodePointMap) {
    const point = key.split(","); // [0] - q, [1] - r
    for (const road of roads) {
      // split road in two arrays by finding index of point
      const idx = road.points.findIndex(
        (p) => p.q === Number(point[0]) && p.r === Number(point[1])
      );
      if (idx === -1) continue;

      // reverse first chunk to start searching from original point
      const first = road.points.slice(0, idx).reverse();
      const second = road.points.slice(idx + 1);

      // map nodes for both chunks
      mapOverChunk(first);
      mapOverChunk(second);
      function mapOverChunk(chunk: typeof first | typeof second) {
        if (chunk.length > 0) {
          for (const nextPoint of chunk) {
            if (nodes.has(`${nextPoint.q},${nextPoint.r}`)) {
              const prevObjs = weightedGraph.get(`${point[0]},${point[1]}`) ?? [];
              const hex = getHexByAxial(nextPoint.q, nextPoint.r, mapHexes);
              if (!hex) continue;
              const cubeA = axialToCube(Number(point[0]), Number(point[1]));
              const cubeB = axialToCube(nextPoint.q, nextPoint.r);
              const distance = cubeDistance(cubeA, cubeB);
              weightedGraph.set(`${point[0]},${point[1]}`, [
                ...prevObjs,
                { hexId: hex.id, distance: distance },
              ]);
              break; // exit loop after we found 1 node on at least 1 side
            }
          }
        }
      }
    }
  }
  return weightedGraph;
}

export function createSimpleHexGraph(mapHexes: Hex[], startingHex: Hex) {
  const graph = new Map<string, graphObj>();

  for (const hex of mapHexes) {
    const prev = graph.get(`${startingHex.q},${startingHex.r}`) ?? [];
    const CubeStart = axialToCube(startingHex.q, startingHex.r);
    const CubeEnd = axialToCube(hex.q, hex.r);
    const dist = cubeDistance(CubeStart, CubeEnd);
    graph.set(`${startingHex.q},${startingHex.r}`, [...prev, { hexId: hex.id, distance: dist }]);
  }
  return graph;
}
