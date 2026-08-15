import { StoreType } from "@/lib/stores/intentStore";
import { Popup, SetStateAction } from "@/lib/stores/uiStore";
import { PendingAction } from "@/lib/types/actions";
import { BuildModeType, RoadDraft } from "@/lib/types/game";
import { ContractProjection } from "@/lib/UI/mergeData/contracts/types";
import { RenderRoad } from "@/lib/UI/mergeData/roads(belongs render)/types";
import { Building, Hex, Nation, NationResourceTable } from "@repo/shared";
import { Dispatch, RefObject } from "react";

export type GameCanvasProps = {
  buildMode: BuildModeType;
  setBuildMode: React.Dispatch<React.SetStateAction<BuildModeType>>;

  isContractSelected: boolean;
  setIsContractSelected: Dispatch<React.SetStateAction<boolean>>;

  selectedHexId: number | null;
  selectHex: (hex: Hex | null) => void;

  barValue: number;
  setBarValue: Dispatch<React.SetStateAction<number>>;

  barDragging: boolean;
  setBarDragging: Dispatch<React.SetStateAction<boolean>>;

  barRef: RefObject<HTMLDivElement | null>;
};

export type CanvasSnapshot = {
  mapHexes: Hex[];
  nations: Nation[];
  playerNation: Nation | null;

  roads: RenderRoad[];
  buildings: Building[];
  contracts: ContractProjection[];
  gameActions: PendingAction[];

  buildMode: BuildModeType;
  isContractSelected: boolean;
  selectedHexId: number | null;

  effectiveResources: NationResourceTable;

  barValue: number;
  barDragging: boolean;
};

export type CanvasRuntime = {
  canvas: {
    main: HTMLCanvasElement;
    hit: HTMLCanvasElement;

    mainContext: CanvasRenderingContext2D;
    hitContext: CanvasRenderingContext2D;
  };

  camera: {
    x: number;
    y: number;
    zoom: number;
  };

  pointer: {
    isDown: boolean;
    isDragging: boolean;
    button: 0 | 2 | null;

    startX: number;
    startY: number;

    lastX: number;
    lastY: number;
  };

  road: {
    startHexId: number | null;
    draft: RoadDraft | null;
  };

  animation: {
    frameId: number | null;
    lastTime: number;
    blinkTime: number;
  };

  destroyed: boolean;
};

export type CanvasCommands = {
  selectHex: (hex: Hex | null) => void;

  setBuildMode: (mode: BuildModeType) => void;

  setContractSelected: (selected: boolean) => void;

  setBarValue: (value: number) => void;

  setBarDragging: (dragging: boolean) => void;

  createGameAction: StoreType["createGameAction"];

  deleteGameAction: StoreType["deleteGameAction"];

  updateGameAction: StoreType["updateGameAction"];

  setPopup: SetStateAction<Popup | null>;
};

export type CanvasEngine = {
  start: () => Promise<void>;
  destroy: () => void;
  draw: () => void;
};

export type CreateCanvasEngineOptions = {
  mainCanvas: HTMLCanvasElement;
  hitCanvas: HTMLCanvasElement;

  getSnapshot: () => CanvasSnapshot;
  commands: CanvasCommands;

  barRef: RefObject<HTMLDivElement | null>;
};
