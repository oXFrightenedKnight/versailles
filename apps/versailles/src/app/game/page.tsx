"use client";

import {
  dispatchMapTap,
  handleBarDrag,
  handleRoadDrag,
  stopBarDrag,
} from "@/canvas/click/handleClick";
import { d } from "@/canvas/map_data";
import DragBar from "@/components/GameComponents/DragBar";
import Tooltip from "@/components/GameComponents/tooltip";
import BuildMenu from "@/components/SideMenus/BuildingMenu/buildButton";
import DiplomacyMenu from "@/components/SideMenus/DiplomacyMenu/MainMenu";
import MailMenu from "@/components/SideMenus/Mails/MainMenu";
import ProvinceInfoSidebar from "@/components/SideMenus/ProvinceMenu/ProvinceInfoSidebar";
import { Button } from "@/components/ui/button";
import { useCameraController } from "@/hooks/useCameraController";
import { Descriptions, OpenMenus } from "@/lib/data";
import { getNationName } from "@/lib/helpers/nations";
import { useGameStore } from "@/lib/stores/gameStore";
import { useIntentStore } from "@/lib/stores/intentStore";
import { BuildModeType, roadObject } from "@/lib/types/game";
import { getUIBuildings } from "@/lib/UI/mergeData/uiBuildings";
import { getServerContractsFromBuildings } from "@/lib/UI/mergeData/uiContract";
import { getRenderRoads } from "@/lib/UI/mergeData/uiRoads";
import { calculateOptimisticGold } from "@/lib/UI/optimisticCalc/gold";
import { calculateOptimisticManpower } from "@/lib/UI/optimisticCalc/manpower";
import { numberConverter } from "@/lib/utils";
import { Hex } from "@repo/shared/data/hex_map";
import { Nation } from "@repo/shared/data/nations";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { initBiomePatterns, initTextures, renderMap } from "../../canvas/render";
import { GameData, trpc } from "../_trpc/client";

