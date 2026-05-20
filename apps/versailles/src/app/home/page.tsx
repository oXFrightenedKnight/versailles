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
  return (
    <div className="w-screen h-screen border border-red-500 bg-blue-500">
      <div className="w-full h-full flex flex-col justify-center items-center">
        {/* Header */}
        <div className="w-full h-[25%] flex justify-center items-center border">
          <span className="text-6xl text-white">Versailles</span>
        </div>

        {/* Body */}
        <div className="max-w-7xl flex-1 flex justify-center items-center border gap-2">
          <Button
            className="p-2"
            onClick={() => {
              handleNewGame();
            }}
          >
            New Game
          </Button>
          <Button
            className="p-2"
            onClick={() => {
              handleLoadGame();
            }}
          >
            Load Game
          </Button>
        </div>
      </div>
    </div>
  );
}
