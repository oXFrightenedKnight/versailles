import { CanvasRuntime, CanvasSnapshot } from "@/canvas/types";
import { getBuildingCategoryImage } from "@/lib/helpers/imageCache/buildings";
import { getBuildingsByIdMap } from "@repo/shared";
import { hexToPixel } from "../render";
import { drawAllRoads } from "../roads/roads";

export function drawBuildingIcon(
  ctx: CanvasRenderingContext2D,
  iconImg: HTMLImageElement,
  centerX: number,
  centerY: number
) {
  console.log({
    src: iconImg.src,
    complete: iconImg.complete,
    naturalWidth: iconImg.naturalWidth,
    naturalHeight: iconImg.naturalHeight,
  });
  ctx.font = "12px Arial";

  const paddingX = 10;
  const paddingY = 6;

  const iconSize = 64;
  const iconHeight = iconSize * (iconImg.naturalHeight / iconImg.naturalWidth);

  const gap = 4;

  const boxWidth = iconSize + gap + paddingX * 2;
  const boxHeight = iconSize + paddingY * 2;

  const boxX = centerX - boxWidth / 2;
  const boxY = centerY - boxHeight / 2;

  const boxCenterX = boxX + boxWidth / 2;
  const boxCenterY = boxY + boxHeight / 2;

  const imageX = boxCenterX - iconSize / 2;
  const imageY = boxCenterY - iconHeight / 2;

  // icon
  ctx.drawImage(iconImg, imageX, imageY, iconSize, iconHeight);
}

export function renderEconomyMap(
  mapCenterX: number,
  mapCenterY: number,
  snapshot: CanvasSnapshot,
  runtime: CanvasRuntime
) {
  const buildingMap = getBuildingsByIdMap(snapshot.buildings);

  drawAllRoads({
    ctx: runtime.canvas.hitContext,
    mapHexes: snapshot.mapHexes,
    tempRoad: runtime.road.draft,
    roads: snapshot.roads,
  });

  for (const h of snapshot.mapHexes) {
    const building = h.buildingId ? buildingMap.get(h.buildingId) : undefined;
    if (!building) continue;

    const { x, y } = hexToPixel(h.q, h.r);

    const image = getBuildingCategoryImage(building.category);
    if (!image) continue;

    drawBuildingIcon(runtime.canvas.mainContext, image, mapCenterX + x, mapCenterY + y);
  }
}
