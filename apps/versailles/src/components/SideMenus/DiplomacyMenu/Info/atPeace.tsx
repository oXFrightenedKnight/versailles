"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getNationFlagURL } from "@/lib/helpers/flags";
import { Nation, PeaceObj } from "@repo/shared";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export default function NationsAtPeace({
  nations,
  atPeace,
}: {
  nations: Nation[];
  atPeace: PeaceObj[];
}) {
  return (
    <div className="w-full h-12 bg-gray-800 border border-gray-600 flex justify-between items-center rounded-md gap-2 p-1 shrink-0">
      <span className="text-white shrink-0">At Peace:</span>
      <div className="w-full h-full border border-gray-600 bg-gray-900 flex justify-start items-center gap-1 p-1 overflow-x-auto no-scrollbar rounded-md">
        {atPeace.map((obj) => {
          const nation = nations.find((n) => n.id === obj.nationId);
          if (!nation) return null;

          const flagURL = getNationFlagURL(obj.nationId);

          return (
            <Tooltip key={obj.nationId}>
              <TooltipTrigger asChild>
                <div className="w-8 h-6 relative group">
                  <Image
                    src={flagURL}
                    alt="nation at war flag"
                    width={32}
                    height={32}
                    className="w-full h-full rounded-[4px] border border-gray-600"
                  ></Image>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <span>{`Turns Remaining: ${obj.turnsRemaining}`}</span>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
