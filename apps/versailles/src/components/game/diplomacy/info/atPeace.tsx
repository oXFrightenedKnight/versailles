"use client";

import NationDiplomacyList from "@/components/game/diplomacy/info/NationDiploList";
import { PeaceObj } from "@repo/shared/nations";

export default function NationsAtPeace({ atPeace }: { atPeace: PeaceObj[] }) {
  const peaceIds = atPeace.map((p) => p.nationId);
  const peaceTurnsById = new Map(atPeace.map((p) => [p.nationId, p.turnsRemaining]));
  return (
    <div className="w-full h-12 bg-gray-800 border border-gray-600 flex justify-between items-center rounded-md gap-2 p-1 shrink-0">
      <span className="text-white shrink-0">At Peace:</span>
      <NationDiplomacyList
        list={peaceIds}
        customText={(id) => `Turns remaining: ${id ? (peaceTurnsById.get(id) ?? 0) : 0}`}
      ></NationDiplomacyList>
    </div>
  );
}
