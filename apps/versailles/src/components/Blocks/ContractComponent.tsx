import { Contract } from "@/app/game/page";
import { Building, findBuildingNameByCategory, getBuilding } from "@repo/shared";

export default function ContractComponent({
  contract,
  buildings,
}: {
  contract: Contract;
  buildings: Building[];
}) {
  const startBuilding = getBuilding({ buildings, id: contract.startBuildingId });
  const endBuilding = getBuilding({ buildings, id: contract.endBuildingId });

  const startName = startBuilding
    ? findBuildingNameByCategory({
        buildingCategory: startBuilding?.category,
        level: startBuilding?.level,
      })
    : null;
  const endName = endBuilding
    ? findBuildingNameByCategory({
        buildingCategory: endBuilding?.category,
        level: endBuilding?.level,
      })
    : null;
  return (
    <div className="w-full h-[40px] bg-gray-800 rounded-xl p-2">
      <div className="w-full h-full flex justify-between items-center">
        <div className="">{startName}</div>
        <div>5</div>
        <div>{endName}</div>
      </div>
    </div>
  );
}
