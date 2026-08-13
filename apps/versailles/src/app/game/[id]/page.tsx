"use client";

import GameCanvas from "@/canvas/GameCanvas";
import DragBar from "@/components/GameComponents/DragBar";
import BuildMenu from "@/components/SideMenus/BuildingMenu/buildButton";
import DiplomacyMenu from "@/components/SideMenus/DiplomacyMenu/MainMenu";
import MailMenu from "@/components/SideMenus/Mails/MainMenu";
import PopupContainer from "@/components/SideMenus/Popups/PopupContainer";
import ProvinceInfoSidebar from "@/components/SideMenus/ProvinceMenu/ProvinceInfoSidebar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useOptimisticResources } from "@/hooks/useOptimisticResources";
import { Descriptions, OpenMenus } from "@/lib/data";
import { getNationName } from "@/lib/helpers/nations";
import { useGameStore } from "@/lib/stores/gameStore";
import { useIntentStore } from "@/lib/stores/intentStore";
import { BuildModeType } from "@/lib/types/game";
import { numberConverter } from "@/lib/utils";
import { Hex } from "@repo/shared/data/hex_map";
import { Menu } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import SettingDialog from "../../../components/GameComponents/settingDialog";
import { GameData, trpc } from "../../_trpc/client";

export default function Home() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const gameId = params.id;

  const playerNation = useGameStore((state) => state.playerNation);
  const turn = useGameStore((state) => state.turn);

  const gameActions = useIntentStore((s) => s.gameActions);

  // MENUS
  const [openMenu, setOpenMenu] = useState<OpenMenus>("none");
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  const [buildMode, setBuildMode] = useState<BuildModeType>("none");
  const [isContractSelected, setIsContractSelected] = useState<boolean>(false);
  const [selectedHex, setSelectedHex] = useState<Hex | null>(null);
  // army split value
  const [barValue, setBarValue] = useState<number>(0);
  const [barDragging, setBarDragging] = useState<boolean>(false);

  const barRef = useRef<HTMLDivElement | null>(null);

  // DATA FETCH
  function cleanAndUpdateData(data: GameData) {
    if (!data) return;
    // clean up old data
    cleanTempStates();

    useGameStore.getState().setGameData(data);

    setSelectedHex(
      selectedHex?.id !== null
        ? (data.mapHexes.find((hex) => hex.id === selectedHex?.id) ?? null)
        : null
    );
  }
  function cleanTempStates() {
    useGameStore.getState().reset();
    useIntentStore.getState().reset();
  }
  const mapData = trpc.initialLoad.useQuery({ gameId }, { retry: false });
  const nextTurn = trpc.nextTurn.useMutation({
    onSuccess(data) {
      cleanAndUpdateData(data);
    },
  });

  useEffect(() => {
    if (mapData.error?.message) {
      router.push("/home");
      return;
    }

    if (!mapData.data) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    cleanAndUpdateData(mapData.data);
  }, [mapData.data, mapData.error?.message]);

  useEffect(() => {
    console.log(selectedHex);
  }, [selectedHex]);

  const effectiveResources = useOptimisticResources();
  const effectiveManpower = effectiveResources.manpower ?? 0;
  const effectiveGold = effectiveResources.gold ?? 0;

  return (
    <>
      <div className="relative w-screen h-screen select-none">
        <GameCanvas
          props={{
            buildMode,
            setBuildMode,
            isContractSelected,
            setIsContractSelected,
            selectedHexId: selectedHex?.id ?? null,
            setSelectedHex,
            barDragging,
            setBarDragging,
            barValue,
            setBarValue,
            barRef,
          }}
        ></GameCanvas>

        {/* UI Layer */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          <div className="absolute right-2 bottom-2 pointer-events-auto">
            <Button
              onClick={() => {
                nextTurn.mutate({ gameId, actions: gameActions.map((a) => a.action) });
              }}
            >
              Next Turn (turn: {turn})
            </Button>
          </div>

          <div className="w-full h-full relative">
            {/* LEFT-MENUS */}
            <div className="w-[300px] max-w-[300px] h-full absolute left-0 border">
              <div className="w-full h-full relative">
                <ProvinceInfoSidebar
                  selectedHex={selectedHex}
                  setIsContractSelected={setIsContractSelected}
                  isContractSelected={isContractSelected}
                ></ProvinceInfoSidebar>
                {openMenu === "build" ? (
                  <BuildMenu
                    setOpenMenu={setOpenMenu}
                    setBuildMode={setBuildMode}
                    buildMode={buildMode}
                  ></BuildMenu>
                ) : openMenu === "diplo" ? (
                  <DiplomacyMenu setOpenMenu={setOpenMenu}></DiplomacyMenu>
                ) : null}
              </div>
            </div>

            {/* RIGHT-MENUS */}
            <div className="w-[300px] max-w-[300px] h-full absolute right-0 border">
              <div className="w-full h-full relative">
                <MailMenu></MailMenu>
              </div>
            </div>
          </div>

          <div className="w-full h-[10%] relative bottom-20 flex justify-center items-center">
            <div className="w-[450px] max-w-[450px] h-full">
              {selectedHex && selectedHex.army && playerNation && (
                <DragBar
                  value={barValue}
                  selectedHex={selectedHex}
                  playerNation={playerNation}
                  setBarDragging={setBarDragging}
                  barRef={barRef}
                ></DragBar>
              )}
            </div>
          </div>

          {/* Popups */}
          <div className="w-full h-[20%] absolute top-20 flex justify-center items-center">
            <div className="w-[450px] max-w-[450px] h-full">
              <PopupContainer></PopupContainer>
            </div>
          </div>

          {/* Dialogs */}
          <SettingDialog open={settingsOpen} setOpen={setSettingsOpen}></SettingDialog>

          <div className="absolute left-0 top-0 pointer-events-auto h-[10%] w-full">
            <div className="flex justify-start items-center h-full bg-gray-800">
              <div className="flex justify-between items-center w-full h-full p-1">
                <Image
                  src={`/flags/${getNationName({ id: playerNation?.id ?? "tribes" })}_flag.png`}
                  alt="nation flag"
                  width={1463}
                  height={962}
                  className="w-auto h-full p-[1px] rounded-[8px]"
                ></Image>
                <div className="w-full h-full flex justify-between items-center">
                  <div className="m-2 flex justify-start items-center gap-2 h-full w-auto max-w-[50%] p-1.5 pb-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex justify-center items-center h-full bg-gray-900 shadow-md shadow-black rounded-lg gap-1 p-1 relative group">
                          <Image
                            src="/icons/gold_coin.png"
                            alt="gold coin icon"
                            width={408}
                            height={408}
                            className="w-[30px] h-[30px] flex items-center justify-center"
                          ></Image>
                          <p className="text-white text-2xl">{numberConverter(effectiveGold)}</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <span>{Descriptions["gold"]}</span>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex justify-center items-center h-full bg-gray-900 shadow-md shadow-black rounded-lg gap-1 p-1 relative group">
                          <Image
                            src="/icons/manpower.png"
                            alt="manpower icon"
                            width={408}
                            height={408}
                            className="w-[30px] h-[30px] flex items-center justify-center"
                          ></Image>
                          <p className="text-white text-2xl">
                            {numberConverter(effectiveManpower)}
                          </p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <span>{Descriptions["manpower"]}</span>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="h-full flex items-center justify-center border">
                    <div className="flex items-center justify-center border mr-2 gap-2">
                      <Button
                        onClick={() =>
                          openMenu === "diplo" ? setOpenMenu("none") : setOpenMenu("diplo")
                        }
                      >
                        Diplomacy
                      </Button>
                      <Button
                        onClick={() =>
                          openMenu === "build" ? setOpenMenu("none") : setOpenMenu("build")
                        }
                      >
                        Build
                      </Button>
                      <Button onClick={() => setSettingsOpen(!settingsOpen)}>
                        <Menu className="w-12 h-12 text-amber-200 rounded-xs shrink-0"></Menu>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
