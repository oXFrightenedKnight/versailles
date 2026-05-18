import { PopupText } from "../data";
import { SetStateAction } from "../stores/intentStore";
import { Popup } from "../stores/uiStore";

export function createNewPopup(
  setPopup: SetStateAction<Popup | null>,
  message: keyof typeof PopupText
) {
  setPopup({
    id: crypto.randomUUID(),
    ...PopupText[message],
  });
}
