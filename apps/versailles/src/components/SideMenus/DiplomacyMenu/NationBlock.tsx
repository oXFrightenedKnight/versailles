import { Button } from "@/components/ui/button";
import { BuildingIcons } from "@/lib/data";
import { allBuildingsPerCategory } from "@/lib/helpers/buildings";
import { getNationFlagURL } from "@/lib/helpers/flags";
import { getNationName, totalNationArmy } from "@/lib/helpers/nations";
import { useGameStore } from "@/lib/stores/gameStore";
import { useIntentStore } from "@/lib/stores/intentStore";
import { getUIBuildings } from "@/lib/UI/mergeData/uiBuildings";
import { numberConverter } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";
import NationsAtWar from "./Info/atWar";
import NationsAtPeace from "./Info/atPeace";
import NumberOfTiles from "./Info/tiles";
import TotalArmy from "./Info/army";
import GoldAmount from "./Info/gold";
import BuildingCount from "./Info/buildingCount";
import { ArrowLeft } from "lucide-react";

export default function NationInfo({
  nationId,
  setChosenNation,
}: {
  nationId: string;
  setChosenNation: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const [tab, setTab] = useState<"info" | "action">("info");

  const nations = useGameStore((s) => s.nations);
  const mapHexes = useGameStore((s) => s.mapHexes);
  const serverBuildings = useGameStore((s) => s.buildings);

  const serverBuildingsDelete = useIntentStore((s) => s.serverBuildingsDelete);
  const setDeclareWar = useIntentStore((s) => s.setDeclareWar);

  const buildingsUI = getUIBuildings(serverBuildings, serverBuildingsDelete);

  const nation = nations.find((n) => n.id === nationId);
  const name = getNationName({ id: nationId });

  const nationHexes = mapHexes.filter((h) => h.owner === nationId);

  const totalArmy = numberConverter(totalNationArmy({ mapHexes, nationId }));
  const gold = numberConverter(nation?.gold ?? 0);
  const buildingsInfo = allBuildingsPerCategory(buildingsUI, nationId, mapHexes);

  const atWar = nation?.atWar ?? [];

  return (
    <div className="w-full h-full yellow-500 flex justify-center items-start rounded-xl">
      <div className="h-full w-full flex flex-col justify-start items-center gap-2">
        <div className="w-full h-[25%] flex justify-center p-2 text-white bg-gray-900 shadow-md shadow-black rounded-md">
          <div className="flex-1 h-full flex flex-col justify-center shrink-0">
            <div className="flex w-full justify-between items-start">
              <div className="w-[50%] h-auto bg-amber-200 m-2 rounded-[5px] shrink-0">
                <Image
                  src={getNationFlagURL(nationId)}
                  alt="nation flag"
                  width={1463}
                  height={962}
                  className="w-full h-full p-px rounded-xl"
                ></Image>
              </div>
            </div>
            <span className="text-lg">{name}</span>
          </div>
          <div className="h-full">
            <div
              className="flex justify-center items-center p-2 rounded-md cursor-pointer hover:bg-gray-800"
              onClick={() => setChosenNation(null)}
            >
              <ArrowLeft className="w-6 h-6"></ArrowLeft>
            </div>
          </div>
        </div>

        <div className="w-full flex-1 min-h-0 flex flex-col rounded-md bg-gray-900 shadow-md shadow-black">
          <div className="w-full h-12 flex justify-center items-center shrink-0 bg-gray-900 rounded-t-md border-b border-gray-600 text-white">
            <div
              className="w-full h-full flex justify-center items-center p-2 cursor-pointer"
              onClick={() => setTab("info")}
            >
              <div
                className={`w-full flex justify-center items-center rounded-md ${tab === "info" && "bg-gray-800"} cursor-pointer`}
              >
                <div className="text-center">Info</div>
              </div>
            </div>
            <div
              className="w-full h-full flex justify-center items-center p-2 cursor-pointer"
              onClick={() => setTab("action")}
            >
              <div
                className={`w-full flex justify-center items-center rounded-md ${tab === "action" && "bg-gray-800"} cursor-pointer`}
              >
                <div className="text-center">Actions</div>
              </div>
            </div>
          </div>

          {tab === "info" && (
            <div className="flex flex-1 min-h-0 items-center justify-center w-full ">
              <div className="w-full h-full flex flex-col gap-2 p-2 overflow-y-auto no-scrollbar">
                {/* Nations at war */}
                <NationsAtWar atWar={atWar} nations={nations}></NationsAtWar>
                <NationsAtPeace atPeace={atWar} nations={nations}></NationsAtPeace>
                <NumberOfTiles numberOfTiles={nationHexes.length}></NumberOfTiles>
                <TotalArmy totalArmy={totalArmy}></TotalArmy>
                <GoldAmount gold={gold}></GoldAmount>

                {buildingsInfo.map((obj) => {
                  const Icon = BuildingIcons[obj.category];
                  return (
                    <BuildingCount
                      key={obj.category}
                      category={obj.category}
                      Icon={Icon}
                      count={obj.count}
                    ></BuildingCount>
                  );
                })}
              </div>
            </div>
          )}
          {tab === "action" && (
            <div className="w-full h-full">
              <div className="w-full h-full flex flex-col justify-start items-center p-2 gap-1">
                <Button
                  className="w-full bg-gray-800 border border-gray-600 cursor-pointer"
                  onClick={() => setDeclareWar((prev) => [...prev, nationId])}
                >
                  Declare War
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
