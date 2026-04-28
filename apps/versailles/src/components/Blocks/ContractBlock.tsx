import { Contract } from "@/lib/types/game";
import { Building } from "@repo/shared";
import { SquarePen } from "lucide-react";
import ContractComponent from "./ContractComponent";
import { useGameStore } from "@/lib/gameStore";
import { useIntentStore } from "@/lib/intentStore";
import { getMergedContracts, getServerContractsFromBuildings } from "@/lib/helpers/uiContract";

export default function ContractBlock({
  isContractSelected,
  setIsContractSelected,
  buildingType,
  building,
}: {
  isContractSelected: boolean;
  setIsContractSelected: React.Dispatch<React.SetStateAction<boolean>>;
  buildingType: string;
  building: Building;
}) {
  const buildings = useGameStore((s) => s.buildings);

  {
    /* SUBSCRIBE TO CLIENT AND SERVER CONTRACTS AND MERGE THEM */
  }
  const serverContracts = getServerContractsFromBuildings(buildings);

  const clientContracts = useIntentStore((s) => s.contracts)
    .filter((c) => c.startBuildingId === building.id)
    .map((c) => ({ ...c, fromServer: false }));

  const serverContractUpdate = useIntentStore((s) => s.serverContractUpdate);

  const contracts = getMergedContracts(
    serverContracts,
    clientContracts,
    building.id,
    serverContractUpdate
  );

  console.log(contracts, "contracts");
  console.log("serverContracts", serverContracts);
  console.log("client contracts", clientContracts);

  return (
    <div className="w-full bg-gray-800 rounded-xl">
      <div className="flex w-full justify-between items-center bg-gray-700 p-2 rounded-t-xl">
        <p>{buildingType} Contracts</p>
        <div
          className={`flex justify-center items-center p-2 border-gray-700 border rounded-xl 
                          ${isContractSelected ? "bg-gray-900/60" : "bg-gray-900"} shadow-md shadow-black`}
          onClick={() => setIsContractSelected(!isContractSelected)}
        >
          <SquarePen className="w-6 h-6 text-amber-200 "></SquarePen>
        </div>
      </div>
      <div className="w-full">
        {contracts.length > 0 ? (
          <div>
            {contracts.map((contract) => {
              return (
                <ContractComponent
                  key={contract.id}
                  contract={contract}
                  buildings={buildings}
                ></ContractComponent>
              );
            })}
          </div>
        ) : (
          <div className="w-full h-10 flex items-center justify-center text-sm">
            No supply contracts added
          </div>
        )}
      </div>
    </div>
  );
}
