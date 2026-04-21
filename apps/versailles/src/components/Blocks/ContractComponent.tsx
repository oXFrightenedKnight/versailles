"use client";

import { Contract } from "@/app/game/page";
import { numberConverter } from "@/canvas/render";
import { BuildingIcons, getResourceImage } from "@/lib/data";
import {
  Building,
  BUILDINGS,
  calculateExportAmount,
  findBuildingNameByCategory,
  getBuilding,
} from "@repo/shared";
import {
  ArrowBigDown,
  Calculator,
  Check,
  ChevronDown,
  CircleMinus,
  CirclePlus,
  X,
} from "lucide-react";
import { useCallback, useEffect } from "react";
import Tooltip from "../tooltip";
import { Progress } from "../ui/progress";
import { Dropdown, DropdownItem } from "../dropdown";
import { useGameStore } from "@/lib/gameStore";
import { useIntentStore } from "@/lib/intentStore";

export default function ContractComponent({
  contract,
  buildings,
}: {
  contract: Contract;
  buildings: Building[];
}) {
  const mapHexes = useGameStore((s) => s.mapHexes);
  const updateContract = useIntentStore((s) => s.updateContract);
  const contracts = useIntentStore((s) => s.contracts);

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
  const sameBuildingContracts = contracts.filter(
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

  // --- FUNCTIONS ---
  const setAmount = useCallback(
    (value: number) => {
      updateContract(contract.id, { amount: value });
    },
    [contract.id, updateContract]
  );
  function setAutoAdjust(value: boolean) {
    updateContract(contract.id, { autoAdjust: value });
  }
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
      if (!newAmount) return;
      setAmount(newAmount);
    }
  }, [startBuilding, endBuilding, mapHexes, dist, buildings, contract.resource, setAmount]);

  useEffect(() => {
    recalculateAmount();
  }, [contract.resource, recalculateAmount]);

  console.log("exported resource link", getResourceImage(contract.resource));
  console.log("contract progress", contract.progress);

  return (
    <div className="w-full h-[75px] bg-gray-800 rounded-xl flex justify-center items-center gap-1 p-1">
      <div className="flex flex-col h-full bg-gray-900 items-center justify-between p-2 rounded-md relative group">
        <div>
          <StartIcon className="w-4 h-4 text-amber-200"></StartIcon>
        </div>
        <div className="flex justify-between items-center gap-1">
          <ArrowBigDown className="w-4 h-4 text-gray-400"></ArrowBigDown>
        </div>
        <div>
          <EndIcon className="w-4 h-4 text-amber-200 "></EndIcon>
        </div>
        <Tooltip text={`Distance: ${dist} tile(s)`} position="top" offset={30}></Tooltip>
      </div>

      <div className="flex flex-col justify-center items-center h-full w-full gap-0.5 max-h-full">
        <div className="flex justify-center items-center bg-gray-900 p-1 rounded-md w-full gap-1 h-[70%]">
          <div
            className="flex justify-center items-center p-1 border-gray-700 border rounded-md bg-gray-900 shadow-md shadow-black"
            onClick={(e) => {
              if (e.shiftKey) {
                setAmount(Math.max(contract.amount - 100, 0));
              } else {
                setAmount(Math.max(contract.amount - 10, 0));
              }
              setAutoAdjust(false);
            }}
          >
            <CircleMinus className="w-4 h-4 text-amber-200 "></CircleMinus>
          </div>
          {/* Display amount */}
          <div className="bg-gray-800 text-white rounded-md p-1 w-15 flex justify-center items-center">
            {numberConverter(contract.amount.toString())}
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
          <div
            className={`flex justify-center items-center p-1 border-gray-700 border rounded-md bg-gray-900 shadow-md shadow-black relative group`}
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
            <Tooltip
              text={`Auto-Adjust exported resource. ${contract.autoAdjust ? "ON" : "OFF"}`}
              position="top"
            ></Tooltip>
          </div>
          <div>
            {dropdownItems && (
              <Dropdown
                items={dropdownItems}
                updaterFn={(selectedValue) => {
                  updateContract(contract.id, { resource: selectedValue ?? undefined });
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
