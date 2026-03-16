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

export function getHexByAxial(q: number, r: number, mapHexes: Hex[]) {
  return mapHexes.find((hex) => hex.q === q && hex.r === r);
}

export function randomNumber(a: number, b: number) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
