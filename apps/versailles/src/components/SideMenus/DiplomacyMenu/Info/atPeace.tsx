import { getNationFlagURL } from "@/lib/helpers/flags";
import { Nation } from "@repo/shared";
import Image from "next/image";

export default function NationsAtPeace({
  nations,
  atPeace,
}: {
  nations: Nation[];
  atPeace: string[];
}) {
  return (
    <div className="w-full h-12 border flex justify-between items-center gap-2 p-1">
      <span className="text-white shrink-0">At Peace:</span>
      <div className="w-full h-full border flex justify-start items-center gap-1 p-1 overflow-x-auto no-scrollbar">
        {atPeace.map((id) => {
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
