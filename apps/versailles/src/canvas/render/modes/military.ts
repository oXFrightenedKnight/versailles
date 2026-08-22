import { CanvasRuntime, CanvasSnapshot } from "@/canvas/types";
import { drawArrow, drawLabelArray, hexToPixel } from "../render";
import { selectArmyMoves } from "@/lib/UI/mergeData/armyMove/selectors";
import { getFlagImage } from "@/lib/helpers/imageCache/cache";

export function renderMilitaryMap(
  mapCenterX: number,
  mapCenterY: number,
  snapshot: CanvasSnapshot,
  runtime: CanvasRuntime
) {
  // draw arrows for army intent
  for (const obj of selectArmyMoves(snapshot.gameActions)) {
    const originalHex = snapshot.mapHexes.find((hex) => hex.id === obj.hexId);
    if (!originalHex) {
      console.error("Could not find matching original hex!");
      continue;
    }

    const targetQ = originalHex.q + obj.direction.dq;
    const targetR = originalHex.r + obj.direction.dr;

    const destinationHex = snapshot.mapHexes.find((hex) => hex.q === targetQ && hex.r === targetR);

    if (!destinationHex) continue;

    const { x: x2, y: y2 } = hexToPixel(destinationHex.q, destinationHex.r);
    const { x, y } = hexToPixel(originalHex.q, originalHex.r);
    drawArrow(runtime.canvas.hitContext, x, y, x2, y2, "black", 8, 0, 0, 12, 16, 0.1);
    drawArrow(runtime.canvas.hitContext, x, y, x2, y2, "red", 4.5, -3, 2, 8, 11, 0);
  }

  // draw armies
  for (const h of snapshot.mapHexes) {
    if (h.army.length !== 0) {
      const { x, y } = hexToPixel(h.q, h.r);

      const array = h.army.flatMap((obj) => {
        const icon = getFlagImage(obj.nationId);

        return icon
          ? [
              {
                text: obj.amount.toString(),
                icon, // getting image from cash to avoid
                // creating too many images}
              },
            ]
          : [];
      });
      drawLabelArray(runtime.canvas.mainContext, array, mapCenterX + x, mapCenterY + y);
    }
  }
}
