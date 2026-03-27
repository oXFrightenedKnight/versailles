"use client";

import { getNationName, numberConverter } from "@/canvas/render";
import { Building, findBuildingNameByCategory, getBuilding, Hex } from "@repo/shared";
import { SquarePen, X } from "lucide-react";
import Image from "next/image";
import Tooltip from "./tooltip";
import { useState } from "react";
import { Contract } from "@/app/game/page";
import ContractBlock from "./Blocks/ContractBlock";
import FarmBlock from "./buildingConfig/farmBlock";
import CivilianBlock from "./buildingConfig/civilianBlock";
import BarrackBlock from "./buildingConfig/barrackBlock";
import LumberjackBlock from "./buildingConfig/lumberBlock";
import WatchtowerBlock from "./buildingConfig/watchtowerBlock";

export default function ProvinceInfoSidebar({
  selectedHex,
  buildings,
  isContractSelected,
  setIsContractSelected,
  contracts,
}: {
  selectedHex: Hex | null;
  buildings: Building[];
  isContractSelected: boolean;
  setIsContractSelected: React.Dispatch<React.SetStateAction<boolean>>;
  contracts: Contract[];
}) {
  const buildingData = selectedHex?.buildingId
    ? (getBuilding({ buildings, id: selectedHex.buildingId }) ?? null)
    : null;
  const buildingName = buildingData?.category
    ? findBuildingNameByCategory({
        buildingCategory: buildingData.category,
        level: buildingData.level,
      })
    : "empty";

  return (
    <div className="h-[90%] w-[20%] absolute left-0 bottom-0 p-2">
      <div className="flex flex-col justify-between items-center h-full w-full bg-gray-800 rounded-xl pointer-events-auto p-2 gap-2">
        <div className="flex flex-col w-full justify-between bg-gray-900 rounded-lg shadow-md shadow-black">
          <div className="flex w-full justify-between items-start">
            <div className="w-[50%] h-auto bg-amber-200 m-2 rounded-[5px]">
              <Image
                src={`/flags/${getNationName({ id: selectedHex?.owner ?? "tribes" })}_flag.png`}
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
                  {buildingData?.category === "FARM" ? (
                    <FarmBlock
                      contracts={contracts}
                      setIsContractSelected={setIsContractSelected}
                      isContractSelected={isContractSelected}
                      buildings={buildings}
                      farm={buildingData}
                    ></FarmBlock>
                  ) : buildingData?.category === "CIVILIAN" ? (
                    <CivilianBlock building={buildingData}></CivilianBlock>
                  ) : buildingData?.category === "BARRACK" ? (
                    <BarrackBlock building={buildingData}></BarrackBlock>
                  ) : buildingData?.category === "LUMBERJACK_SETTLEMENT" ? (
                    <LumberjackBlock
                      building={buildingData}
                      buildings={buildings}
                      contracts={contracts}
                      isContractSelected={isContractSelected}
                      setIsContractSelected={setIsContractSelected}
                    ></LumberjackBlock>
                  ) : buildingData?.category === "WATCHTOWER" ? (
                    <WatchtowerBlock building={buildingData}></WatchtowerBlock>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full h-[40%]">
          <div className="w-full h-full flex flex-col justify-center gap-2">
            <div className="bg-gray-900 shadow-md shadow-black rounded-lg text-white h-full flex justify-center items-center text-2xl w-full">
              <div className="w-[50%] h-auto p-2 group relative">
                <Image
                  src={`/urban/${buildingName}.png`}
                  alt="urban type"
                  width={1482}
                  height={972}
                  className="w-full h-full"
                ></Image>
                <Tooltip text={`Urban Type: ${buildingName}`} position="top"></Tooltip>
              </div>
              <div className="w-[50%] h-auto p-2 group relative">
                <Image
                  src={`/biome_type/${selectedHex ? selectedHex.biome : "plains"}.png`}
                  alt="biome type"
                  width={1482}
                  height={972}
                  className="w-full h-full"
                ></Image>
                <Tooltip text={`Biome: ${selectedHex?.biome}`} position="top"></Tooltip>
              </div>
            </div>
            <div className="bg-gray-900 shadow-md shadow-black rounded-lg text-white h-full flex justify-center items-center text-2xl">
              {numberConverter(selectedHex?.population?.toString() ?? "1000")}
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
