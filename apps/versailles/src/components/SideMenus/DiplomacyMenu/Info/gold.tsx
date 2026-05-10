import { CircleDollarSign } from "lucide-react";

export default function GoldAmount({ gold }: { gold: string }) {
  return (
    <div className="w-full h-12 bg-gray-800 border border-gray-600 flex justify-between items-center rounded-md gap-2 p-1 shrink-0">
      <span className="text-white shrink-0">Gold:</span>
      <div className="h-full w-20 flex justify-center items-center gap-1">
        <CircleDollarSign className="text-amber-300 w-7 h-7"></CircleDollarSign>
        <span className="text-white shrink-0">{gold}</span>
      </div>
    </div>
  );
}
