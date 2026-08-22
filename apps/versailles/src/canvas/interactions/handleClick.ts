import { getBuildingCost, isBuildingCategory } from "@/lib/helpers/buildings";
import { getExportedResourcesToBuilding } from "@/lib/helpers/contracts";
import { getHexById } from "@/lib/helpers/hexes";
import { createNewPopup } from "@/lib/helpers/popups";
import { RoadDraft } from "@/lib/types/game";
import {
  cancelArmyMove,
  createArmyMove,
  selectArmyMoves,
} from "@/lib/UI/mergeData/armyMove/selectors";
import { createBuildRoad } from "@/lib/UI/mergeData/construction/roadSelectors";
import {
  createBuildingConstruction,
  selectBuildingConstructions,
} from "@/lib/UI/mergeData/construction/selectors";
import { createContract } from "@/lib/UI/mergeData/contracts/selectors";
import { RenderRoad } from "@/lib/UI/mergeData/roads(belongs render)/types";
import {
  calculateRoadCost,
  findNeighbors,
  generateRoadDs,
  getAvailableResources,
  getBuilding,
  getBuildingConfig,
  getHexByAxial,
  getNationArmyInHex,
  hasSegment,
  Hex,
  HEX_DIRECTIONS,
  startDijkstrasAlgo,
  topLevelsByCategory,
} from "@repo/shared";
import { eventToWorldPoint } from "../coordinates";
import { pixelToHex } from "../render/render";
import { CanvasCommands, CanvasRuntime, CanvasSnapshot } from "../types";

export function handleCanvasClick({
  event,
  runtime,
  snapshot,
  commands,
}: {
  event: MouseEvent;
  runtime: CanvasRuntime;
  snapshot: CanvasSnapshot;
  commands: CanvasCommands;
}) {
  const world = eventToWorldPoint(event, runtime);

  const { hex } = pixelToHex({
    x: world.x,
    y: world.y,
    mapHexes: snapshot.mapHexes,
  });

  if (!hex) return;

  if (event.button === 2) {
    handleRightClick({
      hex,
      snapshot,
      commands,
    });

    return;
  }

  if (snapshot.buildMode === "road") {
    handleRoadClick({
      hex,
      runtime,
      snapshot,
      commands,
    });

    return;
  }

  if (snapshot.buildMode !== "none") {
    handleBuildingClick({
      hex,
      snapshot,
      commands,
    });

    return;
  }

  if (snapshot.isContractSelected) {
    handleContractClick({
      hex,
      snapshot,
      commands,
    });

    return;
  }

  commands.selectHex(hex);
  if (snapshot.playerNation) {
    const playerArmy = getNationArmyInHex(hex, snapshot.playerNation.id);
    commands.setBarValue(Math.max(0, Math.round(playerArmy / 2)));
  }
}

// RIGHT CLICK
function handleRightClick({
  hex,
  snapshot,
  commands,
}: {
  hex: Hex;
  snapshot: CanvasSnapshot;
  commands: CanvasCommands;
}) {
  if (snapshot.selectedHexId === null || !snapshot.playerNation) return;
  const selectedHex = getHexById(snapshot.selectedHexId, snapshot.mapHexes);

  if (snapshot.selectedHexId === hex.id || !selectedHex) return;

  if (
    !HEX_DIRECTIONS.some(
      (dir) => dir.dq === selectedHex.q - hex.q && dir.dr === selectedHex.r - hex.r
    )
  )
    return;

  const playerArmyInHex = getNationArmyInHex(selectedHex, snapshot.playerNation.id);

  const armyMoves = selectArmyMoves(snapshot.gameActions);

  const dir = { dq: hex.q - selectedHex.q, dr: hex.r - selectedHex.r };
  const existingIntent = armyMoves.find(
    (a) => a.hexId === selectedHex.id && a.direction.dq === dir.dq && a.direction.dr === dir.dr
  );

  if (!existingIntent) {
    if (snapshot.barValue <= 0) return;

    const newAvailable = playerArmyInHex - snapshot.barValue;
    commands.setBarValue(Math.min(snapshot.barValue, newAvailable));

    // USE createArmyMove function
    createArmyMove(
      {
        direction: dir,
        amount: snapshot.barValue,
        hexId: selectedHex.id,
        nationId: snapshot.playerNation.id,
      },
      commands.createGameAction
    );
  } else {
    // if already had intent to move, then cancel army move intent
    cancelArmyMove(existingIntent.actionId, commands.deleteGameAction);

    const totalArmy = playerArmyInHex + existingIntent.amount;
    commands.setBarValue(Math.min(totalArmy, snapshot.barValue));
  }
}

