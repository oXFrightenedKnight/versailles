import { create } from "zustand";
import { PendingAction } from "../types/actions";
import { ActionType, ActionOfType } from "@repo/shared/actions";

// custom react-like setState function type for zustland store
export type SetStateAction<T> = (value: T | ((prev: T) => T)) => void;

export type StoreType = {
  gameActions: PendingAction[];

  createGameAction: (action: PendingAction) => void;
  updateGameAction: <T extends ActionType>(
    actionid: string,
    type: T,
    update: Partial<Omit<ActionOfType<T>, "id" | "type">>
  ) => void;
  deleteGameAction: (actionId: string) => void;
  getGameAction: (actionId: string) => PendingAction | undefined;
  getGameActionsOfType: <T extends ActionType>(type: T) => PendingAction[];

  reset: () => void;
};

const initialState = {
  gameActions: [],
};

export const useIntentStore = create<StoreType>((set, get) => ({
  ...initialState,
  createGameAction: (action) =>
    set((state) => ({
      gameActions: [...state.gameActions, action],
    })),
  updateGameAction: (id, type, update) =>
    set((state) => {
      const original = state.gameActions.find(
        (item) => item.action.id === id && item.action.type === type
      );

      if (!original) {
        return state;
      }

      return {
        gameActions: state.gameActions.map((item) =>
          item.action.id === id
            ? {
                ...item,
                action: {
                  ...item.action,
                  ...update,
                },
              }
            : item
        ),
      };
    }),
  deleteGameAction: (actionId) =>
    set((state) => ({
      gameActions: state.gameActions.filter((a) => a.action.id !== actionId),
    })),
  getGameAction: (actionId) => {
    const actions = get().gameActions;

    return actions.find((a) => a.action.id === actionId);
  },
  getGameActionsOfType: (type) => {
    const actions = get().gameActions;

    return actions.filter((a) => a.action.type === type);
  },

  reset: () => set(initialState),
}));
