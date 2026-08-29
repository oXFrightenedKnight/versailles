import NationDiplomacyList from "@/components/game/diplomacy/info/NationDiploList";

export default function NationsAtWar({ atWar }: { atWar: string[] }) {
  return (
    <div className="w-full h-12 bg-gray-800 border border-gray-600 flex justify-between items-center rounded-md gap-2 p-1 shrink-0">
      <span className="text-white shrink-0">At War:</span>
      <NationDiplomacyList list={atWar}></NationDiplomacyList>
    </div>
  );
}
