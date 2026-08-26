import { Hex } from "@repo/shared";
import { axialToCube, cubeDistance } from "@repo/shared/map";

export function calcHexDist(hex1: Hex, hex2: Hex) {
  const dist1 = axialToCube(hex1.q, hex1.r);
  const dist2 = axialToCube(hex2.q, hex2.r);
  return cubeDistance(dist1, dist2);
}

export function getDeltaAxial(
  startAxial: { q: number; r: number },
  endAxial: { q: number; r: number }
) {
  return { dq: endAxial.q - startAxial.q, dr: endAxial.r - startAxial.r };
}
