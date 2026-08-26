"use client";

import ContractComponent from "@/components/Blocks/contracts/ContractComponent";
import { getAvailableResourcesByContract } from "@/lib/helpers/contracts";
import { useGameStore } from "@/lib/stores/gameStore";
import { useIntentStore } from "@/lib/stores/intentStore";
import { updateContract, cancelContract } from "@/lib/UI/mergeData/contracts/selectors";
import { ContractProjection } from "@/lib/UI/mergeData/contracts/types";
import { selectHexes } from "@/lib/UI/mergeData/hexes/selectors";
import { selectContractPredictions } from "@/lib/UI/predictions/contracts/selectors";
import { Building } from "@repo/shared";
import { ActionOfType } from "@repo/shared/actions";
import { SquarePen } from "lucide-react";
import { useCallback } from "react";

export default function ContractBlock({
  isContractSelected,
  setIsContractSelected,
  building,
}: {
  isContractSelected: boolean;
  setIsContractSelected: React.Dispatch<React.SetStateAction<boolean>>;
  building: Building;
}) {
  const serverContracts = useGameStore((s) => s.contracts);
  const buildings = useGameStore((s) => s.buildings);
  const serverHexes = useGameStore((s) => s.mapHexes);
  const playerNation = useGameStore((s) => s.playerNation);

  const gameActions = useIntentStore((s) => s.gameActions);
  const updateGameAction = useIntentStore((s) => s.updateGameAction);
  const createGameAction = useIntentStore((s) => s.createGameAction);
  const deleteGameAction = useIntentStore((s) => s.deleteGameAction);

  const contracts = selectContractPredictions(serverContracts, buildings, gameActions);
  const buildingContracts = contracts
    .filter((c) => c.fromBuildingId === building.id)
    .sort((a, b) => a.executionOrder - b.executionOrder);

  const hexes = selectHexes(serverHexes, gameActions);
  const hexOfBuilding = hexes.find((h) => h.buildingId === building.id);
  const isOwnedByPlayer = hexOfBuilding?.owner ? hexOfBuilding.owner === playerNation?.id : false;

  const availableResourcesMap = getAvailableResourcesByContract(contracts, buildings);

  // --- FUNCTIONS ---
  const handleContractUpdate = useCallback(
    (projection: ContractProjection, changes: ActionOfType<"contract.update">["changes"]) => {
      updateContract(projection, changes, createGameAction, updateGameAction);
    },
    [createGameAction, updateGameAction]
  );
  const handleContractDelete = useCallback(
    (projection: ContractProjection) => {
      cancelContract(projection, createGameAction, deleteGameAction);
    },
    [createGameAction, deleteGameAction]
  );

  return (
    <div className="w-full bg-gray-800 rounded-xl overflow-hidden shrink-0">
      <div className="flex w-full justify-between items-center bg-gray-700 p-2">
        <p>Contracts</p>

        <div
          className={`${isOwnedByPlayer ? "visible" : "invisible"} flex justify-center items-center p-2 border-gray-700 border rounded-xl 
                          ${isContractSelected ? "bg-gray-900/60" : "bg-gray-900"} shadow-md shadow-black`}
          onClick={() => setIsContractSelected(!isContractSelected)}
        >
          <SquarePen className="w-6 h-6 text-amber-200 "></SquarePen>
        </div>
      </div>
      <div className="w-full">
        {buildingContracts.length > 0 ? (
          <>
            {buildingContracts.map((contract) => {
              const availableResources = availableResourcesMap.get(contract.contractId) ?? [];

              return (
                <ContractComponent
                  key={contract.key}
                  contract={contract}
                  availableResources={[...availableResources]}
                  deleteContract={handleContractDelete}
                  updateContract={handleContractUpdate}
                  isOwnedByPlayer={isOwnedByPlayer}
                ></ContractComponent>
              );
            })}
          </>
        ) : (
          <div className="w-full h-10 flex items-center justify-center text-sm">
            No contracts added
          </div>
        )}
      </div>
    </div>
  );
}
