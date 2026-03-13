import { findNeighbors, Hex, Nation, NATION_NAMES } from "@repo/shared";
import { Biome, BIOME_COLOR, HEX_SIZE } from "./map_data";
import { armyIntent, buildRoads } from "@/app/game/page";

export type roadArray = {
  id: string[];
  hexId: number;
}[];

const biomePatterns: Partial<Record<Biome, CanvasPattern>> = {};
const texturePatterns: Partial<Record<string, CanvasPattern>> = {};

const flagCache: Record<string, HTMLImageElement> = {};

function getFlag(nationName: string) {
  if (!flagCache[nationName]) {
    const img = new Image();
    img.src = `/flags/${nationName}_flag.png`;
    flagCache[nationName] = img;
  }

  return flagCache[nationName];
}

export function initBiomePatterns(ctx: CanvasRenderingContext2D): Promise<void> {
  return new Promise((resolve) => {
    const images: Record<Biome, HTMLImageElement> = {
      forest: new window.Image(),
      desert: new window.Image(),
      plains: new window.Image(),
      mountains: new window.Image(),
    };

    let loaded = 0;
    const total = Object.keys(images).length;

    for (const biome in images) {
      const img = images[biome as Biome];
      img.src = `/biomes/${biome}.png`;

      const SCALE = 0.1;

      img.onload = () => {
        const pattern = ctx.createPattern(img, "repeat")!;
        pattern.setTransform(new DOMMatrix().translate(32, 32).scale(SCALE));
        biomePatterns[biome as Biome] = pattern;

        loaded++;

        if (loaded === total) {
          resolve();
        }
      };
    }
  });
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
      img.src = `/textures/${texture}.png`;

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

  // 1️⃣ переносим (0,0) в центр хекса
  ctx.translate(centerX, centerY);

  // 2️⃣ рисуем хекс ВОКРУГ (0,0)
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
      ctx.fillStyle = biomePatterns[biome as Biome]!;
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

  // 1️⃣ переносим (0,0) в центр хекса
  ctx.translate(centerX, centerY);

  // 2️⃣ рисуем хекс ВОКРУГ (0,0)
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

function drawArrow(
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

export function drawRoad({
  ctx,
  x1,
  y1,
  x2,
  y2,
  opacity = 1,
  pattern,
  roadWidth = 18,
}: {
  ctx: CanvasRenderingContext2D;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  opacity?: number;
  pattern: CanvasPattern;
  roadWidth?: number;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;

  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);

  ctx.save();

  ctx.globalAlpha = opacity;

  // переносим начало координат в центр первого хекса
  ctx.translate(x1, y1);

  // поворачиваем систему координат по направлению дороги
  ctx.rotate(angle);

  ctx.fillStyle = pattern;

  // рисуем прямоугольник дороги
  ctx.fillRect(
    0, // начало дороги
    -roadWidth / 2, // центрируем по линии
    length, // длина дороги
    roadWidth // ширина дороги
  );

  ctx.restore();
}

function drawAllRoads({
  roadArray,
  mapHexes,
  ctx,
}: {
  roadArray: roadArray;
  mapHexes: Hex[];
  ctx: CanvasRenderingContext2D;
}) {
  // draw queued roads
  const roadHexIdSet = new Set<number>();
  const queuedRoadsMap = new Set<number[]>();

  const pattern = texturePatterns["road"];
  if (!pattern) {
    console.log("No pattern!");
    return;
  }

  roadArray.forEach((obj) => roadHexIdSet.add(obj.hexId));
  for (const roadObject of roadArray) {
    // change to hexes with roads (df to remove duplicates)

    const hex = mapHexes.find((h) => h.id === roadObject.hexId);
    if (!hex) continue;

    const neighbors = findNeighbors(hex, mapHexes);
    if (!neighbors) continue;

    for (const neighbor of neighbors) {
      const hasDuplicate =
        queuedRoadsMap.has([hex.id, neighbor.id]) || queuedRoadsMap.has([neighbor.id, hex.id]);
      if (!roadHexIdSet.has(neighbor.id) || hasDuplicate) continue;

      const neighborObj = roadArray.find((obj) => obj.hexId === neighbor.id);
      if (!neighborObj || neighborObj.id.some((id) => roadObject.id.includes(id))) continue;

      queuedRoadsMap.add([hex.id, neighbor.id]);

      const { x: x1, y: y1 } = hexToPixel(hex.q, hex.r);
      const { x: x2, y: y2 } = hexToPixel(neighbor.q, neighbor.r);

      drawRoad({ ctx, x1, x2, y1, y2, opacity: 0.7, pattern: pattern });
    }
  }

  // draw real roads
  const allRoadHexes = mapHexes.filter((hex) => hex.road);
  const drawnRoadsMap = new Set<number[]>();
  for (const hex of allRoadHexes) {
    const neighbors = findNeighbors(hex, mapHexes);
    if (neighbors.length === 0) continue;

    // draw roads if neighbor id matches
    for (const neighbor of neighbors) {
      if (
        drawnRoadsMap.has([hex.id, neighbor.id]) ||
        drawnRoadsMap.has([neighbor.id, hex.id]) ||
        !hex.road
      )
        continue;
      drawnRoadsMap.add([hex.id, neighbor.id]);
      const includesNeighborId = hex.road.id.some((id) => neighbor.road?.id.includes(id));
      if (!neighbor.road || !includesNeighborId) continue;

      const { x: x1, y: y1 } = hexToPixel(hex.q, hex.r);
      const { x: x2, y: y2 } = hexToPixel(neighbor.q, neighbor.r);

      drawRoad({ ctx, x1, x2, y1, y2, opacity: 1, pattern: pattern });
    }
  }
}

function hexToPixel(q: number, r: number) {
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
  ctx: CanvasRenderingContext2D,
  clickCtx: CanvasRenderingContext2D,
  mapCenterX: number,
  mapCenterY: number,
  selectedHexId: number | null,
  blinkTime: number,
  mapHexes: Hex[],
  nations: Nation[],
  armyMove: armyIntent[],
  buildRoads: buildRoads
) {
  // set of neighbor ids
  const neighbors = new Set<number>();

  // if selected hex has player army highlight bordering hexes
  const selectedHex = mapHexes.find((hex) => hex.id === selectedHexId);
  const player = nations.find((nation) => nation.isPlayer);
  // if hex, player exist and player has army in selected hex...
  if (selectedHex && player && selectedHex.army.some((obj) => obj.nationId === player.id)) {
    const find = findNeighbors(selectedHex, mapHexes);
    // add all neighbouring hexes to the Set to highlight after
    find.forEach((hex) => neighbors.add(hex.id));
  }

  // draw arrows for army intent
  for (const obj of armyMove) {
    const originalHex = mapHexes.find((hex) => hex.id === obj.hexId);
    if (!originalHex) {
      console.error("Could not find matching original hex!");
      continue;
    }

    const targetQ = originalHex.q + obj.direction.dq;
    const targetR = originalHex.r + obj.direction.dr;

    const destinationHex = mapHexes.find((hex) => hex.q === targetQ && hex.r === targetR);

    if (!destinationHex) continue;

    const { x: x2, y: y2 } = hexToPixel(destinationHex.q, destinationHex.r);
    const { x, y } = hexToPixel(originalHex.q, originalHex.r);
    drawArrow(clickCtx, x, y, x2, y2, "black", 8, 0, 0, 12, 16, 0.1);
    drawArrow(clickCtx, x, y, x2, y2, "red", 4.5, -3, 2, 8, 11, 0);
    // drawArrow(clickCtx, x, y, x2, y2, "red", 4, 12);
  }

  mapHexes.map((hex) => {
    const { x, y } = hexToPixel(hex.q, hex.r);

    drawPolygon({
      ctx: ctx,
      centerX: mapCenterX + x,
      centerY: mapCenterY + y,
      radius: HEX_SIZE - 1,
      rotation: Math.PI / 6,
      biome: hex.biome,
      id: hex.id,
      nations: nations,
      mapHexes: mapHexes,
    });
  });

  // draw invisible click map
  mapHexes.map((hex) => {
    const { x, y } = hexToPixel(hex.q, hex.r);
    let isSelected: boolean = false;

    // code to run if there is any selected hex
    if (selectedHexId !== null) {
      // select only hexes that is selected by player or neighbor
      isSelected = hex.id === selectedHexId || neighbors.has(hex.id);
    }

    if (hex.army.length !== 0) {
      const array = hex.army.map((obj) => {
        const nationName = getNationName({ id: obj.nationId });

        return {
          text: obj.amount.toString(),
          icon: getFlag(nationName), // getting image from cash to avoid
          // creating too many images
        };
      });
      drawLabelArray(ctx, array, mapCenterX + x, mapCenterY + y);
    }

    drawClickPolygon({
      ctx: clickCtx,
      centerX: mapCenterX + x,
      centerY: mapCenterY + y,
      radius: HEX_SIZE - 1,
      rotation: Math.PI / 6,
      isSelected: isSelected,
      blinkTime: blinkTime,
    });
  });

  drawAllRoads({ ctx: clickCtx, mapHexes, roadArray: buildRoads });
}

export function getNationName({ id }: { id: string }) {
  const entry = Object.entries(NATION_NAMES).find(([_, value]) => value === id);

  const key = entry?.[0] ? entry?.[0] : "tribes";
  return key;
}

export function numberConverter(number: string) {
  if (Number(number)) {
    if (Number(number) >= 1000000) {
      return `${(Number(number) / 1000000).toFixed(1)}M`;
    } else if (Number(number) >= 1000) {
      return `${(Number(number) / 1000).toFixed(1)}k`;
    }
  }
  return `${number}`; // return unchanged if not a number
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

  // фон
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

  // иконка
  ctx.drawImage(iconImg, boxX + paddingX - 3, boxY + paddingY, iconSize + 6, iconSize);

  // текст
  ctx.fillStyle = "white";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  ctx.fillText(numberConverter(text), boxX + paddingX + iconSize + gap, centerY);
}

function drawLabelArray(
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
