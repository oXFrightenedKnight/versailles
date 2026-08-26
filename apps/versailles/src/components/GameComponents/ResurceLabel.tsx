import { Descriptions, getResourceImage } from "@/lib/data";
import { numberConverter } from "@/lib/utils";
import { TooltipTrigger, TooltipContent, Tooltip } from "../ui/tooltip";
import Image from "next/image";
import { NATION_RESOURCE } from "@repo/shared";

export default function ResourceLabel({
  resource,
  amount,
}: {
  resource: NATION_RESOURCE;
  amount: number;
}) {
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex justify-center items-center h-full bg-gray-900 shadow-md shadow-black rounded-lg gap-1 p-1 relative group">
            <Image
              src={getResourceImage(resource)}
              alt={`${resource} label icon`}
              width={408}
              height={408}
              className="w-[30px] h-[30px] flex items-center justify-center"
            ></Image>
            <p className="text-white text-2xl">{numberConverter(amount)}</p>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-[120px]">
          <span>{Descriptions[resource]}</span>
        </TooltipContent>
      </Tooltip>
    </>
  );
}
