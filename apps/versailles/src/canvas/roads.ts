import { roadObject } from "@/app/game/page";
import { hexToPixel } from "./render";
import { Hex, Road } from "@repo/shared";

export function mergeRoads(r1: roadObject, r2: roadObject, key: string) {
  const isStart1 = `${r1.points[0].q},${r1.points[0].r}` === key;
  const isStart2 = `${r2.points[0].q},${r2.points[0].r}` === key;

  // Подготавливаем первую дорогу: она должна ЗАКАНЧИВАТЬСЯ в точке стыка (key)
  // Если она начинается в key — переворачиваем её
  const p1 = isStart1 ? [...r1.points].reverse() : [...r1.points];

  // Подготавливаем вторую дорогу: она должна НАЧИНАТЬСЯ в точке стыка (key)
  // Если она НЕ начинается в key (значит заканчивается там) — переворачиваем её
  const p2 = !isStart2 ? [...r2.points].reverse() : [...r2.points];

  return {
    ...r1,
    id: `${r1.id}_${r2.id}_merged`,
    points: [...p1, ...p2.slice(1)], // Соединяем, убирая дубликат точки key
  };
}

// check if both roads intersect on endpoints
function isEnd(road: roadObject, key: string) {
  const first = road.points[0];
  const last = road.points[road.points.length - 1];

  return `${first.q},${first.r}` === key || `${last.q},${last.r}` === key;
}

export function buildMergedRoadsIterative(
  roads: roadObject[],
  buildRoadsByPoint: (roads: roadObject[]) => Map<string, roadObject[]>
) {
  let current = roads;
  let changed = true;

  while (changed) {
    changed = false;

    // going in this iteration means we have already merged roads before,
    // so we need to build new road map
    const roadsByPoint = buildRoadsByPoint(current);

    const used = new Set<string>();
    const next: roadObject[] = [];

    for (const [key, roadsHere] of roadsByPoint) {
      if (roadsHere.length !== 2) continue;

      const [r1, r2] = roadsHere;

      if (used.has(r1.id) || used.has(r2.id)) continue;

      if (r1.id === r2.id) continue;

      if (!isEnd(r1, key) || !isEnd(r2, key)) continue;

      const merged = mergeRoads(r1, r2, key);

      used.add(r1.id);
      used.add(r2.id);

      next.push(merged);
      changed = true;
    }

    for (const r of current) {
      if (!used.has(r.id)) {
        next.push(r);
      }
    }

    current = next;
  }

  return current;
}

export function buildRoadsByPoint(roads: roadObject[]) {
  const map = new Map<string, roadObject[]>();

  for (const road of roads) {
    for (const point of road.points) {
      const key = `${point.q},${point.r}`;

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key)!.push(road);
    }
  }

  return map;
}

