import { getNationFlagURL } from "@/lib/helpers/imageCache/flags";
import { TooltipTrigger, TooltipContent, Tooltip } from "../ui/tooltip";
import Image from "next/image";

export default function NationDiplomacyList({
  list,
  customText,
}: {
  list: string[];
  customText?: (nationId?: string) => string;
}) {
  return (
    <div className="w-full h-full border border-gray-600 bg-gray-900 flex justify-start items-center gap-1 p-1 overflow-x-auto no-scrollbar rounded-md">
      {list.map((id) => {
        const flagURL = getNationFlagURL(id);

        return (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <div className="w-8 h-6 relative group">
                <Image
                  src={flagURL}
                  alt="nation at peace flag"
                  width={32}
                  height={32}
                  className="w-full h-full rounded-[4px] border border-gray-600"
                ></Image>
              </div>
            </TooltipTrigger>
            <TooltipContent>{customText && <span>{customText(id)}</span>}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