export function handleBarDrag({
  event,
  snapshot,
  barElement,
  commands,
}: {
  event: MouseEvent;
  snapshot: CanvasSnapshot;
  barElement: HTMLDivElement | null;
  commands: CanvasCommands;
}) {
  // Dragging bar

  if (!snapshot.barDragging || !barElement) return;

  const rect = barElement.getBoundingClientRect();
  if (!rect) return;

  if (snapshot.selectedHexId === null) return;

  const playerNation = snapshot.playerNation;
  const selectedHex = getHexById(snapshot.selectedHexId, snapshot.mapHexes);
  if (!selectedHex || !playerNation) return;

  const availableArmy = getNationArmyInHex(selectedHex, playerNation.id);

  const mouseX = event.clientX - rect.left;
  const step = Math.min(availableArmy, 5); // set 5 as a default step
  const value = (mouseX / rect.width) * availableArmy;
  const snappedValue = Math.round(value / step) * step;

  commands.setBarValue(Math.max(0, Math.min(availableArmy, snappedValue)));
}

export function handleRoadDrag({
  event,
  runtime,
  snapshot,
}: {
  event: MouseEvent;
  runtime: CanvasRuntime;
  snapshot: CanvasSnapshot;
}) {
  if (snapshot.buildMode !== "road") {
    return;
  }

  // Camera is currently being clicked or dragged.
  if (runtime.pointer.isDown) {
    return;
  }

  const draft = runtime.road.draft;
  const playerNation = snapshot.playerNation;

  if (!draft || !playerNation) {
    return;
  }

  const world = eventToWorldPoint(event, runtime);

  const { hex } = pixelToHex({
    x: world.x,
    y: world.y,
    mapHexes: snapshot.mapHexes,
  });

  if (!hex || !snapshot.playerNation) {
    return;
  }

  if (hex.owner !== snapshot.playerNation.id) {
    return;
  }

  updateRoadDraft({
    draft,
    targetHex: hex,
    mapHexes: snapshot.mapHexes,
    existingRoads: snapshot.roads,
    playerNationId: playerNation.id,
  });
}

