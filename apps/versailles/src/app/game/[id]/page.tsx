"use client";

import GameCanvas from "@/canvas/GameCanvas";
import DragBar from "@/components/GameComponents/DragBar";
import BuildMenu from "@/components/SideMenus/BuildingMenu/buildButton";
import DiplomacyMenu from "@/components/SideMenus/DiplomacyMenu/MainMenu";
import MailMenu from "@/components/SideMenus/Mails/MainMenu";
import PopupContainer from "@/components/SideMenus/Popups/PopupContainer";
import ProvinceInfoSidebar from "@/components/SideMenus/ProvinceMenu/ProvinceInfoSidebar";
import { Button } from "@/components/ui/button";
import { OpenMenus } from "@/lib/data";
import { useGameStore } from "@/lib/stores/gameStore";
import { useIntentStore } from "@/lib/stores/intentStore";
import { BuildModeType } from "@/lib/types/game";
import { selectHexes } from "@/lib/UI/mergeData/hexes/selectors";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import SettingDialog from "../../../components/GameComponents/settingDialog";
import { GameData, trpc } from "../../_trpc/client";
import GameNavbar from "@/components/navbar/GameNavbar";

export default function Home() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const gameId = params.id;

  const serverHexes = useGameStore((state) => state.mapHexes);
  const playerNation = useGameStore((state) => state.playerNation);
  const turn = useGameStore((state) => state.turn);

  const gameActions = useIntentStore((s) => s.gameActions);

  const mapHexes = selectHexes(serverHexes, gameActions);

  // MENUS
  const [openMenu, setOpenMenu] = useState<OpenMenus>("none");
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  const [buildMode, setBuildMode] = useState<BuildModeType>("none");

  const [isContractSelected, setIsContractSelected] = useState<boolean>(false);
  const [selectedHexId, setSelectedHexId] = useState<number | null>(null);
  // army split value
  const [barValue, setBarValue] = useState<number>(0);
  const [barDragging, setBarDragging] = useState<boolean>(false);

  const barRef = useRef<HTMLDivElement | null>(null);

  const selectedHex =
    selectedHexId === null ? null : (mapHexes.find((hex) => hex.id === selectedHexId) ?? null);

  // DATA FETCH
  function cleanAndUpdateData(data: GameData) {
    if (!data) return;
    // clean up old data
    cleanTempStates();

    useGameStore.getState().setGameData(data);

    setSelectedHexId(
      selectedHex?.id !== null
        ? (data.mapHexes.find((hex) => hex.id === selectedHex?.id)?.id ?? null)
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
  }, [mapData.data, mapData.error?.message, router]);

  useEffect(() => {
    console.log(selectedHex);
  }, [selectedHex]);

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
            selectHex: (hex) => setSelectedHexId(hex ? hex.id : null),
            barDragging,
            setBarDragging,
            barValue,
            setBarValue,
            barRef,
            openMenu,
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

          <GameNavbar
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            settingsOpen={settingsOpen}
            setSettingsOpen={setSettingsOpen}
          ></GameNavbar>
        </div>
      </div>
    </>
  );
}
