export const BASE_PREP = 10; // base prep time for ai before attacking
export const CANCEL_RATIO = 1.4; // maximum army ratio for ai to stop considering attacking first

export const WAR_CONSIDERATION_RATIO = 1.6; // minimum ratio for ai to consider attacking first
export const STRONG_WAR_RATIO = 3;
export const MIN_WAR_CHANCE = 0.2;
export const MAX_WAR_CHANCE = 0.95;

// returns attack chance based on army ratio
// plannig also uses it. consider moving to analysis
export function getWarInitiationChance(ratio: number): number {
  if (ratio < WAR_CONSIDERATION_RATIO) {
    return 0;
  }

  const t = Math.min(
    1,
    (ratio - WAR_CONSIDERATION_RATIO) / (STRONG_WAR_RATIO - WAR_CONSIDERATION_RATIO)
  );

  const smoothT = t * t * (3 - 2 * t);

  return MIN_WAR_CHANCE + (MAX_WAR_CHANCE - MIN_WAR_CHANCE) * smoothT;
}
