import Image from "next/image";
import { numberConverter } from "@/lib/utils";
import { RESOURCES } from "@repo/shared/data/hex_map";
import { Building, BUILDINGS } from "@repo/shared/data/buildings";
import { findBuildingNameByCategory } from "@repo/shared/helpers/buildings";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export default function StorageComponent({
  amount,
  type,
  building,
}: {
  amount: number;
  type: RESOURCES;
  building: Building;
}) {
  const buildingName = findBuildingNameByCategory({
    buildingCategory: building.category,
    level: building.level,
  });
  const max =
    Object.entries(BUILDINGS[buildingName].storageCap).find(([t, amount]) => t === type)?.[1] ?? 0;
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-full h-25 bg-gray-900 rounded-xl p-1 flex flex-col justify-center items-center m-1 gap-2">
            <div className="w-7.5 h-7.5 flex justify-center items-center">
              <Image
                alt="resource icon"
                src={`/icons/resources/${type}.png`}
                width={30}
                height={30}
              ></Image>
            </div>

            <div className="m-1 bg-gray-800 text-white text-xs w-full rounded-sm flex justify-center items-center flex flex-col pr-1.25 pl-1.25">
              <p className="border-b w-full flex items-center justify-center border-gray-400">{`${numberConverter(amount) ?? amount}`}</p>
              <p>{`${numberConverter(max)}`}</p>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <span>{`${type}`}</span>
        </TooltipContent>
      </Tooltip>
    </>
  );
}
