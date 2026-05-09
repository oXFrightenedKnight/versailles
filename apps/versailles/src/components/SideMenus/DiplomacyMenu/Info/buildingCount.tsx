import { BUILDINGS_CATEGORY } from "@repo/shared";
import { LucideIcon } from "lucide-react";

export default function BuildingCount({
  category,
  count,
  Icon,
}: {
  category: BUILDINGS_CATEGORY;
  count: number;
  Icon: LucideIcon;
}) {
  return (
    <div key={category} className="w-full h-12 border flex justify-between items-center gap-2 p-1">
      <span className="text-white shrink-0 border w-35">{`${category.toLowerCase()}'s`}</span>
      <div className="h-full w-20 flex justify-center items-center gap-1 border">
        <Icon className="text-amber-300 w-7 h-7"></Icon>
        <span className="text-white shrink-0">{count}</span>
      </div>
    </div>
  );
}
