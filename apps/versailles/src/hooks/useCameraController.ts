import { RoadDragCtx } from "@/canvas/handleClick";
import { useCallback, useRef } from "react";

// this hook ONLY works with camera objects
export function useCameraController() {
  const cameraRef = useRef({
    x: 0,
    y: 0,
    zoom: 1,
  });

  const draggingRef = useRef(false);
  const mouseDownRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const lastPosRef = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();

    const zoomSpeed = 0.001;
    const camera = cameraRef.current;

    camera.zoom *= 1 - event.deltaY * zoomSpeed;
    camera.zoom = Math.min(Math.max(camera.zoom, 0.3), 4);
  }, []);

  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (event.button !== 0 && event.button !== 2) return;

    mouseDownRef.current = true;
    draggingRef.current = false;
    startPosRef.current = { x: event.clientX, y: event.clientY };
    lastPosRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    // Dragging map
    if (!mouseDownRef.current) return;

    const start = startPosRef.current;
    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (!draggingRef.current && distance > 6) {
      draggingRef.current = true;
    }
    if (!draggingRef.current) return;

    const last = lastPosRef.current;
    const camera = cameraRef.current;
    camera.x += (event.clientX - last.x) / camera.zoom;
    camera.y += (event.clientY - last.y) / camera.zoom;
    lastPosRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (!mouseDownRef.current) return true;
    mouseDownRef.current = false;

    let wasDragging = true;

    if (!draggingRef.current) {
      wasDragging = false;
    }

    draggingRef.current = false;

    return wasDragging;
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseDownRef.current = false;
    draggingRef.current = false;
  }, []);

  return {
    cameraRef,
    mouseDownRef,
    draggingRef,
    startPosRef,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  };
}
