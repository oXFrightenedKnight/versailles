import { Popup, SetStateAction } from "@/lib/stores/uiStore";

export const PopupText = {
  max_level_reached: {
    body: "This building is already at max level.",
  },
  building_type_mismatch: {
    body: "Building type doesn't match.",
  },
  missing_gold: {
    body: "Not enough gold to build.",
  },
};

export function createNewPopup(
  setPopup: SetStateAction<Popup | null>,
  message: keyof typeof PopupText
) {
  setPopup({
    id: crypto.randomUUID(),
    ...PopupText[message],
  });
}
