import { numberConverter } from "@/lib/utils";
import { baseResources, getBuildingConfig } from "@repo/shared";
import { Building } from "@repo/shared/data/buildings";
import EfficiencyBlock from "../Blocks/consumption/EfficiencyBlock";
import ContractBlock from "../Blocks/contracts/ContractBlock";
import InfoBlock from "../Blocks/info/InfoBlock";
import { Info } from "../Blocks/info/InfoComponent";
import TrainingBlock from "../Blocks/training/TrainingBlock";
import AvailableBlock from "../Blocks/production/AvailableBlock";

export default function BuildingMenu({
  building,
  isContractSelected,
  setIsContractSelected,
}: {
  building: Building;
  isContractSelected: boolean;
  setIsContractSelected: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const config = getBuildingConfig(building);
  if (!config) return null;

  // level
  const level = building.level;
  const populationCap = config.popCap;

  // next level building
  const nextConfig =
    getBuildingConfig({ category: building.category, level: building.level + 1 }) ?? null;
  const nextUpgradeTime = nextConfig ? nextConfig.buildTime : "max";
  const nextUpgradeCost = nextConfig ? nextConfig.buildCost : "max";

  const consumed = building.statistics.consumed.map((c) => ({
    key: `${c.resource} consumed`,
    value: numberConverter(c.amount),
  }));
  const produced = building.statistics.produced.map((c) => ({
    key: `${c.resource} produced`,
    value: numberConverter(c.amount),
  }));

  const info: Info = [
    { key: "Name", value: config.name },
    { key: "Category", value: building.category },
    { key: "Level", value: level.toString() },
    { key: "Pop. Barrier", value: populationCap.toString() },
    { key: "Upgrade Time", value: nextUpgradeTime.toString() },
    { key: "Upgrade Cost", value: nextUpgradeCost.toString() },
    ...consumed,
    ...produced,
  ];

  return (
    <div className="w-full h-full flex flex-col gap-2 min-h-0 overflow-y-auto no-scrollbar">
      {/* Training Block */}
      {config.systems?.armyTraining && <TrainingBlock building={building}></TrainingBlock>}

      {/* Contract Block & Availability Block */}
      {config.producing && baseResources.some((r) => (config.producing![r] ?? 0) > 0) && (
        <>
          <ContractBlock
            isContractSelected={isContractSelected}
            setIsContractSelected={setIsContractSelected}
            building={building}
          ></ContractBlock>
          <AvailableBlock building={building}></AvailableBlock>
        </>
      )}

      {/* Consumption Block */}
      {config.consuming && Object.entries(config.consuming).length > 0 && (
        <EfficiencyBlock building={building}></EfficiencyBlock>
      )}

      {/* Info Block */}
      <InfoBlock info={info} building={building}></InfoBlock>
    </div>
  );
}
