import { getNationFlagURL } from "@/lib/helpers/flags";
import { getNationName, totalNationArmy } from "@/lib/helpers/nations";
import { useGameStore } from "@/lib/stores/gameStore";
import { numberConverter } from "@/lib/utils";
import { Nation } from "@repo/shared";
import { BicepsFlexed, CircleDollarSign, Hexagon, LucideIcon, X } from "lucide-react";
import Image from "next/image";

type Info = {
  value: string | number | boolean;
  icon: LucideIcon;
};

export default function NationInfo({ nationId }: { nationId: string }) {
  const nations = useGameStore((s) => s.nations);
  const mapHexes = useGameStore((s) => s.mapHexes);

  const nation = nations.find((n) => n.id === nationId);
  const name = getNationName({ id: nationId });

  const nationHexes = mapHexes.filter((h) => h.owner === nationId);

  const totalArmy = totalNationArmy({ mapHexes, nationId });

  const info: Info[] = [
    // # of hexes
    {
      value: nationHexes.length,
      icon: Hexagon,
    },
    // # of gold
    {
      value: numberConverter(nation?.gold.toString() ?? "0"),
      icon: CircleDollarSign,
    },
    // total army
    {
      value: numberConverter(totalArmy.toString()),
      icon: BicepsFlexed,
    },
  ];

  return (
    <div className="w-full h-full flex justify-center items-start rounded-xl bg-gray-900 shadow-md shadow-black">
      <div className="h-full w-full flex flex-col justify-start items-center gap-2">
        {/* COUNTRY FLAG + NAME */}
        <div className="w-full h-[25%] flex flex-col justify-center items-start border bg-gray-800 p-2">
          <div className="w-[50%] h-auto bg-amber-200 m-2 rounded-[8px]">
            <Image
              src={getNationFlagURL(nationId)}
              alt="nation flag"
              width={1463}
              height={962}
              className="w-full h-full p-px rounded-xl"
            ></Image>
          </div>
          <div className="w-full">
            <span className="text-white text-xl">{name}</span>
          </div>
        </div>

        {/* COUNTRY INFO BLOCK */}
        <div className="w-full h-[30%] flex flex-col bg-gray-800 border">
          <div className="w-full h-12 bg-gray-900 p-2">
            <span className="text-white text-xl">{`${name}'s Info`}</span>
          </div>

          <div className="w-full h-full grid grid-cols-3">
            {info.map((i, key) => (
              <div
                key={key}
                className="h-[50%] flex justify-center items-center gap-1 bg-gray-900 rounded-md"
              >
                <i.icon className="w-6 h-6 text-amber-300"></i.icon>
                <span className="text-white">{i.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
