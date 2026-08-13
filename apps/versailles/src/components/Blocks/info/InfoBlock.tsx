import { Trash2 } from "lucide-react";
import InfoComponent, { Info } from "./InfoComponent";
import { useGameStore } from "@/lib/stores/gameStore";
import { Building, BUILDINGS } from "@repo/shared/data/buildings";
import { getBuildingName } from "@repo/shared";
import { deleteBuilding } from "@/lib/UI/mergeData/buildings/selectors";
import { useIntentStore } from "@/lib/stores/intentStore";
import { selectHexes } from "@/lib/UI/mergeData/hexes/selectors";

export default function InfoBlock({ info, building }: { info: Info; building: Building }) {
  const serverHexes = useGameStore((s) => s.mapHexes);
  const playerNation = useGameStore((s) => s.playerNation);

  const gameActions = useIntentStore((s) => s.gameActions);
  const createGameAction = useIntentStore((s) => s.createGameAction);

  const mapHexes = selectHexes(serverHexes, gameActions);

  const name = BUILDINGS[getBuildingName(building.category, building.level) ?? "nomadic_camp"].name;

  const hex = mapHexes.find((h) => h.buildingId === building.id);

  const isCapital = hex ? hex.id === playerNation?.capitalTileIdx : false;
  const isOwnerOfHex = hex ? hex.owner === playerNation?.id : false;

  return (
    <div className="w-full bg-gray-800 rounded-xl">
      <div className="flex w-full justify-between items-center bg-gray-700 p-2 rounded-t-xl">
        <p>{name} Info</p>

        {!isCapital && isOwnerOfHex && (
          <div
            className="flex bg-gray-900 border border-gray-600 p-1 gap-1 rounded-md text-red-400 h-full justify-center items-center"
            onClick={() => {
              deleteBuilding(building.id, createGameAction);
            }}
          >
            <Trash2 className="w-6 h-6 shrink-0"></Trash2>
          </div>
        )}
      </div>
      <InfoComponent info={info}></InfoComponent>
    </div>
  );
}
