import { create } from "zustand";
import { resolveValue } from "../utils";
import { armyIntent, ArmyTraining, Contract, newBuilding, roadObject } from "../types/game";
import { MergedContractChanges, ServerContractUpdate, MailAnswer } from "@repo/shared";

// custom react-like setState function type for zustland store
export type SetStateAction<T> = (value: T | ((prev: T) => T)) => void;

type ContractId = string;
type BuildingId = string;
type armyTrainId = string;
type HexId = number;
type RoadId = string;
type nationId = string;

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

  declareWar: nationId[];
  setDeclareWar: SetStateAction<nationId[]>;

  signPeace: nationId[];
  setSignPeace: SetStateAction<nationId[]>;

  readMails: string[];
  setReadMails: SetStateAction<string[]>;

  answeredMails: MailAnswer[];
  setAnsweredMails: SetStateAction<MailAnswer[]>;

  reset: () => void;
};

const initialState = {
  armyTraining: [],
  serverTrainingDelete: [],
  contracts: [],
  serverContractUpdate: [],
  serverContractDelete: [],
  buildBuildings: [],
  serverBuildingsDelete: [],
  serverCancelBuilding: [],
  buildRoads: [],
  serverCancelRoadBuilding: [],
  armyMove: [],
  declareWar: [],
  signPeace: [],
  readMails: [],
  answeredMails: [],
};

export const useIntentStore = create<StoreType>((set) => ({
  ...initialState,

  setArmyTraining: (value) =>
    set((state) => ({
      armyTraining: resolveValue(value, state.armyTraining),
    })),
  setServerTrainingDelete: (value) =>
    set((state) => ({
      serverTrainingDelete: resolveValue(value, state.serverTrainingDelete),
    })),

  // contracts
  setContracts: (value) =>
    set((state) => ({
      contracts: resolveValue(value, state.contracts),
    })),
  updateContract: (id, newData) =>
    set((state) => ({
      contracts: state.contracts.map((c) => (c.id === id ? { ...c, ...newData } : c)),
    })),
  setServerContractUpdate: (value) =>
    set((state) => ({
      serverContractUpdate: resolveValue(value, state.serverContractUpdate),
    })),
  setServerContractDelete: (value) =>
    set((state) => ({
      serverContractDelete: resolveValue(value, state.serverContractDelete),
    })),

  // buildings
  setBuildBuildings: (value) =>
    set((state) => ({
      buildBuildings: resolveValue(value, state.buildBuildings),
    })),
  setServerBuildingsDelete: (value) =>
    set((state) => ({
      serverBuildingsDelete: resolveValue(value, state.serverBuildingsDelete),
    })),
  setServerCancelBuilding: (value) =>
    set((state) => ({
      serverCancelBuilding: resolveValue(value, state.serverCancelBuilding),
    })),

  setBuildRoads: (value) =>
    set((state) => ({
      buildRoads: resolveValue(value, state.buildRoads),
    })),
  setServerCancelRoadBuilding: (value) =>
    set((state) => ({
      serverCancelRoadBuilding: resolveValue(value, state.serverCancelRoadBuilding),
    })),

  setArmyMove: (value) =>
    set((state) => ({
      armyMove: resolveValue(value, state.armyMove),
    })),

  setDeclareWar: (value) =>
    set((state) => ({
      declareWar: resolveValue(value, state.declareWar),
    })),

  setSignPeace: (value) =>
    set((state) => ({
      signPeace: resolveValue(value, state.declareWar),
    })),

  setReadMails: (value) =>
    set((state) => ({
      readMails: resolveValue(value, state.readMails),
    })),

  setAnsweredMails: (value) =>
    set((state) => ({
      answeredMails: resolveValue(value, state.answeredMails),
    })),

  reset: () => set(initialState),
}));
