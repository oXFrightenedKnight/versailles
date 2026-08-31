"use client";

import { CloseButton } from "@/components/game/ui/buttons";
import { useGameStore } from "@/lib/stores/gameStore";
import { useIntentStore } from "@/lib/stores/intentStore";
import { BuildModeType } from "@/lib/types/game";
import {
  cancelRoadConstruction,
  selectRoadConstructions,
} from "@/lib/UI/mergeData/construction/roadSelectors";
import {
  cancelBuildingConstruction,
  selectBuildingConstructions,
} from "@/lib/UI/mergeData/construction/selectors";
import {
  BuildingConstructionProjection,
  RoadConstructionProjection,
} from "@/lib/UI/mergeData/construction/types";
import { ALL_BUILDING_CATEGORIES, BUILDINGS_CATEGORY } from "@repo/shared/buildings";
import React, { useCallback } from "react";
import ConstructingBuilding from "./ConstructingBuilding";
import ConstructingRoad from "@/components/game/construction/RoadConstructing";
import ToggleBuilding from "@/components/game/construction/ToggleBuilding";
import { OpenMenus } from "@/lib/types/navigation";
import { BuildingDescriptions, BuildingIcons } from "@/lib/construction/presentation";

export default function BuildMenu({
  setOpenMenu,
  setBuildMode,
  buildMode,
}: {
  setOpenMenu: React.Dispatch<React.SetStateAction<OpenMenus>>;
  setBuildMode: React.Dispatch<React.SetStateAction<BuildModeType>>;
  buildMode: BuildModeType;
}) {
  function handleModeChange(mode: BuildModeType) {
    if (buildMode === mode) {
      setBuildMode("none");
    } else {
      setBuildMode(mode);
    }
  }
  const categories: ("road" | BUILDINGS_CATEGORY)[] = [...ALL_BUILDING_CATEGORIES, "road"];

  // Display server + client constructing buildings
  const mapHexes = useGameStore((s) => s.mapHexes);
  const buildings = useGameStore((s) => s.buildings);
  const roads = useGameStore((s) => s.roads);
  const playerNation = useGameStore((s) => s.playerNation);

  const actions = useIntentStore((s) => s.gameActions);
  const createGameAction = useIntentStore((s) => s.createGameAction);
  const deleteGameAction = useIntentStore((s) => s.deleteGameAction);

  // --- BUILDINGS ---
  const constructing = selectBuildingConstructions(mapHexes, buildings, playerNation?.id, actions);
  const playerConstructions = playerNation
    ? constructing.filter((c) => c.ownerId === playerNation.id)
    : [];
  const cancelConstruction = useCallback(
    (projection: BuildingConstructionProjection) => {
      cancelBuildingConstruction(projection, createGameAction, deleteGameAction);
    },
    [createGameAction, deleteGameAction]
  );

  // --- ROADS ---
  const constructingRoads = selectRoadConstructions(mapHexes, roads, playerNation?.id, actions);
  const playerRoads = playerNation
    ? constructingRoads.filter((r) => r.ownerId === playerNation.id)
    : [];
  const cancelConstructingRoad = useCallback(
    (projection: RoadConstructionProjection) => {
      cancelRoadConstruction(projection, createGameAction, deleteGameAction);
    },
    [createGameAction, deleteGameAction]
  );

  return (
    <>
      <div className="h-[90%] w-full left-0 absolute bottom-0 p-2 slide-in">
        <div className="flex flex-col items-center h-full w-full bg-gray-800 rounded-xl pointer-events-auto p-2 gap-2">
          <div className="w-full flex justify-between items-center bg-gray-900 shadow-md shadow-black rounded-[8px] pl-2">
            <p className="text-white text-2xl">Build</p>
            <CloseButton
              onClose={() => {
                setOpenMenu("none");
                setBuildMode("none");
              }}
            ></CloseButton>
          </div>
          <div className="w-full flex justify-between items-center bg-gray-900 shadow-md shadow-black rounded-[8px]">
            <div className="grid grid-cols-3 w-full">
              {categories.map((c, key) => (
                <ToggleBuilding
                  key={key}
                  handleModeChange={handleModeChange}
                  icon={BuildingIcons[c] ?? "Hotel"}
                  descText={BuildingDescriptions[c] ?? `Construct ${c}`}
                  buildMode={buildMode}
                  toggleMode={c}
                ></ToggleBuilding>
              ))}
            </div>
          </div>
          <div className="w-full h-[70%] flex flex-col justify-start items-center  bg-gray-900 shadow-md shadow-black rounded-[8px] overflow-y-auto no-scrollbar gap-2">
            <div
              className={`flex flex-col gap-2 w-full ${constructing.length > 0 && playerRoads.length > 0 ? "border-b pb-2" : ""}`}
            >
              {playerConstructions.map((p) => (
                <ConstructingBuilding
                  key={p.key}
                  projection={p}
                  onCancel={cancelConstruction}
                ></ConstructingBuilding>
              ))}
            </div>

            <div className="flex flex-col gap-2 w-full">
              {playerRoads.map((p) => (
                <ConstructingRoad
                  key={p.key}
                  projection={p}
                  handleRoadCancel={cancelConstructingRoad}
                ></ConstructingRoad>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
