"use client";

import { getResourceImage } from "@/lib/data";
import { ContractProjection } from "@/lib/UI/mergeData/contracts/types";
import { numberConverter } from "@/lib/utils";
import { ActionOfType, BASE_RESOURCE } from "@repo/shared";
import { Calculator, Check, ChevronDown, CircleMinus, CirclePlus, Trash2, X } from "lucide-react";
import Image from "next/image";
import { Dropdown, DropdownItem } from "../../GameComponents/dropdown";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";

export default function ContractComponent({
  contract,
  availableResources,
  deleteContract,
  updateContract,
}: {
  contract: ContractProjection;
  availableResources: BASE_RESOURCE[];
  deleteContract: (projection: ContractProjection) => void;
  updateContract: (
    projection: ContractProjection,
    changes: ActionOfType<"contract.update">["changes"]
  ) => void;
}) {
  const dropdownItems: DropdownItem<typeof contract.resource>[] = availableResources.map((r) => ({
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

  return (
    <div className="w-full h-[110px] bg-gray-800 rounded-xl flex justify-center items-center gap-0.5 p-1">
      <div className="flex flex-col justify-center items-center h-full w-full gap-0.5 max-h-full">
        <div className="flex justify-center items-center bg-gray-900 p-1 rounded-md w-full gap-1 flex-1">
          <div className="w-full flex justify-between items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full flex justify-center items-center">
                  <div className="flex justify-center items-center gap-1 bg-gray-900 rounded-md">
                    <span className="text-xs bg-gray-800 p-0.5 rounded">0/{contract.amount}</span>
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
              </TooltipTrigger>
              <TooltipContent>
                <span>{"Stored vs Needed"}</span>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex justify-center items-center bg-gray-900 p-1 rounded-md w-full gap-1 h-[50%]">
          <div
            className="flex justify-center items-center p-1 border-gray-700 border rounded-md bg-gray-900 shadow-md shadow-black"
            onClick={(e) => {
              updateContract(contract, { autoAdjust: false });

              // delete contract if it's at 0
              if (contract.amount === 0) {
                deleteContract(contract);
              }

              if (e.shiftKey) {
                updateContract(contract, { amount: Math.max(contract.amount - 100, 0) });
              } else {
                updateContract(contract, { amount: Math.max(contract.amount - 10, 0) });
              }
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
              updateContract(contract, { autoAdjust: false });

              if (e.shiftKey) {
                updateContract(contract, { amount: Math.min(contract.amount + 100, 1_000_000) });
              } else {
                updateContract(contract, { amount: Math.min(contract.amount + 10, 1_000_000) });
              }
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
                  updateContract(contract, { autoAdjust: !contract.autoAdjust });
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
                  updateContract(contract, { resource: selectedValue });
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
      </div>
    </div>
  );
}
