import {
  Building,
  calculateExportAmount,
  findNeighbors,
  getBuilding,
  getHexByAxial,
  hasSegment,
  Hex,
  HEX_DIRECTIONS,
  Nation,
  Road,
  startDijkstrasAlgo,
  SupplyContract,
  topLevelsByCategory,
} from "@repo/shared";
import { pixelToHex } from "./render";
import { Dispatch, RefObject } from "react";
import { randomNumber } from "@/lib/utils";
import { ServerContractUpdate, SetStateAction } from "@/lib/intentStore";
import { armyIntent, BuildModeType, Contract, newBuilding, roadObject } from "@/lib/types/game";
import { findHexPathBetween } from "./pathfinding";
import { getFirstFreeResource, getMergedContracts } from "@/lib/helpers/uiContract";

export type ClickCtx = {
  mouseDownRef: RefObject<boolean>;
  buildMode: BuildModeType;
  isContractSelected: boolean;
  selectedHexIdRef: RefObject<number | null>;
  setSelectedHex: Dispatch<React.SetStateAction<Hex | null>>;
  startAnimation: () => void;
  redraw: () => void;
  selectedHex: Hex | null;
  playerNation: Nation | null;
  mapHexes: Hex[];
  roads: Road[];
  buildings: Building[];
  setIsContractSelected: Dispatch<React.SetStateAction<boolean>>;
  roadStartRef: RefObject<Hex | null>;
  randomIdRef: RefObject<string | null>;
  tempRoadRef: RefObject<roadObject | null>;
  setBuildMode: Dispatch<React.SetStateAction<BuildModeType>>;
  buildBuildings: newBuilding[];
  setBuildBuildings: SetStateAction<newBuilding[]>;
  setArmyMove: SetStateAction<armyIntent[]>;
  contracts: Contract[];
  setContracts: SetStateAction<Contract[]>;
  serverContracts: {
    buildingId: string;
    contracts: SupplyContract[];
  }[];
  serverContractUpdate: ServerContractUpdate[];
  setBuildRoads: SetStateAction<roadObject[]>;
  d: {
    a: number;
    b: number;
  };
};

export type RoadDragCtx = {
  buildMode: BuildModeType;
  mouseDownRef: RefObject<boolean>;
  roadStartRef: RefObject<Hex | null>;
  mapHexesRef: RefObject<Hex[] | null>;
  tempRoadRef: RefObject<roadObject | null>;
  hitCanvasRef: RefObject<HTMLCanvasElement | null>;
  mapHexes: Hex[];
  randomIdRef: RefObject<string | null>;
  cameraRef: RefObject<{
    x: number;
    y: number;
    zoom: number;
  }>;
  playerNation: Nation | null;
  roads: Road[];
  buildRoads: roadObject[];
  d: {
    a: number;
    b: number;
  };
};

// This function handles game-actions when players on the map
export function dispatchMapTap(worldX: number, worldY: number, button: number, ctx: ClickCtx) {
  const { hex } = pixelToHex({ x: worldX, y: worldY, mapHexes: ctx.mapHexes });
  if (!hex) return;

  if (button === 0) {
    handleLeftClick(hex, ctx);
  }

  if (button === 2) {
    handleRightClick(hex, ctx);
  }
}

// HANDLE LEFT CLICK
function handleLeftClick(hex: Hex, ctx: ClickCtx) {
  if (ctx.buildMode === "none") {
    handleNormalMode(hex, ctx);
  } else {
    handleBuildMode(hex, ctx);
  }
}

function handleNormalMode(hex: Hex, ctx: ClickCtx) {
  if (!ctx.isContractSelected) {
    selectHex(hex, ctx);
  } else {
    createContract(hex, ctx);
  }
}
function selectHex(hex: Hex, ctx: ClickCtx) {
  ctx.selectedHexIdRef.current = hex.id;
  ctx.setSelectedHex(hex);

  ctx.startAnimation();
  ctx.redraw();
}
function createContract(hex: Hex, ctx: ClickCtx) {
  const {
    selectedHex,
    playerNation,
    mapHexes,
    buildings,
    serverContracts,
    serverContractUpdate,
    contracts,
    setIsContractSelected,
    setContracts,
    roads,
  } = ctx;

  const startId = selectedHex?.buildingId;
  const endId = hex.buildingId;

  const belongToPlayer = selectedHex?.owner === playerNation?.id && hex.owner === playerNation?.id;

  if (startId && endId && belongToPlayer && mapHexes) {
    const startBuilding = getBuilding({ buildings, id: startId });
    const endBuilding = getBuilding({ buildings, id: endId });
    if (!startBuilding || !startBuilding.storage) return;
    if (!endBuilding || !endBuilding.storage) return;

    // merged Server and client contracts for ui
    const merged = getMergedContracts(
      serverContracts,
      contracts,
      startBuilding.id,
      serverContractUpdate
    );
    const resource = getFirstFreeResource({
      startBuilding,
      endBuilding,
      allContracts: merged,
    });
    if (!resource) {
      setIsContractSelected(false);
      return;
    }

    // find path
    const pointHexMap = new Map(mapHexes.map((h) => [`${h.q},${h.r}`, h]));
    const points = startDijkstrasAlgo({
      startingHex: selectedHex,
      endHex: hex,
      mapHexes,
      roads,
    });
    if (!points) {
      setIsContractSelected(false);
      return;
    } // don't add if path failed
    const hexIds: number[] = [];
    for (const point of points) {
      const hex = pointHexMap.get(`${point.q},${point.r}`);
      if (!hex) continue;

      hexIds.push(hex.id);
    }

    const amount =
      calculateExportAmount({
        startBuilding,
        endBuilding,
        length: hexIds.length - 1,
        resource,
        mapHexes,
        buildings,
      }) ?? 0;

    setContracts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        startBuildingId: startId,
        endBuildingId: endId,
        resource,
        amount,
        progress: 0,
        hexIds,
        autoAdjust: true,
      },
    ]);
  }
  setIsContractSelected(false);
}

