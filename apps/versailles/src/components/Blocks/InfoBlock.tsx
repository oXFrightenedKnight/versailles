import { Trash2 } from "lucide-react";
import InfoComponent, { Info } from "./InfoComponent";
import { Building } from "@repo/shared";
import { deleteBuilding } from "@/lib/helpers/uiBuildings";
import { useGameStore } from "@/lib/gameStore";

export default function InfoBlock({ info, building }: { info: Info; building: Building }) {
  const mapHexes = useGameStore((s) => s.mapHexes);
  const playerNation = useGameStore((s) => s.playerNation);
  const type = info.find((obj) => obj.key === "Type")?.value;

  const hex = mapHexes.find((h) => h.buildingId === building.id);

  return (
    <div className="w-full bg-gray-800 rounded-xl">
      <div className="flex w-full justify-between items-center bg-gray-700 p-2 rounded-t-xl">
        <p>{type} Info</p>

        {hex?.owner === playerNation?.id && (
          <div
            className="flex bg-gray-900 border border-gray-600 p-1 gap-1 rounded-md text-red-400 h-full justify-center items-center"
            onClick={() => {
              deleteBuilding(building.id);
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
