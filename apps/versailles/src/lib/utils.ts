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

export function lerp(a: number, b: number, t: number) {
  return a * (1 - t) + b * t;
}

export function randomNumber(a: number, b: number) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

export function resolveValue<T>(value: T | ((prev: T) => T), prev: T): T {
  if (typeof value === "function") {
    return (value as (prev: T) => T)(prev); // tell ts that value is for sure a
    // function and call it along with passing prev (old data)
  }
  return value;
}

export function numberConverter(number: number) {
  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(1)}M`;
  } else if (Number(number) >= 1000) {
    return `${(number / 1000).toFixed(1)}k`;
  }

  return `${number}`; // return unchanged if not a number
}
