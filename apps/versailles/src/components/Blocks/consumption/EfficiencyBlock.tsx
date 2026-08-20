"use client";

import { getResourceEfficiencyMap } from "@/lib/helpers/buildings";
import { getOptimisticImportedResources } from "@/lib/helpers/contracts";
import { useGameStore } from "@/lib/stores/gameStore";
import { useIntentStore } from "@/lib/stores/intentStore";
import { selectBuildings } from "@/lib/UI/mergeData/buildings/selectors";
import { selectContractPredictions } from "@/lib/UI/predictions/contracts/selectors";
import { Building, getBuildingConfig, typedEntries } from "@repo/shared";
import EfficiencyComponent from "./EfficiencyComponent";

export default function EfficiencyBlock({ building }: { building: Building }) {
  // gather optimistic contracts from store
  const serverContracts = useGameStore((s) => s.contracts);
  const serverBuildings = useGameStore((s) => s.buildings);
  const gameActions = useIntentStore((s) => s.gameActions);

  const buildings = selectBuildings(serverBuildings, gameActions);
  const contracts = selectContractPredictions(serverContracts, buildings, gameActions);
  const importedResources = getOptimisticImportedResources(contracts, building.id);

  const config = getBuildingConfig(building);
  const consuming = config?.consuming;

  const efficiencyMap = getResourceEfficiencyMap(consuming ?? {}, importedResources);
  const totalEfficiency = Math.floor(
    Math.min(
      1,
      [...efficiencyMap].reduce((acc, [_, e]) => acc + e, 0)
    ) * 100
  );

  return (
    <>
      {config && consuming && Object.entries(consuming).length > 0 && (
        <div className="w-full bg-gray-800 rounded-xl">
          <div className="flex w-full justify-between items-center bg-gray-700 p-2 rounded-t-xl">
            <p>Consumption</p>
          </div>

          <div className="w-full flex flex-col gap-1 p-1">
            {typedEntries(consuming).map(([resource, consumedObject]) => {
              const imported = importedResources.get(resource) ?? 0;

              const needed = consumedObject?.amount ?? 0;

              const efficiency = Math.floor(Math.min(1, efficiencyMap.get(resource) ?? 0) * 100);

              return (
                <EfficiencyComponent
                  key={resource}
                  resource={resource}
                  totalNeeded={needed}
                  totalImported={imported}
                  efficiency={efficiency}
                ></EfficiencyComponent>
              );
            })}
          </div>

          <div className="flex w-full justify-between items-center bg-gray-700 p-2 rounded-b-xl">
            <p>Total Efficiency:</p>
            <span>{totalEfficiency}%</span>
          </div>
        </div>
      )}
    </>
  );
}
