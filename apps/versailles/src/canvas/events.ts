import { RefObject } from "react";
import { resizeCanvas } from "./animation";
import { CanvasRuntime, CanvasSnapshot, CanvasCommands } from "./types";
import { handleBarDrag, handleCanvasClick, handleRoadDrag } from "./interactions/handleClick";

type AttachCanvasEventsOptions = {
  runtime: CanvasRuntime;
  getSnapshot: () => CanvasSnapshot;
  commands: CanvasCommands;
  barRef: RefObject<HTMLDivElement | null>;
  draw: () => void;
};

export function attachCanvasEvents({
  runtime,
  getSnapshot,
  commands,
  barRef,
  draw,
}: AttachCanvasEventsOptions) {
  const hitCanvas = runtime.canvas.hit;

  const onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };

  const onResize = () => {
    resizeCanvas(runtime);
    draw();
  };

  const onWheel = (event: WheelEvent) => {
    handleCameraWheel(runtime, event);
  };

  const onMouseDown = (event: MouseEvent) => {
    beginPointerGesture(runtime, event);
  };

  const onMouseMove = (event: MouseEvent) => {
    const snapshot = getSnapshot();

    updateCameraDrag(runtime, event);

    if (snapshot.buildMode === "road") {
      handleRoadDrag({
        event,
        runtime,
        snapshot,
      });
    }
  };

  const onMouseUp = (event: MouseEvent) => {
    const wasDragging = endPointerGesture(runtime);

    if (wasDragging) return;

    const snapshot = getSnapshot();

    if (snapshot.barDragging) return;

    handleCanvasClick({
      event,
      runtime,
      snapshot,
      commands,
    });
  };

  const onWindowMouseMove = (event: MouseEvent) => {
    const snapshot = getSnapshot();

    if (!snapshot.barDragging) return;

    handleBarDrag({
      event,
      snapshot,
      barElement: barRef.current,
      commands,
    });
  };

  const onWindowMouseUp = () => {
    if (getSnapshot().barDragging) {
      commands.setBarDragging(false);
    }
  };

  const onWindowMouseLeave = () => {
    cancelPointerGesture(runtime);
  };

  window.addEventListener("resize", onResize);

  hitCanvas.addEventListener("contextmenu", onContextMenu);

  hitCanvas.addEventListener("wheel", onWheel);

  hitCanvas.addEventListener("mousedown", onMouseDown);

  hitCanvas.addEventListener("mousemove", onMouseMove);

  hitCanvas.addEventListener("mouseup", onMouseUp);

  hitCanvas.addEventListener("mouseleave", onWindowMouseLeave);

  window.addEventListener("mousemove", onWindowMouseMove);

  window.addEventListener("mouseup", onWindowMouseUp);

  return () => {
    window.removeEventListener("resize", onResize);

    hitCanvas.removeEventListener("contextmenu", onContextMenu);

    hitCanvas.removeEventListener("wheel", onWheel);

    hitCanvas.removeEventListener("mousedown", onMouseDown);

    hitCanvas.removeEventListener("mousemove", onMouseMove);

    hitCanvas.removeEventListener("mouseup", onMouseUp);

    hitCanvas.removeEventListener("mouseleave", onWindowMouseLeave);

    window.removeEventListener("mousemove", onWindowMouseMove);

    window.removeEventListener("mouseup", onWindowMouseUp);
  };
}

const handleCameraWheel = (runtime: CanvasRuntime, event: WheelEvent) => {
  event.preventDefault();

  const zoomSpeed = 0.001;
  const camera = runtime.camera;

  camera.zoom *= 1 - event.deltaY * zoomSpeed;
  camera.zoom = Math.min(Math.max(camera.zoom, 0.3), 4);
};

export function beginPointerGesture(runtime: CanvasRuntime, event: MouseEvent) {
  if (event.button !== 0 && event.button !== 2) {
    return false;
  }

  runtime.pointer.isDown = true;
  runtime.pointer.isDragging = false;
  runtime.pointer.button = event.button;

  runtime.pointer.startX = event.clientX;
  runtime.pointer.startY = event.clientY;

  runtime.pointer.lastX = event.clientX;
  runtime.pointer.lastY = event.clientY;

  return true;
}

// returns confirmation whether the gesture was a click or a drag
// true - drag, false - click
export const endPointerGesture = (runtime: CanvasRuntime): boolean => {
  const pointer = runtime.pointer;

  if (!pointer.isDown || pointer.button === null) {
    return false;
  }

  let wasDragging = true;

  if (!pointer.isDragging) {
    wasDragging = false;
  }

  pointer.isDown = false;
  pointer.isDragging = false;
  pointer.button = null;

  return wasDragging;
};

export function cancelPointerGesture(runtime: CanvasRuntime) {
  runtime.pointer.isDown = false;
  runtime.pointer.isDragging = false;
  runtime.pointer.button = null;
}

export function updateCameraDrag(runtime: CanvasRuntime, event: MouseEvent) {
  if (!runtime.pointer.isDown) return;

  const startX = runtime.pointer.startX;
  const startY = runtime.pointer.startY;
  const distance = Math.hypot(event.clientX - startX, event.clientY - startY);

  if (!runtime.pointer.isDragging && distance > 6) {
    runtime.pointer.isDragging = true;
  }
  if (!runtime.pointer.isDragging) return;

  const lastX = runtime.pointer.lastX;
  const lastY = runtime.pointer.lastY;
  const camera = runtime.camera;
  camera.x += (event.clientX - lastX) / camera.zoom;
  camera.y += (event.clientY - lastY) / camera.zoom;

  runtime.pointer.lastX = event.clientX;
  runtime.pointer.lastY = event.clientY;
}
