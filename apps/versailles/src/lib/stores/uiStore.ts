import { create } from "zustand";
import { resolveValue } from "../utils";

// custom react-like setState function type for zustland store
export type SetStateAction<T> = (value: T | ((prev: T) => T)) => void;

export type Popup = {
  header?: string;
  body: string;
};

export type StoreType = {
  popup: Popup | null;
  setPopup: SetStateAction<Popup | null>;

  reset: () => void;
};

const initialState = {
  popup: null,
};

export const useUIStore = create<StoreType>((set) => ({
  ...initialState,

  setPopup: (value) =>
    set((state) => ({
      popup: resolveValue(value, state.popup),
    })),

  reset: () => set(initialState),
}));
