import { getNationFlagURL } from "@/lib/helpers/flags";
import { getNationName } from "@/lib/helpers/nations";
import { Nation } from "@repo/shared";
import Image from "next/image";

export default function NationCol({
  nation,
  setChosenNation,
}: {
  nation: Nation;
  setChosenNation: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const flagURL = getNationFlagURL(nation.id);
  const name = getNationName({ id: nation.id });
  return (
    <>
      <div className="w-full h-[50px] cursor-pointer" onClick={() => setChosenNation(nation.id)}>
        <div className="w-full h-full flex justify-between items-center bg-gray-800 border border-gray-600 rounded-md">
          <div className="h-full flex justify-center items-center gap-2 p-2">
            <div className="rounded-[4px] border border-gray-600 relative">
              <Image
                src={flagURL}
                alt="nation flag icon"
                width={48}
                height={48}
                className="w-10 h-7 rounded-[4px]"
              ></Image>
            </div>
            <div className="w-40">
              <span className="text-white truncate block">{name}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
