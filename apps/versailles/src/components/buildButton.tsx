import { X } from "lucide-react";
import { ALL_BUILDING_CATEGORIES, BUILDINGS_CATEGORY } from "@repo/shared";
import ToggleBuilding from "./ToggleBuilding";
import { BuildingDescriptions, BuildingIcons } from "@/lib/data";
import { BuildModeType } from "@/app/game/page";

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
  return (
    <>
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
          </div>
        </div>
      )}
    </>
  );
}
