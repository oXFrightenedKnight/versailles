import { Hexagon } from "lucide-react";

export default function NumberOfTiles({ numberOfTiles }: { numberOfTiles: number }) {
  return (
    <div className="w-full h-12 bg-gray-800 border border-gray-600 flex justify-between items-center rounded-md gap-2 p-1 shrink-0">
      <span className="text-white shrink-0">Tiles:</span>
      <div className="h-full w-20 flex justify-center items-center gap-1">
        <Hexagon className="text-amber-300 w-7 h-7"></Hexagon>
        <span className="text-white shrink-0">{numberOfTiles}</span>
      </div>
    </div>
  );
}
