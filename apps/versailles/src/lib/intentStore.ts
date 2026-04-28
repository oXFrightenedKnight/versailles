import { RESOURCES } from "@repo/shared";
import { create } from "zustand";
import { resolveValue } from "./utils";
import { armyIntent, ArmyTraining, Contract, newBuilding, roadObject } from "./types/game";

// custom react-like setState function type for zustland store
export type SetStateAction<T> = (value: T | ((prev: T) => T)) => void;

export type ServerContractUpdate = {
  contractId: string;
  changes: MergedContractChanges;
};

// ensuring both contracts are able to handle "updatable" fields
export type MergedContractChanges = Partial<{
  // contract id
  amount: number;
  resource: RESOURCES;
  progress: number;
  autoAdjust: boolean;
}>;

type ContractId = string;
type BuildingId = string;
type armyTrainId = string;
type HexId = number;
type RoadId = string;

export type StoreType = {
  armyTraining: ArmyTraining[];
  setArmyTraining: SetStateAction<ArmyTraining[]>;
  serverTrainingDelete: armyTrainId[];
  setServerTrainingDelete: SetStateAction<armyTrainId[]>;

  contracts: Contract[];
  setContracts: SetStateAction<Contract[]>;
  updateContract: (id: string, newData: MergedContractChanges) => void;
  serverContractUpdate: ServerContractUpdate[];
  setServerContractUpdate: SetStateAction<ServerContractUpdate[]>;
  serverContractDelete: ContractId[];
  setServerContractDelete: SetStateAction<ContractId[]>;

  buildBuildings: newBuilding[];
  setBuildBuildings: SetStateAction<newBuilding[]>;
  serverBuildingsDelete: BuildingId[];
  setServerBuildingsDelete: SetStateAction<BuildingId[]>;
  serverCancelBuilding: HexId[];
  setServerCancelBuilding: SetStateAction<HexId[]>;

  buildRoads: roadObject[];
  setBuildRoads: SetStateAction<roadObject[]>;
  serverCancelRoadBuilding: RoadId[];
  setServerCancelRoadBuilding: SetStateAction<RoadId[]>;

  armyMove: armyIntent[];
  setArmyMove: SetStateAction<armyIntent[]>;
};

export const useIntentStore = create<StoreType>((set) => ({
  armyTraining: [],
  setArmyTraining: (value) =>
    set((state) => ({
      armyTraining: resolveValue(value, state.armyTraining),
    })),
  serverTrainingDelete: [],
  setServerTrainingDelete: (value) =>
    set((state) => ({
      serverTrainingDelete: resolveValue(value, state.serverTrainingDelete),
    })),

  // contracts
  contracts: [],
  setContracts: (value) =>
    set((state) => ({
      contracts: resolveValue(value, state.contracts),
    })),
  updateContract: (id, newData) =>
    set((state) => ({
      contracts: state.contracts.map((c) => (c.id === id ? { ...c, ...newData } : c)),
    })),
  serverContractUpdate: [],
  setServerContractUpdate: (value) =>
    set((state) => ({
      serverContractUpdate: resolveValue(value, state.serverContractUpdate),
    })),
  serverContractDelete: [],
  setServerContractDelete: (value) =>
    set((state) => ({
      serverContractDelete: resolveValue(value, state.serverContractDelete),
    })),

  // buildings
  buildBuildings: [],
  setBuildBuildings: (value) =>
    set((state) => ({
      buildBuildings: resolveValue(value, state.buildBuildings),
    })),
  serverBuildingsDelete: [],
  setServerBuildingsDelete: (value) =>
    set((state) => ({
      serverBuildingsDelete: resolveValue(value, state.serverBuildingsDelete),
    })),
  serverCancelBuilding: [],
  setServerCancelBuilding: (value) =>
    set((state) => ({
      serverCancelBuilding: resolveValue(value, state.serverCancelBuilding),
    })),

  buildRoads: [],
  setBuildRoads: (value) =>
    set((state) => ({
      buildRoads: resolveValue(value, state.buildRoads),
    })),
  serverCancelRoadBuilding: [],
  setServerCancelRoadBuilding: (value) =>
    set((state) => ({
      serverCancelRoadBuilding: resolveValue(value, state.serverCancelRoadBuilding),
    })),

  armyMove: [],
  setArmyMove: (value) =>
    set((state) => ({
      armyMove: resolveValue(value, state.armyMove),
    })),
}));
