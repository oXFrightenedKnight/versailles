import { useGameCanvas } from "@/hooks/useGameCanvas";
import { GameCanvasProps } from "./types";

export default function GameCanvas({ props }: { props: GameCanvasProps }) {
  const { hitCanvasRef, canvasRef } = useGameCanvas(props);

  return (
    <>
      <canvas ref={hitCanvasRef} className="absolute inset-0 z-10" />
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
    </>
  );
}
