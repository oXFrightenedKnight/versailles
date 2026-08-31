"use client";

import { Progress } from "@/components/ui/progress";
import { BuildingIcons } from "@/lib/construction/presentation";
import { RoadConstructionProjection } from "@/lib/UI/mergeData/construction/types";
import { Hammer, Hash, X } from "lucide-react";

export default function ConstructingRoad({
  projection,
  handleRoadCancel,
}: {
  projection: RoadConstructionProjection;
  handleRoadCancel: (projection: RoadConstructionProjection) => void;
}) {
  const Icon = BuildingIcons["road"];

  return (
    <div className="w-full h-[75px] flex justify-center items-center text-white">
      <div className="flex flex-row w-full h-full bg-gray-900 rounded-md p-1 gap-1">
        {/* Display City Name/HexId */}
        <div className="flex flex-col justify-center items-center p-1 w-1/5 bg-gray-800 rounded-md">
          <span>{projection.hexIds[0] ?? 0}...</span>
          <span>...{projection.hexIds.at(-1) ?? 0}</span>
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
              <Progress
                className="bg-gray-600"
                value={projection.source === "server" ? projection.progress : 0}
              ></Progress>
            </div>

            <div className="flex bg-gray-900 border border-gray-600 p-1 gap-1 rounded-md text-amber-200 justify-center items-center w-full h-[50%]">
              <Hash className="w-5 h-5 shrink-0"></Hash>
              <span className="text-md text-white">{projection.constructingPoints}</span>
            </div>
          </div>

          <div
            className="flex bg-gray-900 border border-gray-600 p-1 gap-1 rounded-md text-amber-200 h-full justify-center items-center"
            onClick={() => {
              handleRoadCancel(projection);
            }}
          >
            <X className="w-6 h-6 shrink-0"></X>
          </div>
        </div>
      </div>
    </div>
  );
}
