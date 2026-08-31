"use client";

import { CloseButton } from "@/components/game/ui/buttons";
import { useGameStore } from "@/lib/stores/gameStore";
import { useState } from "react";
import NationInfo from "./info/NationBlock";
import NationCol from "./NationCol";
import { OpenMenus } from "@/lib/types/navigation";

export default function DiplomacyMenu({
  setOpenMenu,
}: {
  setOpenMenu: React.Dispatch<React.SetStateAction<OpenMenus>>;
}) {
  const [chosenNation, setChosenNation] = useState<string | null>(null);

  const nations = useGameStore((s) => s.nations);
  const playerNation = useGameStore((s) => s.playerNation);

  const opposing = playerNation ? nations.filter((n) => n.id !== playerNation.id) : [];
  return (
    <>
      <div className="h-[90%] w-full absolute left-0 bottom-0 p-2 slide-in">
        <div className="flex flex-col items-center h-full w-full bg-gray-800 rounded-xl pointer-events-auto p-2 gap-2">
          <div className="w-full flex justify-between items-center bg-gray-900 shadow-md shadow-black rounded-[8px] pl-2">
            <p className="text-white text-2xl">Diplomacy</p>
            <CloseButton
              onClose={() => {
                setOpenMenu("none");
                setChosenNation(null);
              }}
            ></CloseButton>
          </div>

          {/* MAIN CHOOSING MENU */}
          {!chosenNation && (
            <div className="w-full flex justify-center items-center bg-gray-900 shadow-md shadow-black rounded-[8px]">
              <div className="w-full flex flex-col justify-center items-start p-1 gap-1">
                {opposing.length > 0 &&
                  opposing.map((n) => (
                    <NationCol nation={n} key={n.id} setChosenNation={setChosenNation}></NationCol>
                  ))}
              </div>
            </div>
          )}

          {/* NATION INFO BLOCK */}

          <div className="w-full h-full max-w-full min-h-0">
            {chosenNation && (
              <div className="flex justify-center items-center h-full w-full ">
                <NationInfo nationId={chosenNation} setChosenNation={setChosenNation}></NationInfo>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
