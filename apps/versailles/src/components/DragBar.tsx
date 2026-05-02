import { useIntentStore } from "@/lib/intentStore";
import { calcAvailableArmy } from "@/lib/utils";
import { Hex, Nation } from "@repo/shared";
import { RefObject } from "react";

export default function DragBar({
  value,
  selectedHex,
  playerNation,
  setBarDragging,
  barRef,
}: {
  value: number;
  selectedHex: Hex;
  playerNation: Nation;
  setBarDragging: React.Dispatch<React.SetStateAction<boolean>>;
  barRef: RefObject<HTMLDivElement | null>;
}) {
  const armyMove = useIntentStore((s) => s.armyMove);

  const army = calcAvailableArmy(selectedHex, playerNation, armyMove);
  if (army <= 0) return null;
  const percent = (value / army) * 100;
  const clampedPercent = Math.max(0, Math.min(100, percent));

  return (
    <div
      ref={barRef}
      onMouseDown={() => setBarDragging(true)}
      className="w-full h-full flex flex-col items-center justify-center p-4 bg-gray-800 rounded-xl pointer-events-auto"
    >
      <div className="w-full flex items-center justify-center">
        <span className="text-gray-400">{value}</span>
        <span className="text-white">/{army}</span>
      </div>
      <div className="w-full h-4 rounded-xl bg-gray-900 border-gray-600 relative cursor-pointer">
        <div
          className="absolute h-full rounded-xl left-0 top-0 rounded bg-amber-200 max-w-full"
          style={{ width: `${clampedPercent}%` }}
        ></div>
        <div
          className="absolute top-1/2 h-5 w-5 rounded-full border border-black bg-white -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${clampedPercent}%` }}
        ></div>
      </div>
    </div>
  );
}
