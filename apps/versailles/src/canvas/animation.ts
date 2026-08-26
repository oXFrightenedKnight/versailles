import { renderMap } from "./render/render";
import { CanvasRuntime, CanvasSnapshot } from "./types";

export function resizeCanvas(runtime: CanvasRuntime) {
  const { main, hit } = runtime.canvas;

  const parent = main.parentElement;
  if (!parent) return;

  const width = Math.max(1280, parent.clientWidth);
  const height = Math.max(720, parent.clientHeight);

  main.width = width;
  main.height = height;

  hit.width = width;
  hit.height = height;
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

  renderMap(0, 0, snapshot, runtime);

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
