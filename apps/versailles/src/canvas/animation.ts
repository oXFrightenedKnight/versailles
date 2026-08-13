import { selectArmyMoves } from "@/lib/UI/mergeData/armyMove/selectors";
import { renderMap } from "./render/render";
import { CanvasRuntime, CanvasSnapshot } from "./types";

export function resizeCanvas(runtime: CanvasRuntime) {
  const { main, hit } = runtime.canvas;

  main.width = window.innerWidth;
  main.height = window.innerHeight;

  hit.width = window.innerWidth;
  hit.height = window.innerHeight;
}

export function drawFrame(runtime: CanvasRuntime, snapshot: CanvasSnapshot) {
  const { main, hit, mainContext, hitContext } = runtime.canvas;

  const now = performance.now();
  const last = runtime.animation.lastTime || now;

  runtime.animation.blinkTime += (now - last) / 1000;

  runtime.animation.lastTime = now;

  for (const context of [mainContext, hitContext]) {
    context.clearRect(0, 0, main.width, main.height);

    context.save();

    context.translate(main.width / 2, main.height / 2);

    context.scale(runtime.camera.zoom, runtime.camera.zoom);

    context.translate(runtime.camera.x, runtime.camera.y);
  }

  renderMap(
    mainContext,
    hitContext,
    0,
    0,
    snapshot.selectedHexId,
    runtime.animation.blinkTime,
    snapshot.mapHexes,
    snapshot.nations,
    selectArmyMoves(snapshot.gameActions),
    runtime.road.draft,
    snapshot.roads
  );

  mainContext.restore();
  hitContext.restore();
}

export function startAnimation(runtime: CanvasRuntime, getSnapshot: () => CanvasSnapshot) {
  if (runtime.animation.frameId !== null) {
    return;
  }

  // recursively call function for each frame
  const step = () => {
    if (runtime.destroyed) return;

    drawFrame(runtime, getSnapshot());

    runtime.animation.frameId = requestAnimationFrame(step);
  };

  runtime.animation.frameId = requestAnimationFrame(step);
}

export function stopAnimation(runtime: CanvasRuntime) {
  const frameId = runtime.animation.frameId;

  if (frameId !== null) {
    cancelAnimationFrame(frameId);
  }

  runtime.animation.frameId = null;
}
