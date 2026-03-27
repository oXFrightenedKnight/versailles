"use client";

import { useCallback, useEffect, useRef, useState, createContext } from "react";
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
import {
  BUILDINGS_CATEGORY,
  findNeighbors,
  getBuilding,
  hasSegment,
  HEX_DIRECTIONS,
  Road,
  topLevelsByCategory,
  type Hex,
  type Nation,
  type Building,
  getHexByAxial,
} from "@repo/shared";
import { Button } from "@/components/ui/button";
import { randomNumber } from "@/lib/utils";
import { findHexPathBetween } from "@/canvas/pathfinding";
import { d } from "@/canvas/map_data";
import ProvinceInfoSidebar from "@/components/ProvinceInfoSidebar";
import BuildMenu from "@/components/buildButton";

export type DecisionContextObject = {
  army?: {
    setArmyTraining: React.Dispatch<React.SetStateAction<ArmyTraining[]>>;
    armyTraining: ArmyTraining[];
  };
  playerNation?: Nation | null;
};
export const DecisionContext = createContext<DecisionContextObject>({});

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
export type newBuilding = {
  hexId: number;
  buildingType: BUILDINGS_CATEGORY;
  levelsToUpgrade: number;
};
export type Contract = { startBuildingId: string; endBuildingId: string };
export type BuildModeType = "road" | "none" | BUILDINGS_CATEGORY;
export type ArmyTraining = { amount: number; progress: number; owner: string; barrackId: string };

