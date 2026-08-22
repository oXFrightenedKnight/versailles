"use client";

import BuildingMenu from "@/components/buildingConfig/buildingMenu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getNationName } from "@/lib/helpers/nations";
import { Hex } from "@repo/shared/data/hex_map";
import { getBuilding, getBuildingName } from "@repo/shared/helpers/buildings";
import { X } from "lucide-react";
import Image from "next/image";
import NoBuilding from "../../buildingConfig/noBuilding";
import { useGameStore } from "@/lib/stores/gameStore";
import { selectBuildings } from "@/lib/UI/mergeData/buildings/selectors";
import { useIntentStore } from "@/lib/stores/intentStore";
import { getNationFlagURL } from "@/lib/data";

export default function ProvinceInfoSidebar({
  selectedHex,
  isContractSelected,
  setIsContractSelected,
}: {
  selectedHex: Hex | null;
  isContractSelected: boolean;
  setIsContractSelected: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const serverBuildings = useGameStore((s) => s.buildings);

  const gameActions = useIntentStore((s) => s.gameActions);
  const buildings = selectBuildings(serverBuildings, gameActions);

  const buildingData = selectedHex?.buildingId
    ? (getBuilding({ buildings, id: selectedHex.buildingId }) ?? null)
    : null;
  const buildingName = buildingData?.category
    ? getBuildingName(buildingData.category, buildingData.level)
    : "empty";

  const building = buildings.find((b) => b.id === selectedHex?.buildingId);

  function renderBuildingButtons() {
    if (!buildingData || !building) return <NoBuilding></NoBuilding>;

    return (
      <BuildingMenu
        building={building}
        isContractSelected={isContractSelected}
        setIsContractSelected={setIsContractSelected}
      ></BuildingMenu>
    );
  }

  return (
    <div className="h-[90%] w-full absolute left-0 bottom-0 p-2">
      <div className="flex flex-col justify-between items-center h-full w-full bg-gray-800 rounded-xl pointer-events-auto p-2 gap-2">
        <div className="flex flex-col w-full justify-between bg-gray-900 rounded-lg shadow-md shadow-black">
          <div className="flex w-full justify-between items-start">
            <div className="w-[50%] h-auto bg-amber-200 m-2 rounded-[5px]">
              <Image
                src={getNationFlagURL(selectedHex?.owner ?? "tribes")}
                alt="nation flag"
                width={1463}
                height={962}
                className="w-full h-full p-px rounded-xl"
              ></Image>
            </div>
            <div className="flex justify-center items-center p-1 border-gray-700 border rounded-xl m-2 bg-gray-900 shadow-md shadow-black">
              <X className="w-10 h-10 text-amber-200 "></X>
            </div>
          </div>

          <p className="text-2xl text-white flex items-center justify-start p-2 w-full">
            {getNationName({ id: selectedHex?.owner ?? "tribes" })}
          </p>
        </div>
        <div className="w-full h-[70%] min-h-0">
          <div className="w-full h-full flex flex-col justify-center gap-2">
            <div className="bg-gray-900 shadow-md shadow-black rounded-lg text-white h-full flex justify-center items-center text-md w-full">
              <div className="w-full h-full flex flex-col justify-start p-2 gap-2">
                <div>Building Configuration</div>
                <div className="w-full h-full flex flex-col gap-2 min-h-0">
                  {renderBuildingButtons()}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full h-[40%]">
          <div className="w-full h-full flex flex-col justify-center gap-2">
            <div className="bg-gray-900 shadow-md shadow-black rounded-lg text-white h-full flex justify-center items-center text-2xl w-full">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-[50%] h-auto p-2 group relative">
                    <Image
                      src={`/urban/${buildingName}.png`}
                      alt="urban type"
                      width={1482}
                      height={972}
                      className="w-full h-full"
                    ></Image>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <span>{`Urban Type: ${buildingName}`} </span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-[50%] h-auto p-2 group relative">
                    <Image
                      src={`/biome_type/${selectedHex ? selectedHex.biome : "plains"}.png`}
                      alt="biome type"
                      width={1482}
                      height={972}
                      className="w-full h-full"
                    ></Image>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <span>{`Biome: ${selectedHex?.biome}`}</span>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="bg-gray-900 shadow-md shadow-black rounded-lg text-white h-full flex justify-center items-center text-2xl">
              {selectedHex?.population ?? 999}
              <Image
                src="/icons/population.png"
                alt="population icon"
                width={48}
                height={32}
                className="w-9 h-7"
              ></Image>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
