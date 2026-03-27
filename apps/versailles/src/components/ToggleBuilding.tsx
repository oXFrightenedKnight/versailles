import { BUILDINGS_CATEGORY } from "@repo/shared";
import Tooltip from "./tooltip";
import { LucideIcon } from "lucide-react";
import { BuildModeType } from "@/app/game/page";

export default function ToggleBuilding({
  handleModeChange,
  icon,
  descText,
  buildMode,
  toggleMode,
}: {
  handleModeChange: (mode: "none" | "road" | BUILDINGS_CATEGORY) => void;
  icon: LucideIcon;
  descText: string;
  buildMode: BuildModeType;
  toggleMode: BuildModeType;
}) {
  const LucideIcon = icon;
  return (
    <>
      <div
        className={`flex justify-center items-center p-1 border-gray-700 border rounded-[8px] m-2 ${buildMode === toggleMode ? "bg-gray-600" : "bg-gray-900"} shadow-md shadow-black relative group`}
        onClick={() => handleModeChange(toggleMode)}
      >
        <LucideIcon className="w-8 h-8 text-gold-1"></LucideIcon>
        <Tooltip text={descText} position="top"></Tooltip>
      </div>
    </>
  );
}