export default function Home() {
  const [mapHexes, setMapHexes] = useState<Hex[] | null>(null);
  const [nations, setNations] = useState<Nation[] | null>(null);
  const [playerNation, setPlayerNation] = useState<Nation | null>(null);
  const [turn, setTurn] = useState<number>(0);
  const [roads, setRoads] = useState<Road[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedHex, setSelectedHex] = useState<Hex | null>(null);
  // player army intent
  const [armyMove, setArmyMove] = useState<armyIntent[]>([]);

  // build road array
  const [buildRoads, setBuildRoads] = useState<roadObject[]>([]); // UPDATE WITH SERVER DATA LATER
  const [buildMode, setBuildMode] = useState<BuildModeType>("none");
  // new buildings
  const [buildBuildings, setBuildBuildings] = useState<newBuilding[]>([]); // UPDATE WITH SERVER DATA LATER
  // contracts
  const [contracts, setContracts] = useState<Contract[]>([]); // UPDATE WITH SERVER DATA LATER
  const [isContractSelected, setIsContractSelected] = useState<boolean>(false);
  // troop training
  const [armyTraining, setArmyTraining] = useState<ArmyTraining[]>([]); // UPDATE WITH SERVER DATA LATER

  // MENUS
  const [buildMenuOpen, setBuildMenuOpen] = useState<boolean>(false);

  // DATA FETCH
  const mapData = trpc.generateHexMap.useMutation({
    onSuccess(data) {
      setMapHexes(data.mapHexes);
      setNations(data.nations);
      setTurn(data.turn);
      setRoads(data.roads);
      setBuildings(data.buildings);
      setSelectedHex(
        prevId !== null ? (data.mapHexes.find((hex) => hex.id === prevId) ?? null) : null
      );
      setPlayerNation(data.nations.find((nation) => nation.isPlayer) ?? null);

      // clear intent data
      setArmyMove([]);
      // clear temp queued roads
      setBuildRoads([]);
    },
  });
  const nextTurn = trpc.nextTurn.useMutation();

  // generate map
  useEffect(() => {
    mapData.mutate();
  }, []);

  useEffect(() => {
    console.log(selectedHex);
  }, [selectedHex]);

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
      buildRoads, // array of roads to BE built
      tempRoadRef.current, // temporary road drawn by player
      roads // real road
    );

    ctxs.forEach((c) => c.restore());
  }, [armyMove, buildRoads, roads]);

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
      let hexBuilding: Building | null = null;
      // get hex building
      if (hex.buildingId) {
        hexBuilding = getBuilding({ buildings, id: hex.buildingId }) ?? null;
      }

      // handle left mouse click
      if (event.button === 0) {
        if (mouseDownRef.current) return;
        // handle normal click
        if (buildMode === "none") {
          if (!isContractSelected) {
            console.log(hex.id);
            selectedHexIdRef.current = hex.id;
            setSelectedHex(hex);

            startAnimation();
            redraw();
          } else {
            const startId = selectedHex?.buildingId;
            const endId = hex.buildingId;

            const belongToPlayer =
              selectedHex?.owner === playerNation?.id && hex.owner === playerNation?.id;

            if (startId && endId && belongToPlayer) {
              setContracts((prev) => [...prev, { startBuildingId: startId, endBuildingId: endId }]);
            }
            setIsContractSelected(false);
          }
        } else {
          // handle road building
          if (buildMode === "road") {
            // check if clicked hex belongs to player
            if (hex.owner !== playerNation?.id) return;

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
              const roadToCommit = tempRoadRef.current;
              if (roadToCommit && roadStartRef.current !== hex) {
                setBuildRoads((prev) => [...prev, roadToCommit]);
              }

              // cleanup
              tempRoadRef.current = null;
              roadStartRef.current = null;
              randomIdRef.current = null;
              setBuildMode("none");
            }
          } else {
            // Add buildings to construction queue

            // This is current queued building object in that hex (if any)
            const queuedBuilding = buildBuildings.find((obj) => obj.hexId === hex.id);
            // if there is a building queued already and its type doesn't match - skip
            if (queuedBuilding && queuedBuilding.buildingType !== buildMode) return;

            // if there is a building built and its category doesn't match - skip
            if (hexBuilding && hexBuilding.category !== buildMode) return;

            // if already max possible level - return
            const currentLevel = hexBuilding?.level ? hexBuilding.level : 0;
            const queuedLevels = queuedBuilding?.levelsToUpgrade ?? 0;
            const maxLevel =
              topLevelsByCategory.find((obj) => obj.category === buildMode)?.level ?? 0;
            if (currentLevel + queuedLevels >= maxLevel) return;

            // update if exists, create if doesn't
            if (queuedBuilding) {
              setBuildBuildings((prev) =>
                prev.map((obj) =>
                  obj.hexId === queuedBuilding.hexId
                    ? { ...obj, levelsToUpgrade: obj.levelsToUpgrade + 1 }
                    : obj
                )
              );
            } else {
              setBuildBuildings((prev) => [
                ...prev,
                {
                  hexId: hex.id,
                  levelsToUpgrade: 1,
                  buildingType: buildMode,
                },
              ]);
            }
          }
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
    [
      redraw,
      startAnimation,
      selectedHex,
      buildMode,
      buildBuildings,
      playerNation,
      buildings,
      isContractSelected,
    ]
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
        const tempRoadArray = tempRoadRef.current;

        if (!hitCanvas || !map) return;
        if (!mapHexes) return;
        if (!randomIdRef.current) return;
        if (!tempRoadRef.current || !tempRoadArray) return;

        const rect = hitCanvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const camera = cameraRef.current;
        const worldX = (mouseX - hitCanvas.width / 2) / camera.zoom - camera.x;
        const worldY = (mouseY - hitCanvas.height / 2) / camera.zoom - camera.y;

        const { hex } = pixelToHex({ x: worldX, y: worldY, mapHexes: map });

        // --- CHECKS ---
        if (!hex) return;
        // return if player doesn't own this hex
        if (hex.owner !== playerNation?.id) return;

        // --- RESET BACK TO HEX IF IT ALREADY EXISTS ---
        const points = tempRoadArray.points;

        // найти индекс хекса в дороге
        const idx = points.findIndex((p) => p.q === hex.q && p.r === hex.r);

        // если этот хекс уже есть в дороге
        if (idx !== -1) {
          // если это последний — ничего не делаем
          if (idx === points.length - 1) {
            return;
          }

          // иначе откатываем дорогу до него
          points.splice(idx + 1);
          return;
        }

        // --- FILL GAPS BETWEEN HEXES ---
        const neighborIds = findNeighbors(hex, mapHexes).map((n) => n.id);

        // check if last added hex does not border with current hex
        const currPoint = { q: hex.q, r: hex.r };
        const lastPoint = tempRoadArray.points[tempRoadArray.points.length - 1];
        const lastHexOfRoad = getHexByAxial(lastPoint.q, lastPoint.r, mapHexes);
        if (!lastHexOfRoad) return;

        // prevent building road if any road already includes the combination of this and last added point (including temp roads)
        const roadsCopy = roads.map((r) => ({
          ...r,
          points: r.points.map((p) => ({ ...p })),
        }));
        buildRoads.forEach((obj) =>
          roadsCopy.push({
            id: obj.id,
            constructing: null,
            points: obj.points.map((p) => ({ ...p, isConstructing: true })),
          })
        ); // add queued roads too
        for (const road of roadsCopy) {
          // return if any road already has those two points in a row
          if (hasSegment(road, currPoint, lastPoint)) {
            return;
          }
        }

        if (!neighborIds.includes(lastHexOfRoad.id)) {
          // fill distance with hex path

          const path = findHexPathBetween(
            { q: lastHexOfRoad.q, r: lastHexOfRoad.r },
            { q: hex.q, r: hex.r }
          );

          // check if those hexes lay only on owned provinces
          for (const axialObj of path) {
            const missingHex = getHexByAxial(axialObj.q, axialObj.r, mapHexes);
            if (!missingHex) continue;
            if (missingHex.owner !== playerNation.id) return;
            const idx = path.findIndex((a) => a.q === axialObj.q && a.r === axialObj.r);

            const point = { q: axialObj.q, r: axialObj.r };
            const nextPoint = path[idx + 1];
            if (nextPoint) {
              for (const road of roadsCopy) {
                if (hasSegment(road, point, nextPoint)) return;
              }
            }
          }
          // remove first and last points (duplicates)
          path.slice(1, -1);

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

        tempRoadArray.points.push({
          q: hex.q,
          r: hex.r,
          d1: randomNumber(d.a, d.b),
          d2: randomNumber(d.a, d.b),
        });

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
    [redraw, buildMode, mapHexes, playerNation, roads, buildRoads]
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
      <DecisionContext.Provider
        value={{ army: { setArmyTraining, armyTraining }, playerNation: playerNation }}
      >
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
            <ProvinceInfoSidebar
              selectedHex={selectedHex}
              buildings={buildings}
              setIsContractSelected={setIsContractSelected}
              isContractSelected={isContractSelected}
              contracts={contracts}
            ></ProvinceInfoSidebar>
            <BuildMenu
              isOpen={buildMenuOpen}
              setIsOpen={setBuildMenuOpen}
              setBuildMode={setBuildMode}
              buildMode={buildMode}
            ></BuildMenu>

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
      </DecisionContext.Provider>
    </>
  );
}
