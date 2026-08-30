"use client";

import MaxWidthWrapper from "@/components/site/ui/MaxWidthWrapper";
import { trpc } from "../_trpc/client";
import GameSaveBlock from "../../components/site/saves/GameSave";

export default function Home() {
  const saves = trpc.loadPlayerGames.useQuery().data;
  return (
    <div className="w-full h-auto">
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className="w-full h-[25%] flex justify-center items-center bg-card rounded-b-2xl p-5">
          <span className="lg:text-6xl md:text-5xl text-4xl text-white font-bold">Load Game</span>
        </div>

        {/* Body */}
        <MaxWidthWrapper className="w-full flex flex-col justify-center items-start py-5">
          <div className="w-full flex-1 flex flex-col justify-center items-center">
            <div className="w-full h-full flex justify-center items-center">
              <div className="grid grid-cols-[repeat(auto-fit,300px)] justify-center w-fit max-w-full gap-5">
                {saves && saves.length > 0 ? (
                  saves.map((save, idx) => {
                    return <GameSaveBlock save={save} idx={idx} key={save.id}></GameSaveBlock>;
                  })
                ) : !saves ? (
                  <div>Loading...</div>
                ) : (
                  <div>No games found!</div>
                )}
              </div>
            </div>
          </div>
        </MaxWidthWrapper>
      </div>
    </div>
  );
}
