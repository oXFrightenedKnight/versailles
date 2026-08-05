import { Hex } from "@repo/shared/data/hex_map";
import { create } from "zustand";
import { Nation } from "@repo/shared/data/nations";
import { Road } from "@repo/shared/data/roads";
import { Building } from "@repo/shared/data/buildings";
import { Mail } from "@repo/shared/data/mail";
import { ArmyTrainingObject, SupplyContract } from "@repo/shared";
import { GameData } from "@/app/_trpc/client";

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
