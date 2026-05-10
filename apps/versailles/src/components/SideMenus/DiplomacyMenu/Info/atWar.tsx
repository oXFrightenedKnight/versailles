import { getNationFlagURL } from "@/lib/helpers/flags";
import { Nation } from "@repo/shared";
import Image from "next/image";

export default function NationsAtWar({ nations, atWar }: { nations: Nation[]; atWar: string[] }) {
  return (
    <div className="w-full h-12 bg-gray-800 border border-gray-600 flex justify-between items-center rounded-md gap-2 p-1 shrink-0">
      <span className="text-white shrink-0">At War:</span>
      <div className="w-full h-full border border-gray-600 bg-gray-900 flex justify-start items-center gap-1 p-1 overflow-x-auto no-scrollbar rounded-md">
        {atWar.map((id) => {
          const enemy = nations.find((n) => n.id === id);
          if (!enemy) return null;

          const flagURL = getNationFlagURL(id);

          return (
            <Image
              src={flagURL}
              alt="nation at war flag"
              key={id}
              width={32}
              height={32}
              className="w-8 h-6 rounded-[4px] border border-gray-600"
            ></Image>
          );
        })}
      </div>
    </div>
  );
}
