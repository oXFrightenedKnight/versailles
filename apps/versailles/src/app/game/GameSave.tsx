"use client";

import { useState } from "react";
import { GameSave } from "../_trpc/client";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import Image from "next/image";
import { getNationFlagURL } from "@/lib/helpers/flags";
import { format, formatDistanceToNow } from "date-fns";

export default function GameSaveBlock({ save, idx }: { save: GameSave; idx: number }) {
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const src = getNationFlagURL(save.metadata.playerNationId);

  const createdIso = save.metadata.createdAt;
  const updatedIso = save.metadata.updatedAt;
  const metadata = [
    { key: "Created", value: format(new Date(createdIso), "MMM d, yyyy, HH:mm") },
    { key: "Last Played", value: formatDistanceToNow(new Date(updatedIso), { addSuffix: true }) },
    { key: "Turn", value: save.metadata.turn },
    { key: "Playing as", value: save.metadata.playerNationId },
    { key: "Nations Left", value: save.metadata.nationsLeft },
  ];

  return (
    <div
      className="w-[300px] max-w-[300px] p-2 border"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="w-full flex flex-col justify-center items-center border border-green-500 bg-gray-800">
        {/* Image + Id */}
        <div className="w-full flex flex-col justify-center items-center p-2 gap-2 border">
          <Image
            src={src}
            alt="game save nation flag"
            width={300}
            height={300}
            className="w-full h-full rounded-md"
          ></Image>
          <div className="text-md text-white">Save {idx + 1}</div>
        </div>

        {/* Metadata */}
        <div className="w-full flex-1 border p-2">
          <div className="w-full flex-col items-center justify-center bg-gray-900 rounded-md p-2">
            {metadata.map((obj) => {
              return (
                <div
                  key={obj.key}
                  className="w-full flex justify-between gap-4 items-center text-white text-md"
                >
                  <span className="text-sm shrink-0">{obj.key}:</span>
                  <span className="text-sm text-gray-400">{obj.value}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Load button (appears on hover) */}
        <div
          className={`${isHovering ? "" : "invisible"} w-full h-auto flex justify-center items-center p-2`}
        >
          <Button
            className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
            onClick={() => {
              redirect(`/game/${save.id}`);
            }}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
