import { getBiomeTexture, getBuildingCategoryIcon, getTextureImage } from "@/lib/data";
import { numberConverter } from "@/lib/utils";
import { Biome, BIOMES, Hex } from "@repo/shared/data/hex_map";
import { Nation } from "@repo/shared/data/nations";
import { findNeighbors } from "@repo/shared/helpers/hex_map";
import { CanvasRuntime, CanvasSnapshot } from "../types";
import { renderEconomyMap } from "./modes/economy";
import { renderMilitaryMap } from "./modes/military";
import { BIOME_COLOR, HEX_SIZE } from "./policy";

const biomePatterns: Partial<Record<Biome, CanvasPattern>> = {};
const texturePatterns: Partial<Record<string, CanvasPattern>> = {};

export function initBiomePatterns(ctx: CanvasRenderingContext2D): Promise<void> {
  return Promise.all(
    BIOMES.map(
      (biome) =>
        new Promise<void>((resolve, reject) => {
          const img = new window.Image();

          img.onload = () => {
            const pattern = ctx.createPattern(img, "repeat");

            if (!pattern) {
              reject(new Error(`Could not create pattern for ${biome}`));
              return;
            }

            pattern.setTransform(new DOMMatrix().translate(32, 32).scale(0.1));

            biomePatterns[biome] = pattern;
            resolve();
          };

          img.onerror = () => {
            reject(new Error(`Could not load texture for ${biome}`));
          };

          // Assign after registering the handlers.
          img.src = getBiomeTexture(biome);
        })
    )
  ).then(() => undefined);
}

export function initTextures(ctx: CanvasRenderingContext2D): Promise<void> {
  return new Promise((resolve) => {
    const images: Record<string, HTMLImageElement> = {
      road: new window.Image(),
    };

    let loaded = 0;
    const total = Object.keys(images).length;

    for (const texture in images) {
      const img = images[texture];
      img.src = getTextureImage(texture);

      const SCALE = 0.1;

      img.onload = () => {
        const pattern = ctx.createPattern(img, "repeat")!;
        pattern.setTransform(new DOMMatrix().translate(32, 32).scale(SCALE));
        texturePatterns[texture] = pattern;

        loaded++;

        if (loaded === total) {
          resolve();
        }
      };
    }
  });
}

