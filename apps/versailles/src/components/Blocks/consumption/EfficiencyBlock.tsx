"use client";

import { getOptimisticImportedResources } from "@/lib/helpers/contracts";
import { useGameStore } from "@/lib/stores/gameStore";
import { useIntentStore } from "@/lib/stores/intentStore";
import { selectContracts } from "@/lib/UI/mergeData/contracts/selectors";
import { Building, getBuildingConfig, typedEntries } from "@repo/shared";
import EfficiencyComponent from "./EfficiencyComponent";

export default function EfficiencyBlock({ building }: { building: Building }) {
  const config = getBuildingConfig(building);
  const consuming = config?.consuming;

  // gather optimistic contracts from store
  const serverContracts = useGameStore((s) => s.contracts);
  const gameActions = useIntentStore((s) => s.gameActions);

  const contracts = selectContracts(serverContracts, gameActions);
  const importedResources = getOptimisticImportedResources(contracts);
  return (
    <>
      {config && consuming && Object.entries(consuming).length > 0 && (
        <div className="w-full bg-gray-800 rounded-xl">
          <div className="flex w-full justify-between items-center bg-gray-700 p-2 rounded-t-xl">
            <p>Consumption Efficiency</p>
            <p>Total Efficiency: </p>
          </div>

          <div className="w-full grid grid-cols-4 gap-2">
            {typedEntries(consuming).map(([resource, consumedObject]) => {
              const imported = importedResources.get(resource) ?? 0;

              const needed = consumedObject?.amount ?? 0;

              return (
                <EfficiencyComponent
                  key={resource}
                  resource={resource}
                  totalNeeded={needed}
                  totalImported={imported}
                ></EfficiencyComponent>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