function handleBuildMode(hex: Hex, ctx: ClickCtx) {
  if (ctx.buildMode === "road") {
    handleRoadBuild(hex, ctx);
  } else {
    handleBuildingPlacement(hex, ctx);
  }
}
function handleRoadBuild(hex: Hex, ctx: ClickCtx) {
  const { playerNation, roadStartRef, randomIdRef, tempRoadRef, setBuildRoads, d, setBuildMode } =
    ctx;
  // check if clicked hex belongs to player
  if (hex.owner !== playerNation?.id) return;

  // set selected hex to be road start
  if (!roadStartRef.current) {
    roadStartRef.current = hex;
    randomIdRef.current = crypto.randomUUID();

    // push starting roadObject to array
    tempRoadRef.current = {
      id: randomIdRef.current!,
      points: [{ q: hex.q, r: hex.r, d1: randomNumber(d.a, d.b), d2: randomNumber(d.a, d.b) }],
    };
  } else {
    // add logic to submit the road from temp to actual array and clean up
    const roadToCommit = tempRoadRef.current;
    if (roadToCommit && roadStartRef.current !== hex) {
      setBuildRoads((prev) => [...prev, roadToCommit]);
    }

    // cleanup
    tempRoadRef.current = null;
    roadStartRef.current = null;
    randomIdRef.current = null;
    setBuildMode("none");
  }
}
function handleBuildingPlacement(hex: Hex, ctx: ClickCtx) {
  const { buildBuildings, buildMode, buildings, setBuildBuildings, playerNation } = ctx;

  // return if hex doesn't belong to player
  if (hex.owner !== playerNation?.id) return;

  // These are current queued building objects on client and server in that hex
  const buildingOfHex = hex.buildingId ? getBuilding({ buildings, id: hex.buildingId }) : undefined;
  const queuedClientBuilding = buildBuildings.find((obj) => obj.hexId === hex.id);
  const queuedServerBuilding = hex.build_queue;

  const serverLevels = queuedServerBuilding?.levels ?? 0;
  const clientLevels = queuedClientBuilding?.levelsToUpgrade ?? 0;
  const currentLevel = buildingOfHex?.level ? buildingOfHex.level : 0;

  // if there is a building queued or built already and its type doesn't match - skip
  if (queuedClientBuilding && queuedClientBuilding.buildingType !== buildMode) return;
  if (queuedServerBuilding && queuedServerBuilding.building !== buildMode) return;
  if (buildingOfHex && buildingOfHex.category !== buildMode) return;

  const total = serverLevels + clientLevels + currentLevel;
  const max = topLevelsByCategory.find((l) => l.category === buildMode)?.level ?? Infinity;
  // if no max level was found, default to infinity

  // if the total level of built + in progress + new one is above max - skip
  if (total + 1 > max) return;

  // update if exists, create if doesn't
  if (queuedClientBuilding) {
    setBuildBuildings((prev) =>
      prev.map((obj) =>
        obj.hexId === queuedClientBuilding.hexId
          ? { ...obj, levelsToUpgrade: obj.levelsToUpgrade + 1 }
          : obj
      )
    );
  } else {
    if (buildMode === "road" || buildMode === "none") return;
    setBuildBuildings((prev) => [
      ...prev,
      {
        hexId: hex.id,
        levelsToUpgrade: 1,
        buildingType: buildMode,
      },
    ]);
  }
}