function drawPolygon({
  ctx,
  centerX,
  centerY,
  radius,
  rotation,
  biome,
  id,
  nations,
  mapHexes,
}: {
  ctx: CanvasRenderingContext2D;
  centerX: number;
  centerY: number;
  radius: number;
  rotation: number;
  biome: Biome | null;
  id: number;
  nations: Nation[];
  mapHexes: Hex[];
}) {
  ctx.save();

  // move to hex center
  ctx.translate(centerX, centerY);

  // draw hex around (0,0)
  ctx.beginPath();

  for (let i = 0; i < 6; i++) {
    const angle = ((Math.PI * 2) / 6) * i + rotation;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.closePath();

  ctx.lineWidth = 1;

  Object.keys(BIOME_COLOR).forEach((key) => {
    if (key === biome) {
      ctx.fillStyle = biomePatterns[biome]!;
      ctx.strokeStyle = BIOME_COLOR[key];
    }
  });

  ctx.fill();
  ctx.stroke();

  nations.map((nation) => {
    const nationTiles = mapHexes.filter((hex) => hex.owner === nation.id);
    nationTiles.map((hex) => {
      if (hex.id === id) {
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = nation.color;
        ctx.fill();

        // set provinces that are controlled by no one to be specific color (like black)
      }
    });
  });
  ctx.globalAlpha = 1;

  ctx.restore();
}

// draw invisible polygons for clicking
function drawClickPolygon({
  ctx,
  centerX,
  centerY,
  radius,
  rotation,
  isSelected,
  blinkTime,
}: {
  ctx: CanvasRenderingContext2D;
  centerX: number;
  centerY: number;
  radius: number;
  rotation: number;
  isSelected: boolean;
  blinkTime: number;
}) {
  ctx.save();

  // translate (0, 0) to hex center
  ctx.translate(centerX, centerY);

  // draw hex around (0, 0)
  ctx.beginPath();

  for (let i = 0; i < 6; i++) {
    const angle = ((Math.PI * 2) / 6) * i + rotation;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.closePath();

  ctx.lineWidth = 3;

  if (!isSelected) {
    ctx.restore();
    return;
  }

  const pulse = Math.sin(blinkTime * 3);

  const alpha = 0.15 + 0.15 * (0.5 + 0.5 * pulse);
  const scale = 1 + 0.05 * Math.sin(blinkTime * 3);

  ctx.globalAlpha = alpha;
  ctx.scale(scale, scale);

  ctx.fillStyle = "rgba(240,240,240,1)";
  ctx.strokeStyle = "#FFFFFF";

  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
  length: number,
  lineOffset: number,
  headWidth: number,
  headLength: number,
  headOffset: number,
  { opacity = 0.7 } = {}
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy); // line length

  const ux = dx / len;
  const uy = dy / len;

  // find perpendicular (90 degree vector)
  const px = uy;
  const py = -ux;

  // apply offset
  const startX = x1 + ux * lineOffset;
  const startY = y1 + uy * lineOffset;

  const endX = x2 + ux * length;
  const endY = y2 + uy * length;

  const lineEndX = endX - ux * headLength;
  const lineEndY = endY - uy * headLength;

  ctx.globalAlpha = opacity;
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";

  // DRAW LINE
  ctx.strokeStyle = color;
  ctx.lineWidth = width;

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(lineEndX, lineEndY);
  ctx.stroke();

  // ARROW HEAD
  const tipX = endX - ux * headOffset;
  const tipY = endY - uy * headOffset;

  const leftX = tipX - ux * headLength + px * headWidth;
  const leftY = tipY - uy * headLength + py * headWidth;

  const rightX = tipX - ux * headLength - px * headWidth;
  const rightY = tipY - uy * headLength - py * headWidth;

  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(leftX, leftY);
  ctx.lineTo(rightX, rightY);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function hexToPixel(q: number, r: number) {
  const x = HEX_SIZE * Math.sqrt(3) * (q + r / 2);
  const y = ((HEX_SIZE * 3) / 2) * r;

  return { x, y };
}
export function pixelToHex({ x, y, mapHexes }: { x: number; y: number; mapHexes: Hex[] }) {
  const r = y / ((HEX_SIZE * 3) / 2);
  const q = x / (HEX_SIZE * Math.sqrt(3)) - r / 2;

  const qf = q;
  const rf = r;
  const sf = -qf - rf;

  let rq = Math.round(qf);
  let rr = Math.round(rf);
  let rs = Math.round(sf);

  const dq = Math.abs(rq - qf);
  const dr = Math.abs(rr - rf);
  const ds = Math.abs(rs - sf);

  if (dq > dr && dq > ds) {
    rq = -rr - rs;
  } else if (dr > ds) {
    rr = -rq - rs;
  } else {
    rs = -rq - rr;
  }

  const hex = mapHexes.find((h) => h.q === rq && h.r === rr);
  return { hex, axial: { q: rq, r: rr } };
}

export function renderMap(
  mapCenterX: number,
  mapCenterY: number,
  snapshot: CanvasSnapshot,
  runtime: CanvasRuntime
) {
  // set of neighbor ids
  const neighbors = new Set<number>();

  // if selected hex has player army highlight bordering hexes
  const selectedHex = snapshot.mapHexes.find((hex) => hex.id === snapshot.selectedHexId);
  const player = snapshot.nations.find((nation) => nation.isPlayer);
  // if hex, player exist and player has army in selected hex...
  if (selectedHex && player && selectedHex.army.some((obj) => obj.nationId === player.id)) {
    const find = findNeighbors(selectedHex, snapshot.mapHexes);
    // add all neighbouring hexes to the Set to highlight after
    find.forEach((hex) => neighbors.add(hex.id));
  }

  snapshot.mapHexes.map((hex) => {
    const { x, y } = hexToPixel(hex.q, hex.r);

    drawPolygon({
      ctx: runtime.canvas.mainContext,
      centerX: mapCenterX + x,
      centerY: mapCenterY + y,
      radius: HEX_SIZE - 1,
      rotation: Math.PI / 6,
      biome: hex.biome,
      id: hex.id,
      nations: snapshot.nations,
      mapHexes: snapshot.mapHexes,
    });
  });

  // draw invisible click map
  snapshot.mapHexes.map((hex) => {
    const { x, y } = hexToPixel(hex.q, hex.r);
    let isSelected: boolean = false;

    // code to run if there is any selected hex
    if (snapshot.selectedHexId !== null) {
      // select only hexes that are selected by player or neighbor
      isSelected = hex.id === snapshot.selectedHexId || neighbors.has(hex.id);
    }

    drawClickPolygon({
      ctx: runtime.canvas.hitContext,
      centerX: mapCenterX + x,
      centerY: mapCenterY + y,
      radius: HEX_SIZE - 1,
      rotation: Math.PI / 6,
      isSelected: isSelected,
      blinkTime: runtime.animation.blinkTime,
    });
  });

  switch (snapshot.openMenu) {
    case "build":
      console.log("try to render economy map");
      renderEconomyMap(mapCenterX, mapCenterY, snapshot, runtime);
      break;
    case "diplo":
      console.log("try to render economy map");
      renderMilitaryMap(mapCenterX, mapCenterY, snapshot, runtime);
      break;
    default:
      renderMilitaryMap(mapCenterX, mapCenterY, snapshot, runtime);
      break;
  }
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  iconImg: HTMLImageElement,
  centerX: number,
  centerY: number
) {
  ctx.font = "12px Arial";

  const paddingX = 6;
  const paddingY = 4;
  const iconSize = 12;
  const gap = 4;

  const textWidth = ctx.measureText(text).width;

  const boxWidth = iconSize + gap + textWidth + paddingX * 2;
  const boxHeight = iconSize + paddingY * 2;

  const boxX = centerX - boxWidth / 2;
  const boxY = centerY - boxHeight / 2;

  // background
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

  // icon
  ctx.drawImage(iconImg, boxX + paddingX - 3, boxY + paddingY, iconSize + 6, iconSize);

  // text
  ctx.fillStyle = "white";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  ctx.fillText(numberConverter(Number(text)), boxX + paddingX + iconSize + gap, centerY);
}

export function drawLabelArray(
  ctx: CanvasRenderingContext2D,
  array: {
    text: string;
    icon: HTMLImageElement;
  }[],
  centerX: number,
  centerY: number
) {
  const lineHeight = 18;

  const startY = centerY - ((array.length - 1) * lineHeight) / 2;

  array.forEach((item, i) => {
    drawLabel(ctx, item.text, item.icon, centerX, startY + i * lineHeight);
  });
}
