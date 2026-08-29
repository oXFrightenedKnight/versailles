import { LucideIcon } from "lucide-react";
import { BuildModeType } from "@/lib/types/game";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BUILDINGS_CATEGORY } from "@repo/shared/buildings";

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
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`flex justify-center items-center p-1 border-gray-700 border rounded-[8px] m-2 ${buildMode === toggleMode ? "bg-gray-600" : "bg-gray-900"} shadow-md shadow-black`}
            onClick={() => handleModeChange(toggleMode)}
          >
            <LucideIcon className="w-8 h-8 text-gold-1"></LucideIcon>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <span>{descText}</span>
        </TooltipContent>
      </Tooltip>
    </>
  );
}
