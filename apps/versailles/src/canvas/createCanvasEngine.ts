import { drawFrame, resizeCanvas, startAnimation, stopAnimation } from "./animation";
import { attachCanvasEvents } from "./events";
import { initBiomePatterns } from "./render/render";
import { CanvasEngine, CanvasRuntime, CreateCanvasEngineOptions } from "./types";

export function createCanvasEngine(options: CreateCanvasEngineOptions): CanvasEngine {
  const mainContext = options.mainCanvas.getContext("2d");

  const hitContext = options.hitCanvas.getContext("2d");

  if (!mainContext || !hitContext) {
    throw new Error("Unable to create canvas contexts");
  }

  const runtime: CanvasRuntime = {
    canvas: {
      main: options.mainCanvas,
      hit: options.hitCanvas,
      mainContext,
      hitContext,
    },

    camera: {
      x: 0,
      y: 0,
      zoom: 1,
    },

    pointer: {
      isDown: false,
      isDragging: false,
      button: null,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
    },

    road: {
      startHexId: null,
      draft: null,
    },

    animation: {
      frameId: null,
      lastTime: 0,
      blinkTime: 0,
    },

    destroyed: false,
  };

  let detachEvents: (() => void) | null = null;

  const draw = () => {
    drawFrame(runtime, options.getSnapshot());
  };

  let started = false;

  const start = async () => {
    if (started || runtime.destroyed) return;
    started = true;

    resizeCanvas(runtime);

    await initBiomePatterns(runtime.canvas.mainContext);

    if (runtime.destroyed) return;

    detachEvents = attachCanvasEvents({
      runtime,
      getSnapshot: options.getSnapshot,
      commands: options.commands,
      barRef: options.barRef,
      draw,
    });

    startAnimation(runtime, options.getSnapshot);
  };

  const destroy = () => {
    runtime.destroyed = true;

    stopAnimation(runtime);
    detachEvents?.();
    detachEvents = null;
  };

  return { start, destroy, draw };
}
