"use client";

import { BuildingIcons } from "@/lib/data";
import { Progress } from "../ui/progress";
import {
  BuildingConstructionVM,
  cancelClientBuildingIntent,
  cancelServerBuildingIntent,
} from "@/lib/helpers/uiBuildings";
import { Hammer, SquareArrowUp, X } from "lucide-react";
import { BUILDINGS, findBuildingNameByCategory, getBuilding } from "@repo/shared";
import { useGameStore } from "@/lib/gameStore";
import { useCallback } from "react";

export default function ConstructingBuilding({ building }: { building: BuildingConstructionVM }) {
  const mapHexes = useGameStore((s) => s.mapHexes);
  const buildings = useGameStore((s) => s.buildings);

  const Icon = BuildingIcons[building.buildingType];
  const hex = mapHexes.find((h) => h.id === building.hexId);

  // find buildCost of next level of this building category and compare to current progress
  const existingBuilding =
    hex && hex?.buildingId ? getBuilding({ buildings, id: hex.buildingId }) : null;

  const name = findBuildingNameByCategory({
    buildingCategory: building.buildingType,
    level: existingBuilding?.level ? existingBuilding.level + 1 : 1,
  });

  const progress = (building.progress / BUILDINGS[name].buildTime) * 100;

  // FUNCTIONS
  const cancelMergedConstruction = useCallback(() => {
    if (building.fromServer) {
      cancelServerBuildingIntent(building.hexId);
    } else {
      cancelClientBuildingIntent(building.hexId);
    }
  }, [building]);

  return (
    <div className="w-full h-[75px] flex justify-center items-center text-white">
      <div className="flex flex-row w-full h-full bg-gray-900 rounded-md p-1 gap-1">
        {/* Display City Name/HexId */}
        <div className="flex justify-center items-center p-1 w-1/5 bg-gray-800 rounded-md">
          {building.hexId}
        </div>
        {/* Icon, progress and to which level the building is being built */}
        <div className="flex justify-between items-center w-full gap-2 p-2 bg-gray-800 rounded-md">
          <div className="flex bg-gray-900 border border-gray-600 p-1 rounded-md text-amber-200 h-full w-[25%] shrink-0 relative justify-center items-center">
            <Icon className=" w-6 h-6 text-amber-200 shrink-0"></Icon>
            <div className="absolute bottom-0.5 right-0.5 border border-gray-600 rounded-[6px] flex justify-center items-center w-4 h-4 bg-gray-800">
              <Hammer className=" w-full h-full"></Hammer>
            </div>
            {/* Uncomment when you fix tailwind/css rendering issue */}
          </div>

          <div className="flex flex-col w-full h-full justify-between items-center gap-1">
            <div className=" flex justify-center items-center w-full h-[50%]">
              <Progress className="bg-gray-600" value={progress}></Progress>
            </div>

            <div className="flex bg-gray-900 border border-gray-600 p-1 gap-1 rounded-md text-amber-200 justify-center items-center w-full h-[50%]">
              <SquareArrowUp className="w-5 h-5 shrink-0"></SquareArrowUp>
              <span className="text-md text-white">{building.levelsToUpgrade}</span>
            </div>
          </div>

          <div
            className="flex bg-gray-900 border border-gray-600 p-1 gap-1 rounded-md text-amber-200 h-full justify-center items-center"
            onClick={() => {
              cancelMergedConstruction();
            }}
          >
            <X className="w-6 h-6 shrink-0"></X>
          </div>
        </div>
      </div>
    </div>
  );
}
