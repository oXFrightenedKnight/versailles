"use client";

import { useRouter } from "next/navigation";
import { trpc } from "../_trpc/client";
import Image from "next/image";

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
    <div className="z-10 w-full h-screen flex justify-center md:justify-end items-center">
      <div className=" h-full w-full max-w-md min-w-0 p-5">
        <div className="w-full h-full flex flex-col justify-center items-center gap-20 bg-card border border-foreground/50 rounded-lg p-10">
          {/* Header */}

          <div className="w-full max-w-64 h-[30%] relative aspect-3/1">
            <Image
              draggable={false}
              fill
              className="object-contain"
              alt="versailles logo"
              src={`/site_assets/logo.png`}
            ></Image>
          </div>

          {/* Body */}
          <div className="w-full flex-1 flex justify-end items-center border-t border-primary pt-5">
            <div className=" h-full flex flex-col justify-start items-end gap-2  text-end">
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
