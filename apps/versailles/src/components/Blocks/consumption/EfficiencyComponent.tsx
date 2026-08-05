import { Progress } from "@/components/ui/progress";
import { BASE_RESOURCE } from "@repo/shared";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";

export default function EfficiencyComponent({
  resource,
  totalNeeded,
  totalImported,
}: {
  resource: BASE_RESOURCE;
  totalNeeded: number;
  totalImported: number;
}) {
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-full h-25 bg-gray-900 rounded-xl p-1 flex flex-col justify-center items-center m-1 gap-2">
            <div className="w-full h-full flex flex-1 p-2 border border-red-500">
              {/* Progress bar */}
              <div className="w-[70%] h-full rounded-md border">
                <Progress value={(totalImported / totalNeeded) * 100}></Progress>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <span>{`${resource}`}</span>
        </TooltipContent>
      </Tooltip>
    </>
  );
}
