import { GameData } from "@/app/_trpc/client";
import { Hex, Nation, Building, SupplyContract } from "@repo/shared";
import { Mail } from "@repo/shared/mails";
import { Road } from "@repo/shared/roads";
import { ArmyTrainingObject } from "@repo/shared/training";
import { create } from "zustand";

export type StoreType = {
  mapHexes: Hex[];
  nations: Nation[];
  turn: number;
  roads: Road[];
  buildings: Building[];
  playerNation: Nation | null;
  mails: Mail[];
  armyTraining: ArmyTrainingObject[];
  contracts: SupplyContract[];
  setGameData: (data: GameData) => void;
  reset: () => void;
};

export const initialState = {
  // immutable server data
  mapHexes: [],
  nations: [],
  playerNation: null,
  turn: 0,
  roads: [],
  buildings: [],
  mails: [],
  armyTraining: [],
  contracts: [],
};

export const useGameStore = create<StoreType>((set) => ({
  ...initialState,

  setGameData: (data) =>
    set({
      ...data,
      playerNation: data?.nations.find((n) => n.isPlayer),
    }),

  reset: () => set(initialState),
}));
