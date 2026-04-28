import { X } from "lucide-react";
import { ALL_BUILDING_CATEGORIES, BUILDINGS_CATEGORY } from "@repo/shared";
import ToggleBuilding from "./ToggleBuilding";
import { BuildingDescriptions, BuildingIcons } from "@/lib/data";
import { BuildModeType } from "@/lib/types/game";
import { useGameStore } from "@/lib/gameStore";
import {
  getConstructingBuildingsServer,
  mergeConstructingBuildings,
  mergeConstructingBuildingsClient,
} from "@/lib/helpers/uiBuildings";
import { useIntentStore } from "@/lib/intentStore";
import ConstructingBuilding from "./ConstructingBuilding";
import { useMemo } from "react";

export default function BuildMenu({
  isOpen,
  setIsOpen,
  setBuildMode,
  buildMode,
}: {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setBuildMode: React.Dispatch<React.SetStateAction<BuildModeType>>;
  buildMode: BuildModeType;
}) {
  function handleModeChange(mode: BuildModeType) {
    if (buildMode === mode) {
      setBuildMode("none");
    } else {
      setBuildMode(mode);
    }
  }
  const categories: ("road" | BUILDINGS_CATEGORY)[] = [...ALL_BUILDING_CATEGORIES, "road"];

  // Display server + client constructing buildings
  const mapHexes = useGameStore((s) => s.mapHexes);
  const serverConstructing = getConstructingBuildingsServer(mapHexes);
  const buildBuildings = useIntentStore((s) => s.buildBuildings);
  const clientConstructing = mergeConstructingBuildingsClient(buildBuildings);
  const serverCancelBuilding = useIntentStore((s) => s.serverCancelBuilding);

  const constructing = useMemo(() => {
    return mergeConstructingBuildings(serverConstructing, clientConstructing);
  }, [serverCancelBuilding, clientConstructing, serverConstructing]);

  return (
    <div className="w-full h-full">
      {isOpen && (
        <div className="h-[90%] w-full absolute left-0 bottom-0 p-2">
          <div className="flex flex-col items-center h-full w-full bg-gray-800 rounded-xl pointer-events-auto p-2 gap-2">
            <div className="w-full flex justify-between items-center bg-gray-900 shadow-md shadow-black rounded-[8px] pl-2">
              <p className="text-white text-2xl">Build</p>
              <div
                className="flex justify-center items-center p-1 border-gray-700 border rounded-[8px] m-2 bg-gray-900 shadow-md shadow-black"
                onClick={() => {
                  setIsOpen(false);
                  setBuildMode("none");
                }}
              >
                <X className="w-10 h-10 text-gold-1"></X>
              </div>
            </div>
            <div className="w-full flex justify-between items-center bg-gray-900 shadow-md shadow-black rounded-[8px]">
              <div className="grid grid-cols-3 w-full">
                {categories.map((c, key) => (
                  <ToggleBuilding
                    key={key}
                    handleModeChange={handleModeChange}
                    icon={BuildingIcons[c] ?? "Hotel"}
                    descText={BuildingDescriptions[c] ?? `Construct ${c}`}
                    buildMode={buildMode}
                    toggleMode={c}
                  ></ToggleBuilding>
                ))}
              </div>
            </div>
            <div className="w-full flex justify-between items-center bg-gray-900 shadow-md shadow-black rounded-[8px] overflow-y-auto no-scrollbar">
              <div className="flex flex-col gap-2 w-full h-full">
                {constructing.map((c, key) => (
                  <ConstructingBuilding building={c} key={key}></ConstructingBuilding>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
