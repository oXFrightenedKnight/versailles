import { Building, getBuildingConfig, typedEntries } from "@repo/shared";
import EfficiencyComponent from "./EfficiencyComponent";
import { useGameStore } from "@/lib/stores/gameStore";
import { getMergedContracts } from "@/lib/UI/mergeData/uiContract";
import { useIntentStore } from "@/lib/stores/intentStore";
import { getContractResourceMap } from "@/lib/helpers/contracts";

export default function EfficiencyBlock({ building }: { building: Building }) {
  const config = getBuildingConfig(building);
  const consuming = config?.consuming;

  // gather optimistic contracts from store
  const serverContracts = useGameStore((s) => s.contracts);
  const { contracts: clientContracts, serverContractUpdate } = useIntentStore((s) => ({
    contracts: s.contracts,
    serverContractUpdate: s.serverContractUpdate,
  }));

  const mergedBuildingContracts = getMergedContracts(
    serverContracts,
    clientContracts,
    building.id,
    serverContractUpdate
  );
  const contractResourceMap = getContractResourceMap(mergedBuildingContracts);
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
              const resourceContracts = contractResourceMap.get(resource);
              const totalImported = resourceContracts?.reduce((acc, c) => acc + c.amount, 0) ?? 0;

              const totalNeeded = consumedObject?.amount ?? 0;

              return (
                <EfficiencyComponent
                  key={resource}
                  resource={resource}
                  totalNeeded={totalNeeded}
                  totalImported={totalImported}
                ></EfficiencyComponent>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
