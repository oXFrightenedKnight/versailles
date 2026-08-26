"use client";

import BuildingMenu from "@/components/buildingConfig/buildingMenu";
import { CloseButton } from "@/components/GameComponents/buttons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getNationFlagURL, OpenMenus } from "@/lib/data";
import { getNationName } from "@/lib/helpers/nations";
import { useGameStore } from "@/lib/stores/gameStore";
import { useIntentStore } from "@/lib/stores/intentStore";
import { selectBuildings } from "@/lib/UI/mergeData/buildings/selectors";
import Image from "next/image";
import NoBuilding from "../../buildingConfig/noBuilding";
import { Hex } from "@repo/shared";
import { getBuilding, getBuildingName } from "@repo/shared/buildings";

export default function ProvinceInfoSidebar({
  selectedHex,
  isContractSelected,
  setIsContractSelected,
  setOpenMenu,
}: {
  selectedHex: Hex | null;
  isContractSelected: boolean;
  setIsContractSelected: React.Dispatch<React.SetStateAction<boolean>>;
  setOpenMenu: React.Dispatch<React.SetStateAction<OpenMenus>>;
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

  if (!selectedHex) return null;

  return (
    <div className="h-[90%] w-full absolute left-0 bottom-0 p-2 slide-in">
      <div className="flex flex-col justify-between items-center h-full w-full bg-gray-800 rounded-xl pointer-events-auto p-2 gap-2">
        <div className="flex flex-col w-full h-[30%] min-h-20 justify-between bg-gray-900 rounded-lg shadow-md shadow-black">
          <div className="flex w-full min-w-0 flex-1 justify-between items-start">
            <div className="w-[50%] min-w-0 min-h-0 shrink bg-amber-200 m-2 rounded-[5px] overflow-hidden">
              <Image
                src={getNationFlagURL(selectedHex?.owner ?? "tribes")}
                alt="nation flag"
                width={1463}
                height={962}
                className="w-full h-auto p-px rounded-xl object-contain"
              ></Image>
            </div>
            <CloseButton
              onClose={() => {
                setOpenMenu("none");
              }}
            ></CloseButton>
          </div>

          <p className="text-2xl text-white flex items-center justify-start p-2 w-full">
            {getNationName({ id: selectedHex?.owner ?? "tribes" })}
          </p>
        </div>
        <div className="w-full h-[70%] min-h-20">
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
        <div className="w-full h-[20%] min-h-15">
          <div className="w-full h-full flex flex-col justify-center gap-2">
            <div className="bg-gray-900 shadow-md shadow-black rounded-lg text-white h-full flex justify-around items-center text-2xl w-full">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-[50%] h-full p-2 flex justify-center items-center">
                    <div className="rounded-md bg-gray-800 text-white flex justify-center items-center gap-0 text-2xl w-full h-full">
                      <span>{selectedHex?.population ?? 999}</span>
                      <Image
                        src="/icons/population.png"
                        alt="population icon"
                        width={48}
                        height={32}
                        className="w-9 h-7"
                      ></Image>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <span>{`Hex population: ${selectedHex?.population ?? 999}`}</span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex-1 min-w-0 h-full min-h-0 p-2 group relative">
                    <Image
                      src={`/biome_type/${selectedHex ? selectedHex.biome : "plains"}.png`}
                      alt="biome type"
                      fill
                      className=" object-contain p-2"
                    ></Image>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <span>{`Biome: ${selectedHex?.biome}`}</span>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
