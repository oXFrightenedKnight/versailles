"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { trpc } from "../_trpc/client";
import Image from "next/image";
import {
  getNationName,
  initBiomePatterns,
  numberConverter,
  renderMap,
  initTextures,
} from "../../canvas/render";
import { type Hex, type Nation } from "@repo/shared";
import { Button } from "@/components/ui/button";
import { d } from "@/canvas/map_data";
import ProvinceInfoSidebar from "@/components/ProvinceInfoSidebar";
import BuildMenu from "@/components/BuildingMenu/buildButton";
import Tooltip from "@/components/tooltip";
import { Descriptions } from "@/lib/data";
import { useGameStore } from "@/lib/gameStore";
import { useIntentStore } from "@/lib/intentStore";
import { useCameraController } from "@/hooks/useCameraController";
import { dispatchMapTap, handleRoadDrag } from "@/canvas/handleClick";
import { calculateOptimisticGold, calculateOptimisticManpower } from "@/lib/utils";
import { BuildModeType, roadObject } from "@/lib/types/game";
import { getServerContractsFromBuildings } from "@/lib/helpers/uiContract";

export default function Home() {
  const mapHexes = useGameStore((state) => state.mapHexes);
  const nations = useGameStore((state) => state.nations);
  const playerNation = useGameStore((state) => state.playerNation);
  const turn = useGameStore((state) => state.turn);
  const roads = useGameStore((state) => state.roads);
  const buildings = useGameStore((state) => state.buildings);
  const [selectedHex, setSelectedHex] = useState<Hex | null>(null);

  // player army intent
  const armyMove = useIntentStore((state) => state.armyMove);
  const setArmyMove = useIntentStore((state) => state.setArmyMove);

  // road building intent storage
  const buildRoads = useIntentStore((state) => state.buildRoads); // UPDATE WITH SERVER DATA LATER
  const setBuildRoads = useIntentStore((state) => state.setBuildRoads);

  // new buildings
  const buildBuildings = useIntentStore((state) => state.buildBuildings);
  const setBuildBuildings = useIntentStore((state) => state.setBuildBuildings);

  // contracts
  const contracts = useIntentStore((state) => state.contracts);
  const setContracts = useIntentStore((state) => state.setContracts);
  const serverContracts = getServerContractsFromBuildings(buildings);
  const serverContractUpdate = useIntentStore((state) => state.serverContractUpdate);

  // troop training
  const armyTraining = useIntentStore((state) => state.armyTraining);
  const setArmyTraining = useIntentStore((state) => state.setArmyTraining);

  // MENUS
  const [buildMenuOpen, setBuildMenuOpen] = useState<boolean>(false);

  // ui states
  const [buildMode, setBuildMode] = useState<BuildModeType>("none");
  const [isContractSelected, setIsContractSelected] = useState<boolean>(false);

  // DATA FETCH
  const mapData = trpc.generateHexMap.useMutation({
    onSuccess(data) {
      // clean up old data
      cleanTempStates();

      useGameStore.getState().setGameData(data);

      setSelectedHex(
        prevId !== null ? (data.mapHexes.find((hex) => hex.id === prevId) ?? null) : null
      );
    },
  });
  const nextTurn = trpc.nextTurn.useMutation();
  function cleanTempStates() {
    setBuildBuildings([]);
    setBuildRoads([]);
    setArmyTraining([]);
    setContracts([]);
    setArmyMove([]);
    setBuildRoads([]);
  }

  // generate map
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

  // animation refs
  const blinkTimeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animatingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  // --- MEMOs --- (values updated when deps change)
  const effectiveManpower = useMemo(() => {
    return calculateOptimisticManpower(armyTraining, playerNation);
  }, [playerNation, armyTraining]);

  const effectiveGold = useMemo(() => {
    return calculateOptimisticGold(mapHexes, buildBuildings, buildings, playerNation);
  }, [playerNation, buildBuildings, mapHexes, buildings]);

  // --- CAMERA CONTROLING ---
  const {
    cameraRef,
    mouseDownRef,
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
      buildRoads, // array of roads to BE built
      tempRoadRef.current, // temporary road drawn by player
      roads // real road
    );

    ctxs.forEach((c) => c.restore());
  }, [armyMove, buildRoads, roads, cameraRef]);

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
        buildings,
        setIsContractSelected,
        roadStartRef,
        randomIdRef,
        tempRoadRef,
        setBuildMode,
        buildBuildings,
        setBuildBuildings,
        setArmyMove,
        contracts,
        setContracts,
        setBuildRoads,
        serverContracts,
        serverContractUpdate,
        d,
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

      playerNation,
      buildings,
      isContractSelected,
      mapHexes,
      roads,

      contracts,
      setContracts,

      setBuildRoads,

      setArmyMove,

      cameraRef,
      mouseDownRef,

      serverContracts,
      serverContractUpdate,
    ]
  );

  const onMouseUp = useCallback(
    (e: MouseEvent) => {
      const wasDragging = handleMouseUp(e); // from useCameraController
      if (!wasDragging) {
        handleCanvasClick(e); // your map tap dispatcher
      }
    },
    [handleMouseUp, handleCanvasClick]
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
      };
      // wire road and dragging
      handleRoadDrag(e, ctx);
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

    return () => {
      window.removeEventListener("resize", resize);
      hitCanvas.removeEventListener("wheel", handleWheel);
      hitCanvas.removeEventListener("mousedown", handleMouseDown);
      hitCanvas.removeEventListener("mousemove", onMouseMove);
      hitCanvas.removeEventListener("mouseup", onMouseUp);
      hitCanvas.removeEventListener("mouseleave", handleMouseLeave);
      hitCanvas.removeEventListener("contextmenu", preventContextMenu);
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
  ]);

  useEffect(() => {
    startAnimation();
    return () => stopAnimation();
  }, [startAnimation, stopAnimation]);

  return (
    <>
      <div className="relative w-screen h-screen">
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
                });
                mapData.mutate();
                console.log(selectedHex);
                console.log(selectedHexIdRef.current);
              }}
            >
              Next Turn (turn: {turn})
            </Button>
          </div>
          {/* MENUS */}
          <div className="w-[300px] max-w-[300px] h-full relative">
            <ProvinceInfoSidebar
              selectedHex={selectedHex}
              buildings={buildings}
              setIsContractSelected={setIsContractSelected}
              isContractSelected={isContractSelected}
            ></ProvinceInfoSidebar>
            <BuildMenu
              isOpen={buildMenuOpen}
              setIsOpen={setBuildMenuOpen}
              setBuildMode={setBuildMode}
              buildMode={buildMode}
            ></BuildMenu>
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
                      <p className="text-white text-2xl">
                        {numberConverter(effectiveGold.toString())}
                      </p>
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
                      <p className="text-white text-2xl">
                        {numberConverter(effectiveManpower.toString())}
                      </p>
                      <Tooltip text={Descriptions["manpower"]} position="bottom"></Tooltip>
                    </div>
                  </div>
                  <div className="h-full flex items-center justify-center border">
                    <div className="flex items-center justify-center border mr-2">
                      <Button
                        onClick={() => {
                          setBuildMenuOpen(!buildMenuOpen);
                        }}
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
