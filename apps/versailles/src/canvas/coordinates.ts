import { CanvasRuntime } from "./types";

export function eventToWorldPoint(event: MouseEvent, runtime: CanvasRuntime) {
  const canvas = runtime.canvas.hit;
  const rect = canvas.getBoundingClientRect();

  const mouseX = event.clientX - rect.left;

  const mouseY = event.clientY - rect.top;

  return {
    x: (mouseX - canvas.width / 2) / runtime.camera.zoom - runtime.camera.x,

    y: (mouseY - canvas.height / 2) / runtime.camera.zoom - runtime.camera.y,
  };
}