export default function Home() {
  const mapHexes = useGameStore((state) => state.mapHexes);
  const nations = useGameStore((state) => state.nations);
  const playerNation = useGameStore((state) => state.playerNation);
  const turn = useGameStore((state) => state.turn);
  const roads = useGameStore((state) => state.roads);
  const buildings = useGameStore((state) => state.buildings);

  // player army intent
  const armyMove = useIntentStore((state) => state.armyMove);
  const setArmyMove = useIntentStore((state) => state.setArmyMove);

  // road building intent storage
  const buildRoads = useIntentStore((state) => state.buildRoads); // UPDATE WITH SERVER DATA LATER
  const setBuildRoads = useIntentStore((state) => state.setBuildRoads);
  const serverCancelRoadBuilding = useIntentStore((state) => state.serverCancelRoadBuilding);

  // new buildings
  const buildBuildings = useIntentStore((state) => state.buildBuildings);
  const setBuildBuildings = useIntentStore((state) => state.setBuildBuildings);
  // delete buildings intent
  const serverBuildingsDelete = useIntentStore((state) => state.serverBuildingsDelete);
  const serverBuildingsCancel = useIntentStore((state) => state.serverCancelBuilding);

  // contracts
  const contracts = useIntentStore((state) => state.contracts);
  const setContracts = useIntentStore((state) => state.setContracts);
  const serverContracts = getServerContractsFromBuildings(buildings);
  const serverContractUpdate = useIntentStore((state) => state.serverContractUpdate);
  const serverContractDelete = useIntentStore((state) => state.serverContractDelete);

  // troop training
  const armyTraining = useIntentStore((state) => state.armyTraining);
  const serverTrainingDelete = useIntentStore((state) => state.serverTrainingDelete);

  // War declaration
  const declareWar = useIntentStore((state) => state.declareWar);

  // Mails
  const readMails = useIntentStore((state) => state.readMails);
  const answeredMails = useIntentStore((state) => state.answeredMails);

  // MENUS
  const [openMenu, setOpenMenu] = useState<OpenMenus>("none");

  // ui states
  const [buildMode, setBuildMode] = useState<BuildModeType>("none");
  const [isContractSelected, setIsContractSelected] = useState<boolean>(false);
  const [selectedHex, setSelectedHex] = useState<Hex | null>(null);
  // army split value
  const [barValue, setBarValue] = useState<number>(0);
  const [barDragging, setBarDragging] = useState<boolean>(false);

  // DATA FETCH
  function cleanAndUpdateData(data: GameData) {
    if (!data) return;
    // clean up old data
    cleanTempStates();

    useGameStore.getState().setGameData(data);

    setSelectedHex(
      prevId !== null ? (data.mapHexes.find((hex) => hex.id === prevId) ?? null) : null
    );
  }
  function cleanTempStates() {
    useGameStore.getState().reset();
    useIntentStore.getState().reset();
  }
  const mapData = trpc.initialLoad.useMutation({
    onSuccess(data) {
      cleanAndUpdateData(data);
    },
  });
  const nextTurn = trpc.nextTurn.useMutation({
    onSuccess(data) {
      cleanAndUpdateData(data);
    },
  });

  // initially generate map
  useEffect(() => {
    mapData.mutate();
  }, []);

  useEffect(() => {
    console.log(selectedHex);
  }, [selectedHex]);

  // --- REFS ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hitCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const clickCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const mapHexesRef = useRef<Hex[] | null>(null);
  const nationsRef = useRef<Nation[] | null>(null);
  const playerNationRef = useRef<Nation | null>(null);
  const selectedHexIdRef = useRef<number | null>(null);
  const prevId = selectedHexIdRef.current;

  // first hex to that road building starts from
  const roadStartRef = useRef<Hex | null>(null);
  // add temporary road path tracker
  const tempRoadRef = useRef<roadObject | null>(null);
  const randomIdRef = useRef<string | null>(null);

  // drag bar ref
  const barRef = useRef<HTMLDivElement | null>(null);

  // animation refs
  const blinkTimeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animatingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  // --- MEMOs --- (values updated when deps change)

  // remaining buildings to render after filtering out deleted by intent
  const BuildingsUI = getUIBuildings(buildings, serverBuildingsDelete);
  const RoadsUI = getRenderRoads(roads, serverCancelRoadBuilding, buildRoads);

  const effectiveManpower = useMemo(() => {
    return calculateOptimisticManpower(armyTraining, playerNation);
  }, [playerNation, armyTraining]);

  const effectiveGold = useMemo(() => {
    return calculateOptimisticGold(mapHexes, buildBuildings, BuildingsUI, playerNation);
  }, [playerNation, buildBuildings, mapHexes, BuildingsUI]);

  // --- CAMERA CONTROLING ---
  const {
    cameraRef,
    mouseDownRef,
    draggingRef,
    startPosRef,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  } = useCameraController();

  const redraw = useCallback(() => {
    const ctx = ctxRef.current;
    const clickCtx = clickCtxRef.current;
    const map = mapHexesRef.current;
    const nationList = nationsRef.current;

    if (!ctx || !clickCtx || !map || !nationList) return;

    const now = performance.now();
    const last = lastTimeRef.current || now;
    const dt = (now - last) / 1000;
    lastTimeRef.current = now;
    blinkTimeRef.current += dt;

    const ctxs = [ctx, clickCtx];
    const canvas = ctx.canvas;

    ctxs.forEach((c) => {
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.save();
      c.translate(canvas.width / 2, canvas.height / 2);
      c.scale(cameraRef.current.zoom, cameraRef.current.zoom);
      c.translate(cameraRef.current.x, cameraRef.current.y);
    });

    renderMap(
      ctx,
      clickCtx,
      0,
      0,
      selectedHexIdRef.current,
      blinkTimeRef.current,
      map,
      nationList,
      armyMove,
      tempRoadRef.current, // temporary road drawn by player
      RoadsUI
    );

    ctxs.forEach((c) => c.restore());
  }, [armyMove, RoadsUI, cameraRef]);

  const startAnimation = useCallback(() => {
    if (animatingRef.current) return;
    animatingRef.current = true;

    const step = () => {
      redraw();
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
  }, [redraw]);

  const stopAnimation = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    animatingRef.current = false;
  }, []);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const hitCanvas = hitCanvasRef.current;
    if (!canvas || !hitCanvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    hitCanvas.width = window.innerWidth;
    hitCanvas.height = window.innerHeight;

    redraw();
  }, [redraw]);

  const handleCanvasClick = useCallback(
    (event: MouseEvent) => {
      const hitCanvas = hitCanvasRef.current;
      if (!hitCanvas) return;

      const rect = hitCanvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const camera = cameraRef.current;
      const worldX = (mouseX - hitCanvas.width / 2) / camera.zoom - camera.x;
      const worldY = (mouseY - hitCanvas.height / 2) / camera.zoom - camera.y;

      const ctx = {
        mouseDownRef,
        buildMode,
        isContractSelected,
        selectedHexIdRef,
        setSelectedHex,
        startAnimation,
        redraw,
        selectedHex,
        playerNation,
        mapHexes,
        roads,
        BuildingsUI,
        setIsContractSelected,
        roadStartRef,
        randomIdRef,
        tempRoadRef,
        setBuildMode,
        buildBuildings,
        setBuildBuildings,
        armyMove,
        setArmyMove,
        contracts,
        setContracts,
        setBuildRoads,
        serverContracts,
        serverContractUpdate,
        d,
        barValue,
        setBarValue,
        serverBuildingsCancel,
      };

      dispatchMapTap(worldX, worldY, event.button, ctx);
    },
    [
      redraw,
      startAnimation,
      selectedHex,
      buildMode,

      buildBuildings,
      setBuildBuildings,
      serverBuildingsCancel,

      playerNation,
      BuildingsUI,
      isContractSelected,
      mapHexes,
      roads,

      contracts,
      setContracts,

      setBuildRoads,

      armyMove,
      setArmyMove,

      cameraRef,
      mouseDownRef,

      serverContracts,
      serverContractUpdate,

      barValue,
      setBarValue,
    ]
  );

  const onMouseUp = useCallback(
    (e: MouseEvent) => {
      const wasDragging = handleMouseUp(e); // from useCameraController
      if (!wasDragging) {
        handleCanvasClick(e); // your map tap dispatcher
      } else {
        stopBarDrag(setBarDragging);
      }
    },
    [handleMouseUp, handleCanvasClick]
  );
  const onWindowMouseUp = useCallback(
    (e: MouseEvent) => {
      if (barDragging) {
        stopBarDrag(setBarDragging);
      }
    },
    [barDragging]
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      const ctx = {
        buildMode,
        mouseDownRef,
        roadStartRef,
        mapHexesRef,
        tempRoadRef,
        hitCanvasRef,
        mapHexes,
        randomIdRef,
        cameraRef,
        playerNation,
        roads,
        buildRoads,
        d,
        barDragging,
        setBarDragging,
        draggingRef,
        startPosRef,
        barRef,
        barValue,
        setBarValue,
        selectedHex,
        armyMove,
      };
      // wire road and dragging
      handleRoadDrag(e, ctx);
      handleBarDrag(e, ctx);
      handleMouseMove(e);
    },
    [
      buildMode,
      mouseDownRef,
      roadStartRef,
      mapHexesRef,
      tempRoadRef,
      hitCanvasRef,
      mapHexes,
      randomIdRef,
      cameraRef,
      playerNation,
      roads,
      buildRoads,
      handleMouseMove,
      barDragging,
      setBarDragging,
      draggingRef,
      startPosRef,
      barRef,
      barValue,
      setBarValue,
      selectedHex,
      armyMove,
    ]
  );
  const onWidnowMouseMove = useCallback(
    (e: MouseEvent) => {
      const ctx = {
        buildMode,
        mouseDownRef,
        roadStartRef,
        mapHexesRef,
        tempRoadRef,
        hitCanvasRef,
        mapHexes,
        randomIdRef,
        cameraRef,
        playerNation,
        roads,
        buildRoads,
        d,
        barDragging,
        setBarDragging,
        draggingRef,
        startPosRef,
        barRef,
        barValue,
        setBarValue,
        selectedHex,
        armyMove,
      };
      // handle bar drag
      if (barDragging) {
        handleBarDrag(e, ctx);
      }
    },
    [
      buildMode,
      mouseDownRef,
      roadStartRef,
      mapHexesRef,
      tempRoadRef,
      hitCanvasRef,
      mapHexes,
      randomIdRef,
      cameraRef,
      playerNation,
      roads,
      buildRoads,
      barDragging,
      setBarDragging,
      draggingRef,
      startPosRef,
      barRef,
      barValue,
      setBarValue,
      selectedHex,
      armyMove,
    ]
  );

  useEffect(() => {
    mapHexesRef.current = mapHexes;
    redraw();
  }, [mapHexes, redraw]);

  useEffect(() => {
    nationsRef.current = nations;
    playerNationRef.current = nations?.find((nation) => nation.isPlayer) ?? null;
    console.log("playerNationRef", playerNationRef.current);
    console.log("playerNation", playerNation);
    redraw();
  }, [nations, redraw, playerNation]);

  // replace old event listeners with new ones that contain snapshots of newest data
  useEffect(() => {
    const canvas = canvasRef.current;
    const hitCanvas = hitCanvasRef.current;
    if (!canvas || !hitCanvas) return;

    ctxRef.current = canvas.getContext("2d");
    clickCtxRef.current = hitCanvas.getContext("2d");
    lastTimeRef.current = performance.now();

    initBiomePatterns(ctxRef.current!).then(() => redraw());
    initTextures(clickCtxRef.current!).then(() => redraw());
    resize();

    // prevent default for right mouse click
    const preventContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener("resize", resize);
    hitCanvas.addEventListener("wheel", handleWheel);
    hitCanvas.addEventListener("mousedown", handleMouseDown);
    hitCanvas.addEventListener("mousemove", onMouseMove);
    hitCanvas.addEventListener("mouseup", onMouseUp);
    hitCanvas.addEventListener("mouseleave", handleMouseLeave);
    hitCanvas.addEventListener("contextmenu", preventContextMenu);
    // event listener for bar dragging
    window.addEventListener("mousemove", onWidnowMouseMove);
    window.addEventListener("mouseup", onWindowMouseUp);

    return () => {
      window.removeEventListener("resize", resize);
      hitCanvas.removeEventListener("wheel", handleWheel);
      hitCanvas.removeEventListener("mousedown", handleMouseDown);
      hitCanvas.removeEventListener("mousemove", onMouseMove);
      hitCanvas.removeEventListener("mouseup", onMouseUp);
      hitCanvas.removeEventListener("mouseleave", handleMouseLeave);
      hitCanvas.removeEventListener("contextmenu", preventContextMenu);
      window.removeEventListener("mousemove", onWidnowMouseMove);
      window.removeEventListener("mouseup", onWindowMouseUp);
    };
  }, [
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleWheel,
    redraw,
    resize,
    onMouseUp,
    onMouseMove,
    onWidnowMouseMove,
    onWindowMouseUp,
  ]);

  useEffect(() => {
    startAnimation();
    return () => stopAnimation();
  }, [startAnimation, stopAnimation]);

  return (
    <>
      <div className="relative w-screen h-screen select-none">
        <canvas ref={hitCanvasRef} className="absolute inset-0 z-10" />
        <canvas ref={canvasRef} className="absolute inset-0 z-0" />

        {/* UI Layer */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          <div className="absolute right-2 bottom-2 pointer-events-auto">
            <Button
              onClick={() => {
                nextTurn.mutate({
                  movePlayerArmy: armyMove,
                  newQueuedBuildings: buildBuildings,
                  buildRoads: buildRoads,
                  createNewContracts: contracts,
                  trainNewArmy: armyTraining.map((a) => ({
                    amount: a.amount,
                    barrackId: a.barrackId,
                  })),
                  deleteArmyTrain: serverTrainingDelete,
                  buildingCancel: serverBuildingsCancel,
                  buildingDelete: serverBuildingsDelete,
                  cancelRoadBuild: serverCancelRoadBuilding,
                  deleteContracts: serverContractDelete,
                  updateContracts: serverContractUpdate,
                  declareWar: declareWar,
                  answeredMails,
                  readMails,
                });
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
                  buildingsUI={BuildingsUI}
                  setIsContractSelected={setIsContractSelected}
                  isContractSelected={isContractSelected}
                  serverBuildingsDelete={serverBuildingsDelete}
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
                    <div className="flex justify-center items-center h-full bg-gray-900 shadow-md shadow-black rounded-lg gap-1 p-1 relative group">
                      <Image
                        src="/icons/gold_coin.png"
                        alt="gold coin icon"
                        width={408}
                        height={408}
                        className="w-[30px] h-[30px] flex items-center justify-center"
                      ></Image>
                      <p className="text-white text-2xl">{numberConverter(effectiveGold)}</p>
                      <Tooltip text={Descriptions["gold"]} position="bottom"></Tooltip>
                    </div>
                    <div className="flex justify-center items-center h-full bg-gray-900 shadow-md shadow-black rounded-lg gap-1 p-1 relative group">
                      <Image
                        src="/icons/manpower.png"
                        alt="manpower icon"
                        width={408}
                        height={408}
                        className="w-[30px] h-[30px] flex items-center justify-center"
                      ></Image>
                      <p className="text-white text-2xl">{numberConverter(effectiveManpower)}</p>
                      <Tooltip text={Descriptions["manpower"]} position="bottom"></Tooltip>
                    </div>
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