export function updateRoadDraft({
  draft,
  targetHex,
  mapHexes,
  existingRoads,
  playerNationId,
}: {
  draft: RoadDraft;
  targetHex: Hex;
  mapHexes: Hex[];
  existingRoads: RenderRoad[];
  playerNationId: string;
}) {
  // --- RESET BACK TO HEX IF IT ALREADY EXISTS ---
  const points = draft.points;

  // find hex index in road
  const idx = points.findIndex((p) => p.q === targetHex.q && p.r === targetHex.r);

  // if this hex is already in road
  if (idx !== -1) {
    // if its last - don't do anything
    if (idx === points.length - 1) {
      return;
    }

    // otherwise rollback road back to it
    points.splice(idx + 1);
    return;
  }

  // --- FILL GAPS BETWEEN HEXES ---
  const neighborIds = findNeighbors(targetHex, mapHexes).map((n) => n.id);

  // check if last added hex does not border with current hex
  const currPoint = { q: targetHex.q, r: targetHex.r };
  const lastPoint = points.at(-1);
  if (!lastPoint) return;

  const lastHexOfRoad = getHexByAxial(lastPoint.q, lastPoint.r, mapHexes);
  if (!lastHexOfRoad) return;

  // prevent building road if any road already includes the combination of this and last added point (including temp roads)
  const roadsByPoints = existingRoads.map((r) => ({
    points: r.points.map((p) => ({ q: p.q, r: p.r })),
  }));
  for (const roadPoints of roadsByPoints) {
    // return if any road already has those two points in a row
    if (hasSegment(roadPoints.points, currPoint, lastPoint)) {
      return;
    }
  }

  if (!neighborIds.includes(lastHexOfRoad.id)) {
    // fill distance with hex path

    const path =
      startDijkstrasAlgo({
        startingHex: lastHexOfRoad,
        endHex: targetHex,
        mapHexes: mapHexes,
        roads: existingRoads,
      }) ?? [];

    // check if those hexes lay only on owned provinces
    for (const axialObj of path) {
      const missingHex = getHexByAxial(axialObj.q, axialObj.r, mapHexes);
      if (!missingHex) continue;
      if (missingHex.owner !== playerNationId) return;
      const idx = path.findIndex((a) => a.q === axialObj.q && a.r === axialObj.r);

      const point = { q: axialObj.q, r: axialObj.r };
      const nextPoint = path[idx + 1];
      if (nextPoint) {
        for (const roadPoints of roadsByPoints) {
          if (hasSegment(roadPoints.points, point, nextPoint)) return;
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

      const { d1, d2 } = generateRoadDs();

      // add missing hex coordinates to road object
      draft.points.push({
        q: missingHex.q,
        r: missingHex.r,
        d1,
        d2,
      });
    });
  }

  const { d1, d2 } = generateRoadDs();
  draft.points.push({
    q: targetHex.q,
    r: targetHex.r,
    d1,
    d2,
  });
}

function handleRoadClick({
  hex,
  runtime,
  snapshot,
  commands,
}: {
  hex: Hex;
  runtime: CanvasRuntime;
  snapshot: CanvasSnapshot;
  commands: CanvasCommands;
}) {
  // check if clicked hex belongs to player
  if (hex.owner !== snapshot.playerNation?.id) return;

  // set selected hex to be road start
  if (runtime.road.startHexId === null) {
    runtime.road.startHexId = hex.id;

    const d = generateRoadDs();

    // push starting roadObject to array
    runtime.road.draft = {
      id: crypto.randomUUID(),
      points: [{ q: hex.q, r: hex.r, d1: d.d1, d2: d.d2 }],
    };
  } else {
    // add logic to submit the road from temp to actual array and clean up
    const roadToCommit = runtime.road.draft;
    if (!roadToCommit) return;

    const cost = calculateRoadCost(roadToCommit.points.length);
    if (snapshot.effectiveResources["gold"] ?? 0 >= cost) {
      if (roadToCommit && runtime.road.startHexId !== hex.id) {
        createBuildRoad(
          {
            points: roadToCommit.points.map((p) => ({ ...p, isConstructing: true })),
            cost: { gold: cost },
          },
          commands.createGameAction
        );
      }
    } else {
      createNewPopup(commands.setPopup, "missing_gold");
    }

    // cleanup
    runtime.road.startHexId = null;
    runtime.road.draft = null;
    commands.setBuildMode("none");
  }
}

function handleBuildingClick({
  hex,
  snapshot,
  commands,
}: {
  hex: Hex;
  snapshot: CanvasSnapshot;
  commands: CanvasCommands;
}) {
  // return if hex doesn't belong to player or build mode doesn't match
  if (hex.owner !== snapshot.playerNation?.id) return;
  // check if buildMode is one of the building categories
  if (!isBuildingCategory(snapshot.buildMode)) return;

  // These are current queued building objects on client and server in that hex
  const buildingOfHex = hex.buildingId
    ? getBuilding({ buildings: snapshot.buildings, id: hex.buildingId })
    : undefined;
  const optimisticConstruction = selectBuildingConstructions(
    snapshot.mapHexes,
    snapshot.buildings,
    snapshot.playerNation.id,
    snapshot.gameActions
  );
  const constructingBuilding = optimisticConstruction.find((obj) => obj.hexId === hex.id);

  const queuedLevels = constructingBuilding?.totalLevels ?? 0;
  const currentLevel = buildingOfHex?.level ? buildingOfHex.level : 0;

  // if there is a building queued or built already and its type doesn't match - skip
  if (constructingBuilding && constructingBuilding.buildingType !== snapshot.buildMode) {
    createNewPopup(commands.setPopup, "building_type_mismatch");
    return;
  }
  if (buildingOfHex && buildingOfHex.category !== snapshot.buildMode) {
    createNewPopup(commands.setPopup, "building_type_mismatch");
    return;
  }

  const total = queuedLevels + currentLevel;
  const max = topLevelsByCategory.find((l) => l.category === snapshot.buildMode)?.level ?? Infinity;
  // if no max level was found, default to infinity

  // if the total level of built + in progress + new one is above max - skip
  if (total + 1 > max) {
    createNewPopup(commands.setPopup, "max_level_reached");
    return;
  }

  // check cost
  const cost = getBuildingCost(snapshot.buildMode, total + 1);

  if ((snapshot.effectiveResources.gold ?? 0) < cost) {
    createNewPopup(commands.setPopup, "missing_gold");
    return;
  }

  createBuildingConstruction(
    {
      hexId: hex.id,
      levels: 1,
      category: snapshot.buildMode,
      cost: { gold: cost },
    },
    snapshot.gameActions,
    commands.createGameAction,
    commands.updateGameAction
  );
}

function handleContractClick({
  hex,
  snapshot,
  commands,
}: {
  hex: Hex;
  snapshot: CanvasSnapshot;
  commands: CanvasCommands;
}) {
  if (snapshot.selectedHexId === null) return;
  const selectedHex = getHexById(snapshot.selectedHexId, snapshot.mapHexes);
  const startId = selectedHex?.buildingId;
  const endId = hex.buildingId;

  const belongToPlayer =
    selectedHex?.owner === snapshot.playerNation?.id && hex.owner === snapshot.playerNation?.id;

  if (startId && endId && belongToPlayer) {
    const startBuilding = getBuilding({ buildings: snapshot.buildings, id: startId });
    const endBuilding = getBuilding({ buildings: snapshot.buildings, id: endId });

    if (!startBuilding || !endBuilding) {
      commands.setContractSelected(false);
      return;
    }

    const startConfig = getBuildingConfig(startBuilding);
    const endConfig = getBuildingConfig(endBuilding);
    if (!startConfig || !endConfig) return;

    const exportedResources = getExportedResourcesToBuilding(
      snapshot.contracts,
      startBuilding.id,
      endBuilding.id
    );
    const producing = startConfig.producing ?? {};
    const consuming = endConfig.consuming ?? {};

    // merged Server and client contracts
    const availableResources = getAvailableResources([...exportedResources], producing, consuming);
    const resource = [...availableResources][0];
    if (!resource) {
      commands.setContractSelected(false);
      return;
    }

    // find path
    const pointHexMap = new Map(snapshot.mapHexes.map((h) => [`${h.q},${h.r}`, h]));
    const points = startDijkstrasAlgo({
      startingHex: selectedHex,
      endHex: hex,
      mapHexes: snapshot.mapHexes,
      roads: snapshot.roads,
    });
    if (!points) {
      commands.setContractSelected(false);
      return;
    } // don't add if path failed
    const hexIds: number[] = [];
    for (const point of points) {
      const hex = pointHexMap.get(`${point.q},${point.r}`);
      if (!hex) continue;

      hexIds.push(hex.id);
    }

    createContract(
      { startBuildingId: startId, endBuildingId: endId, amount: 0, resource, autoAdjust: true },
      commands.createGameAction
    );
  }
  commands.setContractSelected(false);
}
