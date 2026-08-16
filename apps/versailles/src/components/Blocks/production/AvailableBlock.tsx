"use client";

import { getOptimisticExportedResources } from "@/lib/helpers/contracts";
import { useGameStore } from "@/lib/stores/gameStore";
import { useIntentStore } from "@/lib/stores/intentStore";
import { selectContracts } from "@/lib/UI/mergeData/contracts/selectors";
import { Building, getBuildingConfig, isBaseResource, typedEntries } from "@repo/shared";
import AvailableComponent from "./AvailableComponent";
import { selectContractPredictions } from "@/lib/UI/predictions/contracts";
import { selectBuildings } from "@/lib/UI/mergeData/buildings/selectors";

export default function AvailableBlock({ building }: { building: Building }) {
  // gather optimistic contracts from store
  const serverContracts = useGameStore((s) => s.contracts);
  const serverBuildings = useGameStore((s) => s.buildings);
  const gameActions = useIntentStore((s) => s.gameActions);

  const buildings = selectBuildings(serverBuildings, gameActions);

  const contractProjections = selectContracts(serverContracts, gameActions);
  const contractPredictions = selectContractPredictions(contractProjections, buildings);
  const exportedResources = getOptimisticExportedResources(contractPredictions, building.id);

  const config = getBuildingConfig(building);
  const producing = config?.producing ?? {};

  return (
    <>
      {config && producing && typedEntries(producing).some(([r, _]) => isBaseResource(r)) && (
        <div className="w-full bg-gray-800 rounded-xl">
          <div className="flex w-full justify-between items-center bg-gray-700 p-2 rounded-t-xl">
            <p>Available Resources</p>
          </div>

          <div className="w-full flex flex-col gap-1 p-1">
            {typedEntries(building.availableResources).map(([resource, available]) => {
              const exporting = exportedResources.get(resource) ?? 0;
              return (
                <AvailableComponent
                  key={resource}
                  resource={resource}
                  max={producing[resource] ?? 0}
                  exporting={exporting}
                  available={available ?? 0}
                ></AvailableComponent>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
