import { Building, BASE_RESOURCE, findBuildingNameByCategory, BUILDINGS } from "@repo/shared";
import { addProductionStat } from "./production";

export function addResourceToStorage(building: Building, resource: BASE_RESOURCE, amount: number) {
  const name = findBuildingNameByCategory({
    buildingCategory: building.category,
    level: building.level,
  });
  if (!name) return;

  const max = BUILDINGS[name].storageCap[resource] ?? 0;

  if (building.storage) {
    const storage = building.storage.find((s) => s.type === resource);
    if (!storage) return;

    const newAmount = Math.min(storage.amount + amount, max);
    const added = newAmount - storage.amount;
    storage.amount = newAmount;

    addProductionStat(building, resource, added);
  }
}
