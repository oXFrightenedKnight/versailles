import { CanvasCommands, CanvasEngine, CanvasSnapshot, GameCanvasProps } from "@/canvas/types";
import { useGameStore } from "@/lib/stores/gameStore";
import { useIntentStore } from "@/lib/stores/intentStore";
import { useUIStore } from "@/lib/stores/uiStore";
import { selectBuildings } from "@/lib/UI/mergeData/buildings/selectors";
import { selectRenderRoads } from "@/lib/UI/mergeData/roads(belongs render)/selectors";
import { useEffect, useRef } from "react";
import { createCanvasEngine } from "@/canvas/createCanvasEngine";
import { selectHexes } from "@/lib/UI/mergeData/hexes/selectors";
import { selectContracts } from "@/lib/UI/mergeData/contracts/selectors";
import { useOptimisticResources } from "./useOptimisticResources";
import { selectContractPredictions } from "@/lib/UI/predictions/contracts/selectors";

export function useGameCanvas(props: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const hitCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const engineRef = useRef<CanvasEngine | null>(null);

  const propsRef = useRef(props);

  const serverHexes = useGameStore((state) => state.mapHexes);
  const nations = useGameStore((state) => state.nations);
  const playerNation = useGameStore((state) => state.playerNation);
  const serverRoads = useGameStore((state) => state.roads);
  const serverBuildings = useGameStore((state) => state.buildings);
  const serverContracts = useGameStore((state) => state.contracts);

  const gameActions = useIntentStore((state) => state.gameActions);

  const roads = selectRenderRoads(serverRoads, gameActions);
  const buildings = selectBuildings(serverBuildings, gameActions);
  const mapHexes = selectHexes(serverHexes, gameActions);
  const contracts = selectContractPredictions(serverContracts, buildings, gameActions);

  const effectiveResources = useOptimisticResources();

  const snapshot: CanvasSnapshot = {
    mapHexes,
    nations,
    playerNation,
    roads,
    buildings,
    contracts,
    gameActions,

    buildMode: props.buildMode,
    isContractSelected: props.isContractSelected,
    selectedHexId: props.selectedHexId,

    effectiveResources,

    barValue: props.barValue,
    barDragging: props.barDragging,
  };

  const snapshotRef = useRef(snapshot);

  const commandsRef = useRef<CanvasCommands | null>(null);

  useEffect(() => {
    if (!commandsRef.current) {
      commandsRef.current = {
        selectHex(hex) {
          propsRef.current.selectHex(hex);
        },

        setBuildMode(mode) {
          propsRef.current.setBuildMode(mode);
        },

        setContractSelected(selected) {
          propsRef.current.setIsContractSelected(selected);
        },

        setBarValue(value) {
          propsRef.current.setBarValue(value);
        },

        setBarDragging(dragging) {
          propsRef.current.setBarDragging(dragging);
        },

        createGameAction(action) {
          useIntentStore.getState().createGameAction(action);
        },

        deleteGameAction(actionId) {
          useIntentStore.getState().deleteGameAction(actionId);
        },

        updateGameAction(actionId, type, fields) {
          useIntentStore.getState().updateGameAction(actionId, type, fields);
        },

        setPopup(value) {
          useUIStore.getState().setPopup(value);
        },
      };
    }
  }, []);

  useEffect(() => {
    const mainCanvas = canvasRef.current;
    const hitCanvas = hitCanvasRef.current;
    const commands = commandsRef.current;

    if (!mainCanvas || !hitCanvas || !commands) {
      return;
    }

    const engine = createCanvasEngine({
      mainCanvas,
      hitCanvas,

      getSnapshot: () => snapshotRef.current,

      commands,
      barRef: propsRef.current.barRef,
    });

    engineRef.current = engine;
    engine.start();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    propsRef.current = props;
  }, [props]);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  return {
    canvasRef,
    hitCanvasRef,
  };
}
