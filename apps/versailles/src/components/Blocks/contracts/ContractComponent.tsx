"use client";

import { getResourceImage } from "@/lib/data";
import { calcResourceExport } from "@/lib/helpers/contracts";
import { useGameStore } from "@/lib/stores/gameStore";
import { useIntentStore } from "@/lib/stores/intentStore";
import { MergedContract } from "@/lib/types/game";
import {
  deleteClientContract,
  deleteServerContract,
  getMergedContracts,
  updateServerContractIntent,
} from "@/lib/UI/mergeData/uiContract";
import { numberConverter } from "@/lib/utils";
import { BASE_RESOURCE, isBaseResource, typedEntries } from "@repo/shared";
import { Building } from "@repo/shared/data/buildings";
import { MergedContractChanges } from "@repo/shared/data/contracts";
import { getBuilding, getBuildingConfig } from "@repo/shared/helpers/buildings";
import { Calculator, Check, ChevronDown, CircleMinus, CirclePlus, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useCallback } from "react";
import { Dropdown, DropdownItem } from "../../GameComponents/dropdown";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";

export default function ContractComponent({
  contract,
  buildings,
}: {
  contract: MergedContract;
  buildings: Building[];
}) {
  const serverContracts = useGameStore((s) => s.contracts);
  const updateContract = useIntentStore((s) => s.updateContract);
  const clientContracts = useIntentStore((s) => s.contracts);
  const serverContractUpdate = useIntentStore((s) => s.serverContractUpdate);

  // all contracts of this building (server + client)
  const allContracts = getMergedContracts(
    serverContracts,
    clientContracts,
    contract.startBuildingId,
    serverContractUpdate
  );

  const startBuilding = getBuilding({ buildings, id: contract.startBuildingId });
  const endBuilding = getBuilding({ buildings, id: contract.endBuildingId });

  const startBuildingConfig = startBuilding
    ? getBuildingConfig({ category: startBuilding.category, level: startBuilding.level })
    : undefined;
  const endBuildingConfig = endBuilding
    ? getBuildingConfig({ category: endBuilding.category, level: endBuilding.level })
    : undefined;

  const sameBuildingContracts = allContracts.filter(
    (c) => c.startBuildingId === startBuilding?.id && c.endBuildingId === endBuilding?.id
  ); // contracts that have the same starting id and end id

  const availableResources = startBuildingConfig ? startBuildingConfig.producing : undefined; // all resources currently produced by this starting building

  const allowedResources =
    availableResources && endBuildingConfig
      ? (typedEntries(availableResources)
          .filter(
            ([r, available]) =>
              available &&
              available > 0 &&
              isBaseResource(r) &&
              endBuildingConfig.consuming?.[r] &&
              (sameBuildingContracts.every((c) => c.resource !== r) || r === contract.resource)
          )
          .map(([r, _]) => r) as BASE_RESOURCE[])
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
    if (endBuilding) {
      const newAmount = calcResourceExport(endBuilding, contract.resource, allContracts);
      if (!newAmount && newAmount !== 0) return;
      updateMergedContract({ amount: newAmount });
    }
  }, [endBuilding, contract.resource, allContracts, updateMergedContract]);
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
      </div>
    </div>
  );
}
