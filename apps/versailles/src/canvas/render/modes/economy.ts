import { CanvasRuntime, CanvasSnapshot } from "@/canvas/types";
import { fitText, hexToPixel } from "../render";
import { drawAllRoads } from "../roads/roads";
import { getBuildingCategoryImage, getMiscImage } from "@/lib/helpers/imageCache/cache";
import { getBuildingsByIdMap } from "@repo/shared/buildings";

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

function drawLevelLabel(
  ctx: CanvasRenderingContext2D,
  level: number,
  centerX: number,
  centerY: number
) {
  const img = getMiscImage("level_label");
  if (!img) return;

  const iconSize = 20;
  const iconHeight = iconSize * (img.naturalHeight / img.naturalWidth);

  const paddingX = 10;
  const paddingY = 6;

  const offsetX = 12;
  const offsetY = -12;

  const gap = 4;

  const boxWidth = iconSize + gap + paddingX * 2;
  const boxHeight = iconSize + paddingY * 2;

  const boxX = centerX - boxWidth / 2;
  const boxY = centerY - boxHeight / 2;

  const boxCenterX = boxX + boxWidth / 2;
  const boxCenterY = boxY + boxHeight / 2;

  const imageX = boxCenterX - iconSize / 2 + offsetX;
  const imageY = boxCenterY - iconSize / 2 + offsetY;

  ctx.drawImage(img, imageX, imageY, iconSize, iconHeight);

  const imageCenterX = imageX + iconSize / 2;
  const imageCenterY = imageY + iconHeight / 2;

  // text
  const text = level.toString();

  ctx.fillStyle = "yellow";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  fitText(ctx, text, 18);

  ctx.fillText(text, imageCenterX, imageCenterY + 1);
}

export function renderEconomyMap(
  mapCenterX: number,
  mapCenterY: number,
  snapshot: CanvasSnapshot,
  runtime: CanvasRuntime
) {
  const buildingMap = getBuildingsByIdMap(snapshot.buildings);

  drawAllRoads({
    ctx: runtime.canvas.mainContext,
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

    // building icon
    drawBuildingIcon(runtime.canvas.mainContext, image, mapCenterX + x, mapCenterY + y);

    // level label
    drawLevelLabel(runtime.canvas.mainContext, building.level, mapCenterX + x, mapCenterY + y);
  }
}
