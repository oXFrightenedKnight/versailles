"use client";

import { Building } from "@repo/shared";
import TrainingComponent from "./TrainingComponent";
import { CircleMinus, CirclePlus, Cog } from "lucide-react";
import { useMemo, useState } from "react";
import { numberConverter } from "@/canvas/render";
import { useGameStore } from "@/lib/gameStore";
import { useIntentStore } from "@/lib/intentStore";
import {
  getTrainingArmyServer,
  mergeTraining,
  mergeTrainingArmyClient,
} from "@/lib/helpers/uiTraining";

export default function TrainingBlock({ building }: { building: Building }) {
  const playerNation = useGameStore((s) => s.playerNation);
  const armyTraining = useIntentStore((s) => s.armyTraining);
  const setArmyTraining = useIntentStore((s) => s.setArmyTraining);
  const serverTrainingDelete = useIntentStore((s) => s.serverTrainingDelete);
  const [amount, setAmount] = useState<number>(0);

  const serverTraining = getTrainingArmyServer(building);
  const clientTraining = mergeTrainingArmyClient(building.id, armyTraining);

  const training = useMemo(() => {
    return mergeTraining(serverTraining, clientTraining);
  }, [serverTraining, clientTraining, serverTrainingDelete]);

  return (
    <div className="w-full bg-gray-800 rounded-xl">
      <div className="flex flex-col w-full justify-between bg-gray-700 p-2 rounded-t-xl gap-1">
        <p>Army Training</p>
        <div className="flex w-full items-center justify-center gap-1">
          {/* Subtract */}
          <div
            className="flex justify-center items-center p-1 border-gray-700 border rounded-md bg-gray-900 shadow-md shadow-black"
            onClick={(e) => {
              if (e.shiftKey) {
                setAmount(Math.max(amount - 1000, 0));
              } else {
                setAmount(Math.max(amount - 100, 0));
              }
            }}
          >
            <CircleMinus className="w-4 h-4 text-amber-200 "></CircleMinus>
          </div>
          {/* Display amount */}
          <div className="bg-gray-800 text-white rounded-md p-1 w-16 flex justify-center items-center">
            {numberConverter(amount.toString())}
          </div>
          {/* Addition */}
          <div
            className="flex justify-center items-center p-1 border-gray-700 border rounded-md bg-gray-900 shadow-md shadow-black"
            onClick={(e) => {
              if (e.shiftKey) {
                setAmount(Math.min(amount + 1000, playerNation?.manpower ?? 0));
              } else {
                setAmount(Math.min(amount + 100, playerNation?.manpower ?? 0));
              }
            }}
          >
            <CirclePlus className="w-4 h-4 text-amber-200 "></CirclePlus>
          </div>

          {/* Start training */}
          <div
            className="flex justify-center items-center p-1 border-gray-700 border rounded-md bg-gray-900 shadow-md shadow-black"
            onClick={() => {
              if (!armyTraining || !setArmyTraining || !playerNation) return;
              if (amount > playerNation.manpower || amount === 0) return;

              setArmyTraining((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  amount: amount,
                  progress: 0,
                  barrackId: building.id,
                  owner: playerNation.id,
                },
              ]);
            }}
          >
            <Cog className="w-4 h-4 text-amber-200 "></Cog>
          </div>
        </div>
      </div>
      <div>
        {training && training.length > 0 ? (
          <div className="w-full flex flex-col gap-2">
            {training.map((obj) => (
              <TrainingComponent key={obj.id} data={obj}></TrainingComponent>
            ))}
          </div>
        ) : (
          <div className="w-full flex p-2">
            <span>No army training yet</span>
          </div>
        )}
      </div>
    </div>
  );
}
