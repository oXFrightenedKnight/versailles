import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { getResourceImage } from "@/lib/data";
import { BASE_RESOURCE } from "@repo/shared";
import Image from "next/image";

export default function AvailableComponent({
  resource,
  available,
  exporting,
  max,
}: {
  resource: BASE_RESOURCE;
  available: number;
  exporting: number;
  max: number;
}) {
  const commitedPercentage = (exporting / max) * 100;
  const freePercentage = ((available - exporting) / max) * 100;
  return (
    <>
      <div className="w-full h-40 bg-gray-900 rounded-xl p-1 flex flex-col justify-center items-center">
        <div className="w-full h-full flex flex-col items-center p-1">
          {/* Top */}
          <div className="w-full flex justify-start items-center">
            <div className="flex justify-center items-center gap-1">
              <div className="h-8 w-8 flex justify-center items-center p-1 shrink-0 border border-gray-600 bg-gray-800 rounded-md">
                <Image
                  alt={`${resource} icon for consumption`}
                  src={getResourceImage(resource)}
                  width={32}
                  height={32}
                  className="h-auto w-auto"
                ></Image>
              </div>
              <span className="underline">{resource}</span>
            </div>
          </div>

          <div className="w-full h-full flex flex-col justify-center items-center p-1">
            <div className="w-full h-full flex flex-col justify-center items-center gap-1">
              <div className="w-full flex justify-between items-center">
                <Label className=" flex justify-center items-center">Produced:</Label>
                <Label className="flex justify-center items-center">
                  {available}/{max}
                </Label>
              </div>
              <div className="w-full h-4 flex justify-center items-center overflow-hidden rounded-[3px] border border-gray-500">
                <Progress
                  value={commitedPercentage}
                  value2={freePercentage}
                  id="commited-bar"
                  indicatorClassName="bg-purple-900"
                  indicatorClassName2="bg-purple-400"
                  className="w-full h-full shrink-0 rounded-[3px]"
                ></Progress>
              </div>
            </div>

            <div className="w-full h-full flex flex-col justify-center items-center text-[13px]">
              <div className="w-full flex justify-between items-center">
                <ul className="list-disc marker:text-purple-900 marker:text-xl pl-4">
                  <li>Commited:</li>
                </ul>
                <span>{exporting}</span>
              </div>

              <div className="w-full flex justify-between items-center">
                <ul className="list-disc marker:text-purple-400 marker:text-xl pl-4">
                  <li>Free:</li>
                </ul>
                <span>{available - exporting}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
