import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import Image from "next/image";
import { getResourceImage } from "@/lib/data";
import { Label } from "@/components/ui/label";
import { numberConverter } from "@/lib/utils";
import { BASE_RESOURCE } from "@repo/shared/resources";

export default function EfficiencyComponent({
  resource,
  totalNeeded,
  totalImported,
  efficiency,
}: {
  resource: BASE_RESOURCE;
  totalNeeded: number;
  totalImported: number;
  efficiency: number;
}) {
  const progress = Math.floor((totalImported / totalNeeded) * 100);

  return (
    <>
      <div className="w-full h-14 bg-gray-900 rounded-xl p-1 flex flex-col justify-center items-center">
        <div className="w-full h-full flex justify-between items-center gap-1 p-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="h-full w-10 flex justify-center items-center shrink-0 border border-gray-600 bg-gray-800 rounded-md">
                <Image
                  alt={`${resource} icon for consumption`}
                  src={getResourceImage(resource)}
                  width={32}
                  height={32}
                  className="h-auto w-auto"
                ></Image>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <span>{`${resource}`}</span>
            </TooltipContent>
          </Tooltip>

          {/* Progress bar */}
          <div className="w-full h-[50%] flex items-center relative rounded-sm border border-gray-500">
            <Progress
              value={progress}
              id="import-bar"
              indicatorClassName="bg-purple-900"
              className="w-full h-full shrink-0 rounded-sm"
            ></Progress>
            <Label className="absolute w-full h-full flex justify-center items-center">
              {numberConverter(totalImported)} / {totalNeeded}
            </Label>
          </div>

          <div className="h-full w-14 flex justify-center items-center shrink-0 border border-gray-600 bg-gray-800 rounded-md">
            <span>+{efficiency}%</span>
          </div>
        </div>
      </div>
    </>
  );
}
