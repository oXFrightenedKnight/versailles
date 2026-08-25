import { MODIFIER, MODIFIER_CATEGORIES } from "@repo/shared";
import { GameCtx } from "../trpc/index.js";

export function calculateModifiers({
  category,
  baseValue,
  gameCtx,
  nationId,
}: {
  category: MODIFIER_CATEGORIES;
  gameCtx: GameCtx;
  baseValue: number;
  nationId: string;
}) {
  const { modifiers } = gameCtx;

  let modValue = 0;

  for (const modifier of modifiers) {
    if (modifier.category !== category || modifier.owner !== nationId) continue;

    // flat mods
    if (modifier.type === "flat") {
      modValue += modifier.value;
    }

    // percentage mods
    if (modifier.type === "percent") {
      modValue += baseValue * modifier.value;
    }
  }

  return modValue;
}

export function addModifier({
  gameCtx,
  category,
  nationId,
  type,
  value,
}: {
  gameCtx: GameCtx;
  category: MODIFIER_CATEGORIES;
  nationId: string;
  type: "flat" | "percent";
  value: number;
}) {
  const mod: MODIFIER = {
    category: category,
    owner: nationId,
    type,
    value, // flat: +N, percent: decimal (0.1 = +10%)
  };

  gameCtx.modifiers.push(mod);
}
