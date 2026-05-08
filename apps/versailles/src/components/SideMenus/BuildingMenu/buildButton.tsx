"use client";

import { X } from "lucide-react";
import { ALL_BUILDING_CATEGORIES, BUILDINGS_CATEGORY } from "@repo/shared";
import ToggleBuilding from "./ToggleBuilding";
import { BuildingDescriptions, BuildingIcons, OpenMenus } from "@/lib/data";
import { BuildModeType } from "@/lib/types/game";
import { useGameStore } from "@/lib/stores/gameStore";
import { mergeConstructingBuildings } from "@/lib/UI/mergeData/uiBuildings";
import { useIntentStore } from "@/lib/stores/intentStore";
import ConstructingBuilding from "./ConstructingBuilding";
import { mergeBuildingRoads } from "@/lib/UI/mergeData/uiRoads";
import ConstructingRoad from "./RoadConstructing";
import React from "react";

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
  const buildBuildings = useIntentStore((s) => s.buildBuildings);
  const serverCancelBuilding = useIntentStore((s) => s.serverCancelBuilding);

  const uiConstructing = mergeConstructingBuildings(mapHexes, serverCancelBuilding, buildBuildings);

  // --- ROADS ---
  const roads = useGameStore((s) => s.roads);
  const cancelRoadServer = useIntentStore((s) => s.serverCancelRoadBuilding);
  const buildRoads = useIntentStore((s) => s.buildRoads);

  const buildingRoads = mergeBuildingRoads(roads, mapHexes, cancelRoadServer, buildRoads);

  return (
    <>
      <div className="h-[90%] w-full left-0 absolute bottom-0 p-2">
        <div className="flex flex-col items-center h-full w-full bg-gray-800 rounded-xl pointer-events-auto p-2 gap-2">
          <div className="w-full flex justify-between items-center bg-gray-900 shadow-md shadow-black rounded-[8px] pl-2">
            <p className="text-white text-2xl">Build</p>
            <div
              className="flex justify-center items-center p-1 border-gray-700 border rounded-[8px] m-2 bg-gray-900 shadow-md shadow-black"
              onClick={() => {
                setOpenMenu("none");
                setBuildMode("none");
              }}
            >
              <X className="w-10 h-10 text-gold-1"></X>
            </div>
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
              className={`flex flex-col gap-2 w-full ${uiConstructing.length > 0 && buildingRoads.length > 0 ? "border-b pb-2" : ""}`}
            >
              {uiConstructing.map((c, key) => (
                <ConstructingBuilding building={c} key={key}></ConstructingBuilding>
              ))}
            </div>

            <div className="flex flex-col gap-2 w-full">
              {buildingRoads.map((r, key) => (
                <ConstructingRoad road={r} key={key}></ConstructingRoad>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
