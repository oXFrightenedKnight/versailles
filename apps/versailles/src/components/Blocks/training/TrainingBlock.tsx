"use client";

import { createNewPopup } from "@/lib/helpers/popups";
import { useGameStore } from "@/lib/stores/gameStore";
import { useIntentStore } from "@/lib/stores/intentStore";
import { useUIStore } from "@/lib/stores/uiStore";
import {
  cancelArmyTraining,
  selectTrainings,
  setArmyTraining,
} from "@/lib/UI/mergeData/training/selectors";
import { TrainingProjection } from "@/lib/UI/mergeData/training/types";
import { numberConverter } from "@/lib/utils";
import { CircleMinus, CirclePlus, Cog } from "lucide-react";
import { useCallback, useState } from "react";
import TrainingComponent from "./TrainingComponent";
import { useOptimisticResources } from "@/hooks/useOptimisticResources";
import { selectHexes } from "@/lib/UI/mergeData/hexes/selectors";
import { Building } from "@repo/shared";
import { getArmyTrainCost } from "@repo/shared/training";

export default function TrainingBlock({ building }: { building: Building }) {
  const [amount, setAmount] = useState<number>(0);

  const playerResources = useOptimisticResources();
  const manpower = playerResources.manpower ?? 0;
  const gold = playerResources.gold ?? 0;

  const setPopup = useUIStore((s) => s.setPopup);

  const playerNation = useGameStore((s) => s.playerNation);
  const serverArmyTraining = useGameStore((s) => s.armyTraining);
  const serverHexes = useGameStore((s) => s.mapHexes);

  const gameActions = useIntentStore((s) => s.gameActions);
  const createGameAction = useIntentStore((s) => s.createGameAction);
  const deleteGameAction = useIntentStore((s) => s.deleteGameAction);

  const training = selectTrainings(serverArmyTraining, gameActions);
  const buildingTrainings = training.filter((t) => t.barrackId === building.id);

  const hexes = selectHexes(serverHexes, gameActions);
  const hexOfBuilding = hexes.find((h) => h.buildingId === building.id);
  const isOwnedByPlayer = hexOfBuilding?.owner ? hexOfBuilding.owner === playerNation?.id : false;

  const handleArmyTraining = useCallback(
    (barrackId: string, amount: number) => {
      setArmyTraining(barrackId, amount, createGameAction);
    },
    [createGameAction]
  );

  const handleCancelTraining = useCallback(
    (projection: TrainingProjection) => {
      cancelArmyTraining(projection, deleteGameAction, createGameAction);
    },
    [deleteGameAction, createGameAction]
  );

  return (
    <div className="w-full bg-gray-800 rounded-xl overflow-hidden shrink-0">
      <div className="flex flex-col w-full justify-between bg-gray-700 p-2 gap-1">
        <p>Army Training</p>
        <div
          className={`${!isOwnedByPlayer && "invisible"} flex w-full items-center justify-center gap-1`}
        >
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
            {numberConverter(amount)}
          </div>
          {/* Addition */}
          <div
            className="flex justify-center items-center p-1 border-gray-700 border rounded-md bg-gray-900 shadow-md shadow-black"
            onClick={(e) => {
              if (e.shiftKey) {
                setAmount(Math.min(amount + 1000, playerResources.manpower ?? 0));
              } else {
                setAmount(Math.min(amount + 100, playerResources.manpower ?? 0));
              }
            }}
          >
            <CirclePlus className="w-4 h-4 text-amber-200 "></CirclePlus>
          </div>

          {/* Start training */}
          <div
            className="flex justify-center items-center p-1 border-gray-700 border rounded-md bg-gray-900 shadow-md shadow-black"
            onClick={() => {
              if (!training || !playerNation) return;
              if (amount > manpower || amount === 0) return;

              const cost = getArmyTrainCost(amount);

              if (gold < cost) {
                createNewPopup(setPopup, "missing_gold");
                return;
              }

              handleArmyTraining(building.id, amount);
            }}
          >
            <Cog className="w-4 h-4 text-amber-200 "></Cog>
          </div>
        </div>
      </div>
      <div>
        {buildingTrainings && buildingTrainings.length > 0 ? (
          <div className="w-full flex flex-col gap-1 p-1">
            {buildingTrainings.map((p) => (
              <TrainingComponent
                key={p.key}
                projection={p}
                cancelTraining={handleCancelTraining}
                isOwnedByPlayer={isOwnedByPlayer}
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
