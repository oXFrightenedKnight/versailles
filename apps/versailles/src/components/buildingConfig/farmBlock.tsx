import ContractBlock from "../Blocks/ContractBlock";
import { Building, BUILDINGS, findBuildingNameByCategory } from "@repo/shared";
import { Contract } from "@/app/game/page";
import { Info } from "../Blocks/InfoComponent";
import StorageBlock from "../Blocks/StorageBlock";
import InfoBlock from "../Blocks/InfoBlock";

export default function FarmBlock({
  setIsContractSelected,
  isContractSelected,
  contracts,
  buildings,
  farm,
}: {
  buildings: Building[];
  isContractSelected: boolean;
  setIsContractSelected: React.Dispatch<React.SetStateAction<boolean>>;
  contracts: Contract[];
  farm: Building;
}) {
  const hasContract = contracts.find((c) => c.startBuildingId === farm?.id) ? true : false;

  // name
  const name =
    findBuildingNameByCategory({ buildingCategory: farm.category, level: farm.level }) ??
    "nomadic_camp";

  // level
  const level = farm.level;
  const populationCap = BUILDINGS[name].popCap;

  // next level building
  const nextName =
    findBuildingNameByCategory({ buildingCategory: farm.category, level: farm.level + 1 }) ?? null;
  const nextUpgradeTime = nextName ? BUILDINGS[nextName].buildTime : "max";
  const nextUpgradeCost = nextName ? BUILDINGS[nextName].buildCost : "max";

  const info: Info = [
    { key: "Type", value: name },
    { key: "Category", value: farm.category },
    { key: "Level", value: level.toString() },
    { key: "Pop. Barrier", value: populationCap.toString() },
    { key: "Upgrade Time", value: nextUpgradeTime.toString() },
    { key: "Upgrade Cost", value: nextUpgradeCost.toString() },
  ];

  return (
    <div className="w-full h-full flex flex-col gap-2 min-h-0 overflow-y-auto no-scrollbar">
      {/* Contract block */}
      <ContractBlock
        contracts={contracts}
        buildings={buildings}
        isContractSelected={isContractSelected}
        setIsContractSelected={setIsContractSelected}
        hasContract={hasContract}
        buildingType={name}
        building={farm}
      ></ContractBlock>

      {/* Storage block */}
      <StorageBlock building={farm} buildingType={name}></StorageBlock>

      {/* Info Block */}
      <InfoBlock info={info}></InfoBlock>
    </div>
  );
}
