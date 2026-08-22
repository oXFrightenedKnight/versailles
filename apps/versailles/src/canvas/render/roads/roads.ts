import { RoadDraft } from "@/lib/types/game";
import { hexToPixel } from "../render";
import { Hex } from "@repo/shared/data/hex_map";
import { RenderRoad } from "@/lib/UI/mergeData/roads(belongs render)/types";

function traceDashedLine({
  ctx,
  x1,
  y1,
  x2,
  y2,
}: {
  ctx: CanvasRenderingContext2D;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}) {
  ctx.beginPath();
  ctx.setLineDash([12, 2]);

  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
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
  ctx.lineWidth = roadWidth * 2;
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
  roads,
  tempRoad,
  mapHexes,
  ctx,
}: {
  roads: RenderRoad[];
  tempRoad: RoadDraft | null;
  mapHexes: Hex[];
  ctx: CanvasRenderingContext2D;
}) {
  // DRAW TEMPORARY ROAD
  if (tempRoad) {
    drawSegments({ roads: [tempRoad], ctx, opacity: 1, color: "white" });
  }

  // DRAW MERGED ROADS
  const roadsInProgress = roads.map((r) => {
    const firstConstructingIndex = r.points.findIndex((p) => p.isConstructing);

    if (firstConstructingIndex === -1) {
      return { id: r.key, points: [] };
    }

    const points = [];

    if (firstConstructingIndex > 0) {
      const prev = r.points[firstConstructingIndex - 1];
      if (!prev.isConstructing) {
        points.push(prev);
      }
    }

    points.push(...r.points.slice(firstConstructingIndex).filter((p) => p.isConstructing));

    return {
      id: r.key,
      points: points.map((p) => ({
        q: p.q,
        r: p.r,
        d1: p.d1,
        d2: p.d2,
      })),
    };
  });

  const finishedRoadParts = roads.map((r) => ({
    id: r.key,
    points: r.points
      .filter((p) => !p.isConstructing)
      .map((p) => ({ q: p.q, r: p.r, d1: p.d1, d2: p.d2 })),
  }));

  // draw road parts in progress
  drawSegments({ roads: roadsInProgress, ctx, opacity: 0.7 });

  // draw finished parts
  drawSegments({ roads: finishedRoadParts, ctx, opacity: 1 });
}

function drawSegments({
  roads,
  ctx,
  opacity,
  color = "#cfcfcf",
  thickness = 3,
}: {
  roads: RoadDraft[];
  ctx: CanvasRenderingContext2D;
  opacity: number;
  color?: string;
  thickness?: number;
}) {
  for (const draft of roads) {
    if (!draft.points || !draft) continue;
    // change to hexes with roads (df to remove duplicates)
    const points: { q: number; r: number; d1: number; d2: number }[] = [];
    draft.points.forEach((point) => points.push(point));
    if (points.length <= 1) continue;

    for (let idx = 0; idx < points.length; idx++) {
      const point = points[idx];
      const nextPoint = points[idx + 1];

      if (idx === points.length - 1 || !nextPoint || !point) continue;

      const { x: x1, y: y1 } = hexToPixel(point.q, point.r);
      const { x: x2, y: y2 } = hexToPixel(nextPoint.q, nextPoint.r);

      const draw = () => traceDashedLine({ ctx, x1, y1, x2, y2 });

      strokeRoadPath({
        ctx,
        opacity,
        roadWidth: thickness,
        baseColor: color,
        glowColor: "#ffffff",
        draw,
      });
    }
  }
}
