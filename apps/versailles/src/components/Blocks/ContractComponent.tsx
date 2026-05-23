"use client";

import { BuildingIcons, getResourceImage } from "@/lib/data";
import {
  ArrowBigDown,
  Calculator,
  Check,
  ChevronDown,
  CircleMinus,
  CirclePlus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Progress } from "../ui/progress";
import { Dropdown, DropdownItem } from "../GameComponents/dropdown";
import { useGameStore } from "@/lib/stores/gameStore";
import { useIntentStore } from "@/lib/stores/intentStore";
import { MergedContract } from "@/lib/types/game";
import {
  deleteClientContract,
  deleteServerContract,
  getMergedContracts,
  getServerContractsFromBuildings,
  updateServerContractIntent,
} from "@/lib/UI/mergeData/uiContract";
import { numberConverter } from "@/lib/utils";
import { Building, BUILDINGS } from "@repo/shared/data/buildings";
import { findBuildingNameByCategory, getBuilding } from "@repo/shared/helpers/buildings";
import { MergedContractChanges } from "@repo/shared/data/contracts";
import { calculateExportAmount } from "@repo/shared/helpers/contracts";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import Image from "next/image";

export default function ContractComponent({
  contract,
  buildings,
}: {
  contract: MergedContract;
  buildings: Building[];
}) {
  const mapHexes = useGameStore((s) => s.mapHexes);
  const updateContract = useIntentStore((s) => s.updateContract);
  const contracts = useIntentStore((s) => s.contracts);
  const serverContracts = getServerContractsFromBuildings(buildings);
  const serverContractUpdate = useIntentStore((s) => s.serverContractUpdate);

  // all contracts of this building (server + client)
  const allContracts = getMergedContracts(
    serverContracts,
    contracts,
    contract.startBuildingId,
    serverContractUpdate
  );

  const startBuilding = getBuilding({ buildings, id: contract.startBuildingId });
  const endBuilding = getBuilding({ buildings, id: contract.endBuildingId });

  const startName = startBuilding
    ? findBuildingNameByCategory({
        buildingCategory: startBuilding?.category,
        level: startBuilding?.level,
      })
    : null;
  const endName = endBuilding
    ? findBuildingNameByCategory({
        buildingCategory: endBuilding?.category,
        level: endBuilding?.level,
      })
    : null;

  const dist = contract.hexIds.length - 1;

  const StartIcon = BuildingIcons[startBuilding?.category ?? "CIVILIAN"];
  const EndIcon = BuildingIcons[endBuilding?.category ?? "CIVILIAN"];

  const allAvailableResources = startName ? BUILDINGS[startName].producing : undefined; // all resources currently produced by this starting building
  const sameBuildingContracts = allContracts.filter(
    (c) => c.startBuildingId === startBuilding?.id && c.endBuildingId === endBuilding?.id
  ); // contracts that have the same starting id and end id
  const allowedResources =
    allAvailableResources && endName
      ? allAvailableResources.filter(
          (r) =>
            Object.keys(BUILDINGS[endName].storageCap).includes(r) &&
            (sameBuildingContracts.every((c) => c.resource !== r) || r === contract.resource)
          // leave resources that could be stored in destination and either
          // not included in any other contract between these two buildings
          // or is a resource of this contract of this component
        )
      : [];
  const dropdownItems: DropdownItem<typeof contract.resource>[] = allowedResources.map((r) => ({
    id: crypto.randomUUID(),
    label: r,
    value: r,
    icon: (
      <img
        className="w-4 h-4"
        src={getResourceImage(r)}
        alt="resource icon"
        onError={(e) => {
          e.currentTarget.src = "/icons/unknown.png";
        }}
      />
    ),
  }));

  const buildingResourceAmount = startBuilding?.storage
    ? startBuilding.storage.find((s) => s.type === contract.resource)?.amount
    : undefined;

  // --- FUNCTIONS ---
  const updateMergedContract = useCallback(
    (newChanges: MergedContractChanges) => {
      if (contract.fromServer) {
        updateServerContractIntent(contract.id, newChanges);
      } else {
        updateContract(contract.id, newChanges); // just pass changed data. no spread.
      }
    },
    [updateContract, contract]
  );
  const deleteContract = useCallback(() => {
    if (contract.fromServer) {
      deleteServerContract(contract.id);
    } else {
      deleteClientContract(contract.id);
    }
  }, [contract]);
  const recalculateAmount = useCallback(() => {
    if (startBuilding && endBuilding && mapHexes) {
      const newAmount = calculateExportAmount({
        startBuilding,
        endBuilding,
        length: dist,
        resource: contract.resource,
        mapHexes,
        buildings,
      });
      if (!newAmount && newAmount !== 0) return;
      updateMergedContract({ amount: newAmount });
    }
  }, [
    startBuilding,
    endBuilding,
    mapHexes,
    dist,
    buildings,
    contract.resource,
    updateMergedContract,
  ]);
  const setAmount = useCallback(
    (value: number) => {
      updateMergedContract({ amount: value });
    },
    [updateMergedContract]
  );
  const setAutoAdjust = useCallback(
    (value: boolean) => {
      updateMergedContract({ autoAdjust: value });
    },
    [updateMergedContract]
  );

  return (
    <div className="w-full h-[110px] bg-gray-800 rounded-xl flex justify-center items-center gap-0.5 p-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col h-full bg-gray-900 items-center justify-between p-2 rounded-md">
            <div>
              <StartIcon className="w-4 h-4 text-amber-200"></StartIcon>
            </div>
            <div className="flex justify-between items-center gap-1">
              <ArrowBigDown className="w-4 h-4 text-gray-400"></ArrowBigDown>
            </div>
            <div>
              <EndIcon className="w-4 h-4 text-amber-200 "></EndIcon>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <span>{`Distance: ${dist} tile(s)`}</span>
        </TooltipContent>
      </Tooltip>

      <div className="flex flex-col justify-center items-center h-full w-full gap-0.5 max-h-full">
        <div className="flex justify-center items-center bg-gray-900 p-1 rounded-md w-full gap-1 flex-1">
          <div className="w-full flex justify-between items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                {buildingResourceAmount && (
                  <div className="w-full flex justify-center items-center">
                    <div className="flex justify-center items-center gap-1 bg-gray-900 rounded-md">
                      <span className="text-xs bg-gray-800 p-0.5 rounded">
                        {buildingResourceAmount}/{contract.amount}
                      </span>
                      <Image
                        src={
                          contract.resource
                            ? getResourceImage(contract.resource)
                            : "/icons/unknown.png"
                        }
                        width={64}
                        height={64}
                        className="w-3.5 h-3.5"
                        alt="Resource Icon"
                      ></Image>
                    </div>
                  </div>
                )}
              </TooltipTrigger>
              <TooltipContent>
                <span>{"Stored vs Needed"}</span>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full flex justify-center items-center">
                  <div className="w-full flex justify-center items-center gap-1 bg-gray-900 rounded-md">
                    <Send className="w-3.5 h-3.5 text-amber-200"></Send>
                    <span className="text-xs bg-gray-800 rounded p-0.5">
                      {contract.lastSentAmount}
                    </span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <span>{"Amount sent during last batch"}</span>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex justify-center items-center bg-gray-900 p-1 rounded-md w-full gap-1 h-[50%]">
          <div
            className="flex justify-center items-center p-1 border-gray-700 border rounded-md bg-gray-900 shadow-md shadow-black"
            onClick={(e) => {
              // delete contract if it's at 0
              if (contract.amount === 0) {
                deleteContract();
              }

              if (e.shiftKey) {
                setAmount(Math.max(contract.amount - 100, 0));
              } else {
                setAmount(Math.max(contract.amount - 10, 0));
              }
              setAutoAdjust(false);
            }}
          >
            {contract.amount === 0 ? (
              <Trash2 className="w-4 h-4 text-red-400 "></Trash2>
            ) : (
              <CircleMinus className="w-4 h-4 text-amber-200 "></CircleMinus>
            )}
          </div>
          {/* Display amount */}
          <div className="bg-gray-800 text-white rounded-md p-1 w-15 flex justify-center items-center">
            {numberConverter(contract.amount)}
          </div>
          {/* Addition */}
          <div
            className="flex justify-center items-center p-1 border-gray-700 border rounded-md bg-gray-900 shadow-md shadow-black"
            onClick={(e) => {
              if (e.shiftKey) {
                setAmount(Math.min(contract.amount + 100, 1_000_000));
              } else {
                setAmount(Math.min(contract.amount + 10, 1_000_000));
              }
              setAutoAdjust(false);
            }}
          >
            <CirclePlus className="w-4 h-4 text-amber-200 "></CirclePlus>
          </div>
          {/* Auto-adjust */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`flex justify-center items-center p-1 border-gray-700 border rounded-md bg-gray-900 shadow-md shadow-black`}
                onClick={() => {
                  setAutoAdjust(!contract.autoAdjust);
                  recalculateAmount();
                }}
              >
                {contract.autoAdjust ? (
                  <Calculator className="w-4 h-4 text-amber-200"></Calculator>
                ) : (
                  <X className="w-4 h-4 text-amber-200 "></X>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <span>{`Auto-Adjust exported resource. `}</span>
              <span className={`${contract.autoAdjust ? "text-green-400" : "text-red-700"}`}>
                {contract.autoAdjust ? "ON" : "OFF"}
              </span>
            </TooltipContent>
          </Tooltip>

          <div>
            {dropdownItems && (
              <Dropdown
                items={dropdownItems}
                updaterFn={(selectedValue) => {
                  updateMergedContract({ resource: selectedValue });
                }}
                value={contract.resource}
                renderItem={(item, isSelected) => (
                  <div className="flex justify-between items-center w-full">
                    <div className="flex justify-center items-center gap-2">
                      {item.icon}
                      <span className="text-white">{item.label}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-white"></Check>}
                  </div>
                )}
                renderButton={() => (
                  <div className="flex justify-center items-center p-1 border-gray-700 border rounded-md bg-gray-900 shadow-md shadow-black">
                    <img
                      className="w-3 h-3"
                      width={408}
                      height={408}
                      alt="pick exported resource button"
                      src={
                        contract.resource
                          ? getResourceImage(contract.resource)
                          : "/icons/unknown.png"
                      }
                    ></img>
                    <ChevronDown className="w-4 h-4 text-gray-600"></ChevronDown>
                  </div>
                )}
              ></Dropdown>
            )}
          </div>
        </div>
        <div className="w-full flex items-center justify-center p-2 bg-gray-900 rounded-md h-[30%]">
          <Progress className="w-full bg-gray-600" value={contract.progress * 100}></Progress>
        </div>
      </div>
    </div>
  );
}
