"use client";

import { BuildingIcons } from "@/lib/data";
import { Progress } from "../ui/progress";
import { Hammer, Hash, X } from "lucide-react";
import { useGameStore } from "@/lib/gameStore";
import { useCallback } from "react";
import {
  cancelRoadBuildingClient,
  cancelRoadBuildingServer,
  RoadConstructionVM,
} from "@/lib/helpers/uiRoads";

export default function ConstructingRoad({ road }: { road: RoadConstructionVM }) {
  const mapHexes = useGameStore((s) => s.mapHexes);

  const Icon = BuildingIcons["road"];

  // progress is a value from 0 to 1 representing how
  // much of the total road has been completed
  const progress = (road.finsishedAmount / road.hexIds.length) * 100;

  const firstHex = mapHexes.find((h) => h.id === road.hexIds[0]);
  const lastHex = mapHexes.find((h) => h.id === road.hexIds.at(-1));

  // REPLACE LATER WHEN
  const finishedAmount = road.finsishedAmount;
  const leftAmount = road.hexIds.length - finishedAmount;

  // FUNCTIONS
  const cancelMergedConstruction = useCallback(() => {
    if (road.fromServer) {
      cancelRoadBuildingServer(road.id);
    } else {
      cancelRoadBuildingClient(road.id);
    }
  }, [road]);

  return (
    <div className="w-full h-[75px] flex justify-center items-center text-white">
      <div className="flex flex-row w-full h-full bg-gray-900 rounded-md p-1 gap-1">
        {/* Display City Name/HexId */}
        <div className="flex flex-col justify-center items-center p-1 w-1/5 bg-gray-800 rounded-md">
          <span>{firstHex?.id ?? 0}...</span>
          <span>...{lastHex?.id ?? 0}</span>
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
              <Hash className="w-5 h-5 shrink-0"></Hash>
              <span className="text-md text-white">{leftAmount}</span>
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
