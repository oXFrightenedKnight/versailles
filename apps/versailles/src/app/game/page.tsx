"use client";

import { trpc } from "../_trpc/client";
import GameSaveBlock from "./GameSave";

export default function Home() {
  const saves = trpc.loadPlayerGames.useQuery().data;
  return (
    <div className="w-screen h-auto border border-red-500 bg-blue-500">
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className="w-full h-[25%] flex justify-center items-center border">
          <span className="text-6xl text-white">Load Game</span>
        </div>

        {/* Body */}
        <div className="w-full flex-1 flex flex-col justify-center items-center border">
          <div className="max-w-7xl h-full flex justify-center border border-red-500 overflow-y-auto">
            <div className="w-full grid grid-cols-3 justify-center">
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
      </div>
    </div>
  );
}