// RIGHT CLICK
function handleRightClick(hex: Hex, ctx: ClickCtx) {
  const { selectedHexIdRef, selectedHex, setArmyMove } = ctx;

  console.log("GOT THE CLICK");
  if (selectedHexIdRef.current === hex.id || !selectedHex) return;
  if (
    !HEX_DIRECTIONS.some(
      (dir) => dir.dq === selectedHex.q - hex.q && dir.dr === selectedHex.r - hex.r
    )
  )
    return;
  setArmyMove((prev) => [
    ...prev,
    {
      hexId: selectedHex.id,
      amount: 100,
      direction: {
        dq: hex.q - selectedHex.q,
        dr: hex.r - selectedHex.r,
      },
    },
  ]);
}

export function handleRoadDrag(event: MouseEvent, ctx: RoadDragCtx) {
  // deconstruct ctx
  const {
    buildMode,
    mouseDownRef,
    roadStartRef,
    mapHexesRef,
    tempRoadRef,
    hitCanvasRef,
    mapHexes,
    randomIdRef,
    cameraRef,
    playerNation,
    roads,
    buildRoads,
    d,
  } = ctx;

  if (buildMode === "road" && !mouseDownRef.current && roadStartRef.current) {
    const hitCanvas = hitCanvasRef.current;
    const map = mapHexesRef.current;
    const tempRoadArray = tempRoadRef.current;

    if (!hitCanvas || !map) return;
    if (!mapHexes) return;
    if (!randomIdRef.current) return;
    if (!tempRoadRef.current || !tempRoadArray) return;

    const rect = hitCanvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const camera = cameraRef.current;
    const worldX = (mouseX - hitCanvas.width / 2) / camera.zoom - camera.x;
    const worldY = (mouseY - hitCanvas.height / 2) / camera.zoom - camera.y;

    const { hex } = pixelToHex({ x: worldX, y: worldY, mapHexes: map });

    // --- CHECKS ---
    if (!hex) return;
    // return if player doesn't own this hex
    if (hex.owner !== playerNation?.id) return;

    // --- RESET BACK TO HEX IF IT ALREADY EXISTS ---
    const points = tempRoadArray.points;

    // найти индекс хекса в дороге
    const idx = points.findIndex((p) => p.q === hex.q && p.r === hex.r);

    // если этот хекс уже есть в дороге
    if (idx !== -1) {
      // если это последний — ничего не делаем
      if (idx === points.length - 1) {
        return;
      }

      // иначе откатываем дорогу до него
      points.splice(idx + 1);
      return;
    }

    // --- FILL GAPS BETWEEN HEXES ---
    const neighborIds = findNeighbors(hex, mapHexes).map((n) => n.id);

    // check if last added hex does not border with current hex
    const currPoint = { q: hex.q, r: hex.r };
    const lastPoint = tempRoadArray.points[tempRoadArray.points.length - 1];
    const lastHexOfRoad = getHexByAxial(lastPoint.q, lastPoint.r, mapHexes);
    if (!lastHexOfRoad) return;

    // prevent building road if any road already includes the combination of this and last added point (including temp roads)
    const roadsCopy = roads.map((r) => ({
      ...r,
      points: r.points.map((p) => ({ ...p })),
    }));
    buildRoads.forEach((obj) =>
      roadsCopy.push({
        id: obj.id,
        constructing: null,
        points: obj.points.map((p) => ({ ...p, isConstructing: true })),
      })
    ); // add queued roads too
    for (const road of roadsCopy) {
      // return if any road already has those two points in a row
      if (hasSegment(road, currPoint, lastPoint)) {
        return;
      }
    }

    if (!neighborIds.includes(lastHexOfRoad.id)) {
      // fill distance with hex path

      const path = findHexPathBetween(
        { q: lastHexOfRoad.q, r: lastHexOfRoad.r },
        { q: hex.q, r: hex.r }
      );

      // check if those hexes lay only on owned provinces
      for (const axialObj of path) {
        const missingHex = getHexByAxial(axialObj.q, axialObj.r, mapHexes);
        if (!missingHex) continue;
        if (missingHex.owner !== playerNation.id) return;
        const idx = path.findIndex((a) => a.q === axialObj.q && a.r === axialObj.r);

        const point = { q: axialObj.q, r: axialObj.r };
        const nextPoint = path[idx + 1];
        if (nextPoint) {
          for (const road of roadsCopy) {
            if (hasSegment(road, point, nextPoint)) return;
          }
        }
      }
      // remove first and last points (duplicates)
      path.slice(1, -1);

      const missingHexes: Hex[] = [];
      path.forEach((axialObj) => {
        const missingHex = getHexByAxial(axialObj.q, axialObj.r, mapHexes);
        if (!missingHex) return;
        missingHexes.push(missingHex);

        // add missing hex coordinates to road object
        tempRoadArray.points.push({
          q: missingHex.q,
          r: missingHex.r,
          d1: randomNumber(d.a, d.b),
          d2: randomNumber(d.a, d.b),
        });
      });
    }

    tempRoadArray.points.push({
      q: hex.q,
      r: hex.r,
      d1: randomNumber(d.a, d.b),
      d2: randomNumber(d.a, d.b),
    });
  }
}
