import { getBuildingsByIdMap } from "@repo/shared/buildings";
import { getHexIdMap, getHexAxialMap } from "@repo/shared/map";
import { bfs, reconstructPath } from "../../algorithms/bfs";
import { addArmy, removeArmy } from "../../army/commands";
import { deleteContract } from "../../contracts/mutations";
import { getBuildingContractsMap } from "../../contracts/queries";
import { GameCtx } from "#trpc";

// think if you can optimize this
export function transferHexOwnership(ctx: GameCtx, hexId: number, toNationId: string) {
  const hexIdMap = getHexIdMap(ctx);
  const axialMap = getHexAxialMap(ctx);
  const buildingIdMap = getBuildingsByIdMap(ctx.buildings);
  const buildingContractMap = getBuildingContractsMap(ctx);

  const hex = hexIdMap.get(hexId);
  if (!hex) return { ok: false };

  const currOwner = hex.owner;

  const nation = ctx.nations.find((n) => n.id === toNationId);
  if (!nation) return { ok: false };

  const building = hex.buildingId ? buildingIdMap.get(hex.buildingId) : undefined;
  if (hex.buildingId && !building) return { ok: false };

  if (currOwner !== nation.id) {
    // reset queued buildings
    hex.build_queue = null;

    // reset contracts if building in hex
    if (building) {
      const buildingContracts = buildingContractMap.get(building.id) ?? [];
      for (const contract of buildingContracts) {
        deleteContract(ctx, contract.id);
      }
    }
  }

  const cameFrom = bfs({ ctx, startHexId: hex.id, axialMap, hexIdMap });
  const pathMap = new Map(
    ctx.mapHexes.flatMap((h) => {
      const path = reconstructPath(cameFrom, h.id);
      return path ? [[h.id, path]] : [];
    })
  );

  // push non-allowed armies to their closest owned land (or delete if no path found)
  const notAllowed = new Set(ctx.nations.filter((n) => n.id !== nation.id).map((n) => n.id));
  for (const army of hex.army) {
    if (notAllowed.has(army.nationId)) {
      // sort and find closest path to army's owner closest hex
      const nationHexesPath = [...pathMap].filter(([id, _]) => {
        const hex = hexIdMap.get(id);
        return hex && hex.owner === army.nationId;
      });
      const sorted = nationHexesPath.sort((a, b) => a[1].length - b[1].length);
      const closest = sorted[0];

      if (closest) {
        // add army to closest hex
        addArmy({ ctx, nationId: army.nationId, hexId: closest[0], amount: army.amount });
      }

      // remove army from this hex
      removeArmy(ctx, army.nationId, hex.id, army.amount, hexIdMap);
    }
  }

  hex.owner = nation.id;
  return { ok: true };
}
