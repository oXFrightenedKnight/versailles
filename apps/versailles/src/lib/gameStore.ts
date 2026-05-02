import { serverData } from "./types/game";
import { Building, Hex, Nation, Road } from "@repo/shared";
import { create } from "zustand";

export type StoreType = {
  mapHexes: Hex[];
  nations: Nation[];
  turn: number;
  roads: Road[];
  buildings: Building[];
  playerNation: Nation | null;
  setGameData: (data: serverData) => void;
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
};

export const useGameStore = create<StoreType>((set) => ({
  ...initialState,

  setGameData: (data) =>
    set({
      mapHexes: data.mapHexes,
      nations: data.nations,
      playerNation: data.nations.find((n) => n.isPlayer),
      turn: data.turn,
      roads: data.roads,
      buildings: data.buildings,
    }),

  reset: () => set(initialState),
}));
