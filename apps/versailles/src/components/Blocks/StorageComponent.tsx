import { numberConverter } from "@/canvas/render";
import { Building, BUILDINGS, findBuildingNameByCategory, RESOURCES } from "@repo/shared";
import Image from "next/image";
import Tooltip from "../tooltip";

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
      <div className="w-full h-25 bg-gray-900 rounded-xl p-1 flex flex-col justify-center items-center m-1 gap-2 relative group">
        <div className="w-7.5 h-7.5 flex justify-center items-center">
          <Image
            alt="resource icon"
            src={`/icons/resources/${type}.png`}
            width={30}
            height={30}
          ></Image>
        </div>

        <Tooltip text={`${type}`} position="top"></Tooltip>
        <div className="m-1 bg-gray-800 text-white text-xs w-full rounded-sm flex justify-center items-center flex flex-col pr-1.25 pl-1.25">
          <p className="border-b w-full flex items-center justify-center border-gray-400">{`${numberConverter(amount.toString()) ?? amount}`}</p>
          <p>{`${numberConverter(max.toString())}`}</p>
        </div>
      </div>
    </>
  );
}
