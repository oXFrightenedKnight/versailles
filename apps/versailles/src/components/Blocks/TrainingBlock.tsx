"use client";

import { Building, BUILDINGS, findBuildingNameByCategory } from "@repo/shared";
import TrainingComponent from "./TrainingComponent";
import { CircleMinus, CirclePlus, Cog } from "lucide-react";
import { DecisionContext } from "@/app/game/page";
import { useContext, useState } from "react";
import { numberConverter } from "@/canvas/render";

export default function TrainingBlock({ building }: { building: Building }) {
  const { army, playerNation } = useContext(DecisionContext);
  const [amount, setAmount] = useState<number>(100);

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
                setAmount(Math.max(amount - 1000, 100));
              } else {
                setAmount(Math.max(amount - 100, 100));
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
              if (!army || !playerNation) return;

              army.setArmyTraining((prev) => [
                ...prev,
                { amount: amount, progress: 0, barrackId: building.id, owner: playerNation.id },
              ]);
            }}
          >
            <Cog className="w-4 h-4 text-amber-200 "></Cog>
          </div>
        </div>
      </div>
      <div>
        {army?.armyTraining && army.armyTraining.length > 0 ? (
          <div className="w-full flex flex-col gap-2">
            {army.armyTraining.map((obj, key) => (
              <TrainingComponent
                key={key}
                amount={obj.amount}
                progress={obj.progress}
              ></TrainingComponent>
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