// draw road segment
function drawRoad({
  ctx,
  x1,
  y1,
  x2,
  y2,
  cenX,
  cenY,
  d1,
  d2,
  opacity = 1,
  roadWidth = 2,
  color,
}: {
  ctx: CanvasRenderingContext2D;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cenX?: number;
  cenY?: number;
  d1: number;
  d2: number;
  opacity?: number;
  roadWidth?: number;
  color?: string;
}) {
  const baseColor = color ?? "#8C6A46";
  const glowColor = color ?? "#c9a97a";

  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length === 0) return;

  // Если центра нет — просто одна мягкая cubic-кривая
  if (cenX === undefined || cenY === undefined) {
    const ux = dx / length;
    const uy = dy / length;

    const px = uy;
    const py = -ux;

    const handleLen = length * 0.28;

    const c1x = x1 + ux * handleLen + px * d1;
    const c1y = y1 + uy * handleLen + py * d1;

    const c2x = x2 - ux * handleLen - px * d2;
    const c2y = y2 - uy * handleLen - py * d2;

    strokeRoadPath({
      ctx,
      opacity,
      roadWidth,
      baseColor,
      glowColor,
      draw: () => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(c1x, c1y, c2x, c2y, x2, y2);
      },
    });

    return;
  }

  // -----------------------------
  // Через центр, но БЕЗ излома
  // -----------------------------

  // Общее направление в узле:
  // касательная в центре должна смотреть примерно от start к end
  const tdx = x2 - x1;
  const tdy = y2 - y1;
  const tLen = Math.hypot(tdx, tdy);
  if (tLen === 0) return;

  const tux = tdx / tLen;
  const tuy = tdy / tLen;

  // Перпендикуляр для небольшого смещения "живости"
  const tpx = tuy;
  const tpy = -tux;

  const distStartToCenter = Math.hypot(cenX - x1, cenY - y1);
  const distCenterToEnd = Math.hypot(x2 - cenX, y2 - cenY);

  // Длины ручек — умеренные, чтобы не было перегиба
  const h1 = Math.min(distStartToCenter * 0.45, 18);
  const h2 = Math.min(distCenterToEnd * 0.45, 18);

  // Контрольные точки около центра.
  // Они симметричны по одной касательной => гладкий стык.
  const centerInX = cenX - tux * h1;
  const centerInY = cenY - tuy * h1;

  const centerOutX = cenX + tux * h2;
  const centerOutY = cenY + tuy * h2;

  // Контрольная точка у старта:
  // направляем ее в сторону центра, но добавляем боковой шум

  const sdx = cenX - x1;
  const sdy = cenY - y1;
  const sLen = Math.hypot(sdx, sdy) || 1;
  const sux = sdx / sLen;
  const suy = sdy / sLen;

  const startHandleLen = Math.min(distStartToCenter * 0.35, 16);
  const c1x = x1 + sux * startHandleLen + tpx * d1;
  const c1y = y1 + suy * startHandleLen + tpy * d1;

  // Контрольная точка у конца:
  // аналогично, только смотрим из конца к центру

  const edx = cenX - x2;
  const edy = cenY - y2;
  const eLen = Math.hypot(edx, edy) || 1;
  const eux = edx / eLen;
  const euy = edy / eLen;

  const endHandleLen = Math.min(distCenterToEnd * 0.35, 16);
  const c4x = x2 + eux * endHandleLen - tpx * d2;
  const c4y = y2 + euy * endHandleLen - tpy * d2;

  strokeRoadPath({
    ctx,
    opacity,
    roadWidth,
    baseColor,
    glowColor,
    draw: () => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);

      // Первая cubic до центра
      ctx.bezierCurveTo(c1x, c1y, centerInX, centerInY, cenX, cenY);

      // Вторая cubic от центра
      ctx.bezierCurveTo(centerOutX, centerOutY, c4x, c4y, x2, y2);
    },
  });
}

function strokeRoadPath({
  ctx,
  opacity,
  roadWidth,
  baseColor,
  glowColor,
  draw,
}: {
  ctx: CanvasRenderingContext2D;
  opacity: number;
  roadWidth: number;
  baseColor: string;
  glowColor: string;
  draw: () => void;
}) {
  ctx.save();
  ctx.globalAlpha = opacity * 0.5;
  ctx.lineWidth = roadWidth * 3;
  ctx.strokeStyle = glowColor;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 12;

  draw();
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.lineWidth = roadWidth;
  ctx.strokeStyle = baseColor;

  draw();
  ctx.stroke();
  ctx.restore();
}

