"use client";

import { Button } from "@/components/ui/button";
import { trpc } from "../_trpc/client";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const createNewGame = trpc.createNewGame.useMutation({
    onSuccess(data) {
      router.push(`/game/${data.id}`);
    },
  });

  function handleNewGame() {
    createNewGame.mutate();
  }
  function handleLoadGame() {
    router.push(`/game`);
  }
  function handleExit() {
    router.push("/");
  }
  return (
    <div className="w-screen h-screen flex justify-end items-center">
      <div className="w-[30%] h-full border">
        <div className="w-full h-full flex flex-col justify-center items-center gap-20">
          {/* Header */}
          <div className="w-full h-[30%] flex justify-center items-center border">
            <span className="text-6xl text-white">Versailles</span>
          </div>

          {/* Body */}
          <div className="w-full flex-1 flex justify-end items-center border p-10">
            <div className=" h-full flex flex-col justify-start items-end gap-2 border text-end">
              <div
                className="w-full text-4xl p-2 text-white hover:underline cursor-pointer"
                onClick={handleNewGame}
              >
                New Game
              </div>
              <div
                className="w-full text-4xl p-2 text-white hover:underline cursor-pointer"
                onClick={handleLoadGame}
              >
                Load Game
              </div>
              <div
                className="w-full text-4xl p-2 text-white hover:underline cursor-pointer"
                onClick={handleExit}
              >
                Exit
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
