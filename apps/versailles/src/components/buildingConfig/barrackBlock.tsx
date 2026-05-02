import { Building, BUILDINGS, findBuildingNameByCategory } from "@repo/shared";
import { Info } from "../Blocks/InfoComponent";
import StorageBlock from "../Blocks/StorageBlock";
import InfoBlock from "../Blocks/InfoBlock";
import TrainingBlock from "../Blocks/TrainingBlock";

export default function BarrackBlock({ building }: { building: Building }) {
  // name
  const name =
    findBuildingNameByCategory({ buildingCategory: building.category, level: building.level }) ??
    "nomadic_camp";

  // level
  const level = building.level;
  const populationCap = BUILDINGS[name].popCap;

  // next level building
  const nextName =
    findBuildingNameByCategory({
      buildingCategory: building.category,
      level: building.level + 1,
    }) ?? null;
  const nextUpgradeTime = nextName ? BUILDINGS[nextName].buildTime : "max";
  const nextUpgradeCost = nextName ? BUILDINGS[nextName].buildCost : "max";

  const info: Info = [
    { key: "Type", value: name },
    { key: "Category", value: building.category },
    { key: "Level", value: level.toString() },
    { key: "Pop. Barrier", value: populationCap.toString() },
    { key: "Upgrade Time", value: nextUpgradeTime.toString() },
    { key: "Upgrade Cost", value: nextUpgradeCost.toString() },
  ];

  return (
    <div className="w-full h-full flex flex-col gap-2 min-h-0 overflow-y-auto no-scrollbar">
      {/* Training Block */}
      <TrainingBlock building={building}></TrainingBlock>

      {/* Storage block */}
      <StorageBlock building={building} buildingType={name}></StorageBlock>

      {/* Info Block */}
      <InfoBlock info={info} building={building}></InfoBlock>
    </div>
  );
}