export function drawAllRoads({
  roadObjectArray,
  roads,
  tempRoad,
  mapHexes,
  ctx,
}: {
  roadObjectArray: roadObject[];
  roads: Road[];
  tempRoad: roadObject | null;
  mapHexes: Hex[];
  ctx: CanvasRenderingContext2D;
}) {
  // DRAW TEMPORARY ROAD
  if (tempRoad) {
    callDrawRoad({ roads: [tempRoad], ctx, opacity: 1, color: "white" });
  }
  // DRAW QUEUED ROADS that haven't been sent to server yet
  callDrawRoad({ roads: roadObjectArray, ctx, opacity: 0.7 });

  // DRAW REAL ROADS
  // map over built roads to turn them into function-compatible format
  const roadsInProgress = roads.map((r) => {
    const firstConstructingIndex = r.points.findIndex((p) => p.isConstructing);

    if (firstConstructingIndex === -1) {
      return { id: r.id, points: [] };
    }

    const points = [];

    // добавляем последнюю завершённую
    if (firstConstructingIndex > 0) {
      const prev = r.points[firstConstructingIndex - 1];
      if (!prev.isConstructing) {
        points.push(prev);
      }
    }

    // добавляем все constructing
    points.push(...r.points.slice(firstConstructingIndex).filter((p) => p.isConstructing));

    return {
      id: r.id,
      points: points.map((p) => ({
        q: p.q,
        r: p.r,
        d1: p.d1,
        d2: p.d2,
      })),
    };
  });

  const finishedRoadParts = roads.map((r) => ({
    id: r.id,
    points: r.points
      .filter((p) => !p.isConstructing)
      .map((p) => ({ q: p.q, r: p.r, d1: p.d1, d2: p.d2 })),
  }));

  // draw road parts in progress
  callDrawRoad({ roads: roadsInProgress, ctx, opacity: 0.7 });

  // draw finished parts
  callDrawRoad({ roads: finishedRoadParts, ctx, opacity: 1 });
}

function callDrawRoad({
  roads,
  ctx,
  opacity,
  color,
}: {
  roads: roadObject[];
  ctx: CanvasRenderingContext2D;
  opacity: number;
  color?: string;
}) {
  const renderRoads = buildMergedRoadsIterative(roads, buildRoadsByPoint);

  for (const roadObject of renderRoads) {
    if (!roadObject.points || !roadObject) continue;
    // change to hexes with roads (df to remove duplicates)
    const points: { q: number; r: number; d1: number; d2: number }[] = [];
    roadObject.points.forEach((point) => points.push(point));
    if (points.length <= 1) continue;

    for (let idx = 0; idx < points.length; idx++) {
      const point = points[idx];
      const d1 = point.d1;
      const d2 = point.d2;
      const nextPoint = points[idx + 1];
      const prevPoint = points[idx - 1];

      if (idx !== 0 && idx !== points.length - 1) {
        if (!nextPoint || !prevPoint) continue;

        const { x: x2, y: y2 } = hexToPixel(point.q, point.r);
        const { x: x3, y: y3 } = hexToPixel(nextPoint.q, nextPoint.r);
        const { x: x1, y: y1 } = hexToPixel(prevPoint.q, prevPoint.r);

        const midX1 = (x2 + x1) / 2;
        const midY1 = (y2 + y1) / 2;

        const midX2 = (x3 + x2) / 2;
        const midY2 = (y3 + y2) / 2;

        drawRoad({
          ctx,
          x1: midX1,
          y1: midY1,
          x2: midX2,
          y2: midY2,
          cenX: x2,
          cenY: y2,
          d1,
          d2,
          opacity: opacity,
          color,
        });
      } else if (idx === 0) {
        const { x: x1, y: y1 } = hexToPixel(point.q, point.r);
        const { x: x2, y: y2 } = hexToPixel(nextPoint.q, nextPoint.r);

        const midX = (x2 + x1) / 2;
        const midY = (y2 + y1) / 2;

        drawRoad({
          ctx,
          x1,
          y1,
          x2: midX,
          y2: midY,
          d1,
          d2,
          opacity: opacity,
          color,
        });
      } else if (idx === points.length - 1) {
        const { x: x2, y: y2 } = hexToPixel(point.q, point.r);
        const { x: x1, y: y1 } = hexToPixel(prevPoint.q, prevPoint.r);

        const midX = (x2 + x1) / 2;
        const midY = (y2 + y1) / 2;

        drawRoad({
          ctx,
          x1: midX,
          y1: midY,
          x2,
          y2,
          d1,
          d2,
          opacity: opacity,
          color,
        });
      }
    }
  }
}
