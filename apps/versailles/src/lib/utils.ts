import { Hex } from "@repo/shared";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isLastElement(array: unknown[], element: unknown) {
  // Find the index of the element
  const index = array.indexOf(element);

  // Return true if the index is the last index in the array
  return index !== -1 && index === array.length - 1;
}

export function getHexById(id: number, mapHexes: Hex[]) {
  // switch to db request later

  for (const hex of mapHexes) {
    if (hex.id === id) {
      return hex as Hex;
    }
  }
  return null;
}

export function lerp(a: number, b: number, t: number) {
  return a * (1 - t) + b * t;
}
