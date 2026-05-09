import { BicepsFlexed } from "lucide-react";

export default function TotalArmy({ totalArmy }: { totalArmy: string }) {
  return (
    <div className="w-full h-12 border flex justify-between items-center gap-2 p-1">
      <span className="text-white shrink-0">Army:</span>
      <div className="h-full w-20 flex justify-center items-center gap-1 border">
        <BicepsFlexed className="text-amber-300 w-7 h-7"></BicepsFlexed>
        <span className="text-white shrink-0">{totalArmy}</span>
      </div>
    </div>
  );
}
