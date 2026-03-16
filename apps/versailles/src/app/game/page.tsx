"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "../_trpc/client";
import Image from "next/image";
import {
  getNationName,
  initBiomePatterns,
  pixelToHex,
  numberConverter,
  renderMap,
  initTextures,
} from "../../canvas/render";
import { findNeighbors, HEX_DIRECTIONS, type Hex, type Nation } from "@repo/shared";
import { Button } from "@/components/ui/button";
import { getHexByAxial, getHexById, isLastElement, randomNumber } from "@/lib/utils";
import { findHexPathBetween } from "@/canvas/pathfinding";
import { d } from "@/canvas/map_data";

export type armyIntent = {
  hexId: number;
  amount: number;
  direction: {
    dq: number;
    dr: number;
  };
};
export type roadObject = {
  id: string;
  points: { q: number; r: number; d1: number; d2: number }[];
};

export default function Home() {
  const [mapHexes, setMapHexes] = useState<Hex[] | null>(null);
  const [nations, setNations] = useState<Nation[] | null>(null);
  const [playerNation, setPlayerNation] = useState<Nation | null>(null);
  const [turn, setTurn] = useState<number>(0);
  const [selectedHex, setSelectedHex] = useState<Hex | null>(null);
  // player army intent
  const [armyMove, setArmyMove] = useState<armyIntent[]>([]);

  // build road array
  const [buildRoads, setBuildRoads] = useState<roadObject[]>([]);
  const [buildMode, setBuildMode] = useState<"none" | "road">("road");

  // DATA FETCH
  const mapData = trpc.generateHexMap.useMutation({
    onSuccess(data) {
      setMapHexes(data.mapHexes);
      setNations(data.nations);
      setTurn(data.turn);
      setSelectedHex(
        prevId !== null ? (data.mapHexes.find((hex) => hex.id === prevId) ?? null) : null
      );
      setPlayerNation(data.nations.find((nation) => nation.isPlayer) ?? null);

      // clear intent data
      setArmyMove([]);
    },
  });
  const nextTurn = trpc.nextTurn.useMutation();

  // generate map
  useEffect(() => {
    mapData.mutate();
  }, []);

  // REFS
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

  const cameraRef = useRef({
    x: 0,
    y: 0,
    zoom: 1,
  });
  const draggingRef = useRef(false);
  const mouseDownRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const lastPosRef = useRef({ x: 0, y: 0 });

  const blinkTimeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animatingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

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
      buildRoads
    );

    ctxs.forEach((c) => c.restore());
  }, [armyMove, buildRoads]);

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

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      const camera = cameraRef.current;
      const zoomSpeed = 0.001;
      camera.zoom *= 1 - event.deltaY * zoomSpeed;
      camera.zoom = Math.min(Math.max(camera.zoom, 0.3), 4);
      redraw();
    },
    [redraw]
  );

  const handleCanvasClick = useCallback(
    (event: MouseEvent) => {
      console.log("click!");
      const hitCanvas = hitCanvasRef.current;
      const map = mapHexesRef.current;
      if (!hitCanvas || !map) return;

      const rect = hitCanvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const camera = cameraRef.current;
      const worldX = (mouseX - hitCanvas.width / 2) / camera.zoom - camera.x;
      const worldY = (mouseY - hitCanvas.height / 2) / camera.zoom - camera.y;

      const { hex } = pixelToHex({ x: worldX, y: worldY, mapHexes: map });
      if (!hex) return;

      // handle left mouse click
      if (event.button === 0) {
        if (buildMode === "road" && !mouseDownRef.current) {
          // set selected hex to be road start
          if (!roadStartRef.current) {
            roadStartRef.current = hex;
            randomIdRef.current = crypto.randomUUID();

            // push starting roadObject to array
            tempRoadRef.current = {
              id: randomIdRef.current!,
              points: [
                { q: hex.q, r: hex.r, d1: randomNumber(d.a, d.b), d2: randomNumber(d.a, d.b) },
              ],
            };
          } else {
            // add logic to submit the road from temp to actual array and clean up
            if (tempRoadRef.current) {
              buildRoads.push(tempRoadRef.current);
            }

            // cleanup
            tempRoadRef.current = null;
            roadStartRef.current = null;
            randomIdRef.current = null;
            setBuildMode("none");
          }
        } else {
          console.log(hex.id);
          selectedHexIdRef.current = hex.id;
          setSelectedHex(hex);

          startAnimation();
          redraw();
        }
      }

      // handle right mouse click
      if (event.button === 2) {
        console.log("GOT THE CLICK");
        if (selectedHexIdRef.current === hex.id || !selectedHex) return;
        if (
          !HEX_DIRECTIONS.some(
            (dir) => dir.dq === selectedHex.q - hex.q && dir.dr === selectedHex.r - hex.r
          )
        )
          return;
        setArmyMove((prev) => [
          ...prev,
          {
            hexId: selectedHex.id,
            amount: 100,
            direction: {
              dq: hex.q - selectedHex.q,
              dr: hex.r - selectedHex.r,
            },
          },
        ]);
      }
    },
    [redraw, startAnimation, selectedHex, buildMode, buildRoads]
  );

  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (event.button !== 0 && event.button !== 2) return;
    mouseDownRef.current = true;
    draggingRef.current = false;
    startPosRef.current = { x: event.clientX, y: event.clientY };
    lastPosRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (buildMode === "road" && !mouseDownRef.current && roadStartRef) {
        const hitCanvas = hitCanvasRef.current;
        const map = mapHexesRef.current;
        if (!hitCanvas || !map) return;
        if (!mapHexes) return;
        if (!randomIdRef.current) return;
        if (!tempRoadRef.current) return;

        const rect = hitCanvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const camera = cameraRef.current;
        const worldX = (mouseX - hitCanvas.width / 2) / camera.zoom - camera.x;
        const worldY = (mouseY - hitCanvas.height / 2) / camera.zoom - camera.y;

        const { hex } = pixelToHex({ x: worldX, y: worldY, mapHexes: map });
        if (!hex) return;

        // add hex to temporary array
        const tempRoadArray = tempRoadRef.current;

        const pointSet = new Set<string>();
        tempRoadArray?.points.forEach((point) => pointSet.add(`${point.q},${point.r}`));

        const tempArrayHexes = mapHexes.filter((h) => pointSet.has(`${h.q},${h.r}`));
        const tempArrayHexIds = tempArrayHexes.map((h) => h.id);
        const hasHexId = tempArrayHexIds.includes(hex.id);
        if (hasHexId && isLastElement(tempArrayHexIds, hex.id)) return;

        // reset back to that hex
        if (hasHexId) {
          const idx = tempRoadArray.points.findIndex((p) => p.q === hex.q && p.r === hex.r) + 1;
          tempRoadArray?.points.splice(idx);
        } else {
          // add hex to temp array

          // check for gaps
          const neighborIds = findNeighbors(hex, mapHexes).map((n) => n.id);
          if (tempRoadArray) {
            // check if last added hex does not border with current hex
            const lastPoint = tempRoadArray.points[tempRoadArray.points.length - 1];
            const lastHexOfRoad = getHexByAxial(lastPoint.q, lastPoint.r, mapHexes);
            if (!lastHexOfRoad) return;

            if (!neighborIds.includes(lastHexOfRoad.id)) {
              // fill distance with hex path

              const path = findHexPathBetween(
                { q: lastHexOfRoad.q, r: lastHexOfRoad.r },
                { q: hex.q, r: hex.r }
              ).slice(1, -1);
              const missingHexes: Hex[] = [];
              path.forEach((axialObj) => {
                const missingHex = getHexByAxial(axialObj.q, axialObj.r, mapHexes);
                if (!missingHex) return;
                missingHexes.push(missingHex);

                // add missing hex coordinates to road object
                tempRoadArray.points.push({
                  q: missingHex.q,
                  r: missingHex.r,
                  d1: randomNumber(d.a, d.b),
                  d2: randomNumber(d.a, d.b),
                });
              });
            }
          }

          tempRoadArray.points.push({
            q: hex.q,
            r: hex.r,
            d1: randomNumber(d.a, d.b),
            d2: randomNumber(d.a, d.b),
          });
        }
        redraw();
      }

      // Dragging map
      if (!mouseDownRef.current) return;

      const start = startPosRef.current;
      const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      if (!draggingRef.current && distance > 6) {
        draggingRef.current = true;
      }
      if (!draggingRef.current) return;

      const last = lastPosRef.current;
      const camera = cameraRef.current;
      camera.x += (event.clientX - last.x) / camera.zoom;
      camera.y += (event.clientY - last.y) / camera.zoom;
      lastPosRef.current = { x: event.clientX, y: event.clientY };

      redraw();
    },
    [redraw, buildMode, mapHexes]
  );

  const handleMouseUp = useCallback(
    (event: MouseEvent) => {
      if (!mouseDownRef.current) return;
      mouseDownRef.current = false;

      if (!draggingRef.current) {
        handleCanvasClick(event);
      }

      draggingRef.current = false;
    },
    [handleCanvasClick]
  );

  const handleMouseLeave = useCallback(() => {
    draggingRef.current = false;
    mouseDownRef.current = false;
  }, []);

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
    hitCanvas.addEventListener("mousemove", handleMouseMove);
    hitCanvas.addEventListener("mouseup", handleMouseUp);
    hitCanvas.addEventListener("mouseleave", handleMouseLeave);
    hitCanvas.addEventListener("contextmenu", preventContextMenu);

    return () => {
      window.removeEventListener("resize", resize);
      hitCanvas.removeEventListener("wheel", handleWheel);
      hitCanvas.removeEventListener("mousedown", handleMouseDown);
      hitCanvas.removeEventListener("mousemove", handleMouseMove);
      hitCanvas.removeEventListener("mouseup", handleMouseUp);
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
                  newQueuedBuildings: [],
                  buildRoads: buildRoads,
                });
                mapData.mutate();
                console.log(selectedHex);
                console.log(selectedHexIdRef.current);
              }}
            >
              Next Turn (turn: {turn})
            </Button>
          </div>

          <div className="h-[50%] w-[20%] absolute left-0 bottom-0 p-2">
            <div className="flex flex-col justify-between items-center h-full w-full bg-gray-800 rounded-xl pointer-events-auto p-2 gap-4">
              <div className="flex flex-col w-full justify-between bg-gray-900 rounded-lg shadow-md shadow-black">
                <div className="w-[50%] h-auto bg-amber-200 m-2 rounded-[5px]">
                  <Image
                    src={`/flags/${getNationName({ id: selectedHex?.owner ?? "tribes" })}_flag.png`}
                    alt="nation flag"
                    width={1463}
                    height={962}
                    className="w-full h-full p-[1px] rounded-[8px]"
                  ></Image>
                </div>

                <p className="text-2xl text-white flex items-center justify-start p-2 w-full">
                  {getNationName({ id: selectedHex?.owner ?? "tribes" })}
                </p>
              </div>
              <div className="w-full h-[40%]">
                <div className="w-full h-full flex flex-col justify-center gap-2">
                  <div className="bg-gray-900 shadow-md shadow-black rounded-lg text-white h-full flex justify-center items-center text-2xl w-full">
                    <div className="w-[50%] h-auto p-2 group relative">
                      <Image
                        src={`/urban/${selectedHex?.building ? selectedHex.building.type : "empty"}.png`}
                        alt="urban type"
                        width={1482}
                        height={972}
                        className="w-full h-full"
                      ></Image>
                      <div
                        className="
                          absolute left-1/2 bottom-full mt-2 -translate-x-1/2
                          rounded-md bg-zinc-900 border border-zinc-700
                          px-3 py-1 text-xs text-zinc-100
                          opacity-0 group-hover:opacity-100
                          transition
                          shadow-lg
                          pointer-events-none"
                      >
                        Urban Type: {`${selectedHex?.building?.type ?? "empty"}`}
                      </div>
                    </div>
                    <div className="w-[50%] h-auto p-2 group relative">
                      <Image
                        src={`/biome_type/${selectedHex ? selectedHex.biome : "plains"}.png`}
                        alt="biome type"
                        width={1482}
                        height={972}
                        className="w-full h-full"
                      ></Image>
                      <div
                        className="
                          absolute left-1/2 bottom-full mt-2 -translate-x-1/2
                          rounded-md bg-zinc-900 border border-zinc-700
                          px-3 py-1 text-xs text-zinc-100
                          opacity-0 group-hover:opacity-100
                          transition
                          shadow-lg
                          pointer-events-none"
                      >
                        Biome: {selectedHex?.biome}
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-900 shadow-md shadow-black rounded-lg text-white h-full flex justify-center items-center text-2xl">
                    {numberConverter(selectedHex?.population?.toString() ?? "1000")}
                    <Image
                      src="/icons/population.png"
                      alt="population icon"
                      width={48}
                      height={32}
                      className="w-9 h-7"
                    ></Image>
                  </div>
                </div>
              </div>
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
                    <div className="flex justify-center items-center h-full bg-gray-900 shadow-md shadow-black rounded-lg gap-1 p-1">
                      <Image
                        src="/icons/gold_coin.png"
                        alt="gold coin icon"
                        width={399}
                        height={408}
                        className="w-auto h-[70%] flex items-center justify-center"
                      ></Image>
                      <p className="text-white text-2xl">{numberConverter("1000")}</p>
                    </div>
                    <div className="flex justify-center items-center h-full bg-gray-900 shadow-md shadow-black rounded-lg gap-1 p-1">
                      <Image
                        src="/icons/wheat_bag.png"
                        alt="wheat bag icon"
                        width={408}
                        height={612}
                        className="w-auto h-[80%] flex items-center justify-center"
                      ></Image>
                      <p className="text-white text-2xl">100</p>
                    </div>
                  </div>
                  <div className="h-full flex items-center justify-center">
                    <div className="flex items-center justify-center">
                      <Button>Open Menu</Button>
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
