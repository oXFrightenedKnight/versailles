import { Button } from "@/components/ui/button";
import { BuildingIcons, getBuildingIconImage } from "@/lib/data";
import { allBuildingsPerCategory } from "@/lib/helpers/buildings";
import { getNationFlagURL } from "@/lib/helpers/flags";
import { getNationName, totalNationArmy } from "@/lib/helpers/nations";
import { useGameStore } from "@/lib/stores/gameStore";
import { useIntentStore } from "@/lib/stores/intentStore";
import { getUIBuildings } from "@/lib/UI/mergeData/uiBuildings";
import { numberConverter } from "@/lib/utils";
import { building_categoires, Nation } from "@repo/shared";
import { BicepsFlexed, CircleDollarSign, DollarSign, Hexagon, LucideIcon, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import NationsAtWar from "./Info/atWar";
import NationsAtPeace from "./Info/atPeace";
import NumberOfTiles from "./Info/tiles";
import TotalArmy from "./Info/army";
import GoldAmount from "./Info/gold";
import BuildingCount from "./Info/buildingCount";

export default function NationInfo({ nationId }: { nationId: string }) {
  const [tab, setTab] = useState<"info" | "action">("info");

  const nations = useGameStore((s) => s.nations);
  const mapHexes = useGameStore((s) => s.mapHexes);
  const serverBuildings = useGameStore((s) => s.buildings);
  const serverBuildingsDelete = useIntentStore((s) => s.serverBuildingsDelete);
  const buildingsUI = getUIBuildings(serverBuildings, serverBuildingsDelete);

  const nation = nations.find((n) => n.id === nationId);
  const name = getNationName({ id: nationId });

  const nationHexes = mapHexes.filter((h) => h.owner === nationId);

  const totalArmy = numberConverter(totalNationArmy({ mapHexes, nationId }));
  const gold = numberConverter(nation?.gold ?? 0);
  const buildingsInfo = allBuildingsPerCategory(buildingsUI, nationId, mapHexes);

  const FAKE_WAR = ["ALD", "DOR", "WES", "CRO", "VIC", "BRA"];

  return (
    <div className="w-full h-full border yellow-500 flex justify-center items-start rounded-xl">
      <div className="h-full border w-full flex flex-col justify-start items-center gap-2">
        {/* COUNTRY FLAG + NAME */}
        <div className="w-full h-[25%] flex flex-col justify-center items-start rounded-md bg-gray-900 shadow-md shadow-black p-2">
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

        {/* COUNTRY INFO/ACTIONS BLOCK */}
        <div className="w-full h-full flex flex-col bg-gray-900 shadow-md shadow-black rounded-md">
          <div className="w-full h-12 flex justify-center items-center bg-gray-900 p-2 rounded-t-md border-b border-white text-white">
            <div
              className={`w-full flex justify-center items-center rounded-md ${tab === "info" && "bg-gray-800"}`}
              onClick={() => setTab("info")}
            >
              <div className="text-center">Info</div>
            </div>
            <div
              className={`w-full flex justify-center items-center rounded-md ${tab === "action" && "bg-gray-800"}`}
              onClick={() => setTab("action")}
            >
              <div className="text-center">Actions</div>
            </div>
          </div>
          {tab === "info" && (
            <div className="flex h-full items-center justify-center w-full border border-red-500">
              <div className="w-full h-full flex flex-col gap-2 p-2 overflow-y-auto min-h-0 border no-scrollbar">
                {/* Nations at war */}
                <NationsAtWar atWar={FAKE_WAR} nations={nations}></NationsAtWar>
                <NationsAtPeace atPeace={FAKE_WAR} nations={nations}></NationsAtPeace>
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
                <Button className="w-full">Declare War</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
