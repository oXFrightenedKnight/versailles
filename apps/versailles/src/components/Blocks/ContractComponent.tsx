"use client";

import { Contract, DecisionContext } from "@/app/game/page";
import { numberConverter } from "@/canvas/render";
import { BuildingIcons, getResourceImage } from "@/lib/data";
import {
  Building,
  BUILDINGS,
  calculateExportAmount,
  findBuildingNameByCategory,
  getBuilding,
  RESOURCES,
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
import { useContext, useEffect, useState } from "react";
import Tooltip from "../tooltip";
import { Progress } from "../ui/progress";
import { Dropdown, DropdownItem } from "../dropdown";

export default function ContractComponent({
  contract,
  buildings,
}: {
  contract: Contract;
  buildings: Building[];
}) {
  const { mapHexes } = useContext(DecisionContext);
  const [amount, setAmount] = useState<number>(contract.amount);
  const [autoAdjust, setAutoAdjust] = useState<boolean>(contract.autoAdjust);
  const [exportedResource, setExportedResource] = useState<RESOURCES>(contract.resource);
  const [prevResource, setPrevResource] = useState<RESOURCES>(contract.resource);
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

  const allAvailableResources = startName ? BUILDINGS[startName].producing : undefined;
  const allowedResources =
    allAvailableResources && endName
      ? allAvailableResources.filter((r) => Object.keys(BUILDINGS[endName].storageCap).includes(r))
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

  {
    /*useEffect(() => {
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
  }, [exportedResource, autoAdjust])*/
  }

  // --- Update amount ---
  if (exportedResource !== prevResource) {
    setPrevResource(exportedResource);
    if (autoAdjust) {
      recalculateAmount();
    }
  }

  // --- FUNCTIONS ---
  function recalculateAmount() {
    console.log("exportedResource:", exportedResource);
    if (startBuilding && endBuilding && mapHexes) {
      const newAmount = calculateExportAmount({
        startBuilding,
        endBuilding,
        length: dist,
        resource: exportedResource,
        mapHexes,
        buildings,
      });
      if (!newAmount) return;
      setAmount(newAmount);
    }
  }

  console.log("exported resource link", getResourceImage(exportedResource));

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
                setAmount(Math.max(amount - 100, 0));
              } else {
                setAmount(Math.max(amount - 10, 0));
              }
              setAutoAdjust(false);
            }}
          >
            <CircleMinus className="w-4 h-4 text-amber-200 "></CircleMinus>
          </div>
          {/* Display amount */}
          <div className="bg-gray-800 text-white rounded-md p-1 w-15 flex justify-center items-center">
            {numberConverter(amount.toString())}
          </div>
          {/* Addition */}
          <div
            className="flex justify-center items-center p-1 border-gray-700 border rounded-md bg-gray-900 shadow-md shadow-black"
            onClick={(e) => {
              if (e.shiftKey) {
                setAmount(Math.min(amount + 100, 1_000_000));
              } else {
                setAmount(Math.min(amount + 10, 1_000_000));
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
              setAutoAdjust(!autoAdjust);
              recalculateAmount();
            }}
          >
            {autoAdjust ? (
              <Calculator className="w-4 h-4 text-amber-200"></Calculator>
            ) : (
              <X className="w-4 h-4 text-amber-200 "></X>
            )}
            <Tooltip
              text={`Auto-Adjust exported resource. ${autoAdjust ? "ON" : "OFF"}`}
              position="top"
            ></Tooltip>
          </div>
          <div>
            {dropdownItems && (
              <Dropdown
                items={dropdownItems}
                setValue={setExportedResource}
                value={exportedResource}
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
                      src={getResourceImage(exportedResource)}
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
