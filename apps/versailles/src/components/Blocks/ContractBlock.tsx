import { Contract } from "@/app/game/page";
import { Building } from "@repo/shared";
import { SquarePen } from "lucide-react";
import ContractComponent from "./ContractComponent";

export default function ContractBlock({
  buildings,
  isContractSelected,
  setIsContractSelected,
  contracts,
  hasContract,
  buildingType,
  building,
}: {
  buildings: Building[];
  isContractSelected: boolean;
  setIsContractSelected: React.Dispatch<React.SetStateAction<boolean>>;
  contracts: Contract[];
  hasContract: boolean;
  buildingType: string;
  building: Building;
}) {
  const buildingContracts = contracts.filter((c) => c.startBuildingId === building.id);
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
        {hasContract ? (
          <div>
            {buildingContracts.map((contract, key) => (
              <ContractComponent
                key={key}
                contract={contract}
                buildings={buildings}
              ></ContractComponent>
            ))}
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
