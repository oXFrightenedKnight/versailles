import { armyIntent, ArmyTraining, Contract, newBuilding, roadObject } from "@/app/game/page";
import { RESOURCES } from "@repo/shared";
import { create } from "zustand";

type ServerContractUpdate = {
  contractId: Partial<{
    // contract id
    amount: number;
    resource: RESOURCES;
    progress: number;
    autoAdjust: boolean;
  }>;
};

type ContractId = string;
type BuildingId = string;

export type StoreType = {
  armyTraining: ArmyTraining[];
  setArmyTraining: (value: ArmyTraining[] | ((prev: ArmyTraining[]) => ArmyTraining[])) => void;

  contracts: Contract[];
  setContracts: (value: Contract[] | ((prev: Contract[]) => Contract[])) => void;
  updateContract: (id: string, newData: Partial<Contract>) => void;
  serverContractUpdate: ServerContractUpdate[];
  setServerContractUpdate: (
    value: ServerContractUpdate[] | ((prev: ServerContractUpdate[]) => ServerContractUpdate[])
  ) => void;
  serverContractDelete: ContractId[];
  setServerContractDelete: (value: ContractId[] | ((prev: ContractId[]) => ContractId[])) => void;

  buildBuildings: newBuilding[];
  setBuildBuildings: (value: newBuilding[] | ((prev: newBuilding[]) => newBuilding[])) => void;
  serverBuildingsDelete: BuildingId[];
  setServerBuildingsDelete: (value: BuildingId[] | ((prev: BuildingId[]) => BuildingId[])) => void;

  buildRoads: roadObject[];
  setBuildRoads: (value: roadObject[] | ((prev: roadObject[]) => roadObject[])) => void;
  armyMove: armyIntent[];
  setArmyMove: (value: armyIntent[] | ((prev: armyIntent[]) => armyIntent[])) => void;
};

export const useIntentStore = create<StoreType>((set) => ({
  // dynamic client data
  armyTraining: [],
  setArmyTraining: (value) =>
    set((state) => ({
      armyTraining: typeof value === "function" ? value(state.armyTraining) : value,
    })),

  // contracts
  contracts: [],
  setContracts: (value) =>
    set((state) => ({
      contracts: typeof value === "function" ? value(state.contracts) : value,
    })),
  updateContract: (id, newData) =>
    set((state) => ({
      contracts: state.contracts.map((c) => (c.id === id ? { ...c, ...newData } : c)),
    })),
  serverContractUpdate: [],
  setServerContractUpdate: (value) =>
    set((state) => ({
      serverContractUpdate: typeof value === "function" ? value(state.serverContractUpdate) : value,
    })),
  serverContractDelete: [],
  setServerContractDelete: (value) =>
    set((state) => ({
      serverContractDelete: typeof value === "function" ? value(state.serverContractDelete) : value,
    })),

  // buildings
  buildBuildings: [],
  setBuildBuildings: (value) =>
    set((state) => ({
      buildBuildings: typeof value === "function" ? value(state.buildBuildings) : value,
    })),
  serverBuildingsDelete: [],
  setServerBuildingsDelete: (value) =>
    set((state) => ({
      serverBuildingsDelete:
        typeof value === "function" ? value(state.serverBuildingsDelete) : value,
    })),

  buildRoads: [],
  setBuildRoads: (value) =>
    set((state) => ({
      buildRoads: typeof value === "function" ? value(state.buildRoads) : value,
    })),

  armyMove: [],
  setArmyMove: (value) =>
    set((state) => ({
      armyMove: typeof value === "function" ? value(state.armyMove) : value,
    })),
}));
