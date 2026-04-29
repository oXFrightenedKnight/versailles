import { Building } from "@repo/shared";
import { useIntentStore } from "../intentStore";
import { ArmyTraining } from "../types/game";

export type TrainingVM = {
  barrackId: string;
  id: string;
  amount: number;
  progress: number;
  owner: string;
  fromServer: boolean;
};

export function getTrainingArmyServer(barrack: Building) {
  const serverTrainingDelete = useIntentStore.getState().serverTrainingDelete;
  const deletedTrainingSet = new Set<string>(serverTrainingDelete);

  const trainingTroops = barrack?.trainingTroops ?? [];

  return trainingTroops
    .filter((t) => !deletedTrainingSet.has(t.id)) // exclude server delete intent
    .map((t) => ({
      barrackId: barrack.id,
      id: t.id,
      amount: t.amount,
      progress: t.progress,
      owner: t.nationId,
      fromServer: true,
    })) as TrainingVM[];
}

export function mergeTrainingArmyClient(barrackId: string, armyTraining: ArmyTraining[]) {
  return armyTraining
    .filter((t) => t.barrackId === barrackId)
    .map((t) => ({
      barrackId: barrackId,
      id: t.id,
      amount: t.amount,
      progress: t.progress,
      owner: t.owner,
      fromServer: false,
    })) as TrainingVM[];
}

export function mergeTraining(serverTraining: TrainingVM[], clientTraining: TrainingVM[]) {
  return [...serverTraining, ...clientTraining];
}

export function cancelServerTraining(id: string) {
  const setServerTrainingDelete = useIntentStore.getState().setServerTrainingDelete;

  setServerTrainingDelete((prev) => {
    const existing = prev.includes(id);

    if (!existing) return [...prev, id];
    return prev;
  });
}

export function cancelClientTraining(id: string) {
  const setArmyTraining = useIntentStore.getState().setArmyTraining;

  setArmyTraining((prev) => {
    const existing = prev.find((t) => t.id === id);

    if (existing) {
      const filtered = prev.filter((t) => t.id !== id);
      return [...filtered];
    }
    return prev;
  });
}
