export declare const NATION_NAMES: {
    Dornguard: string;
    Aldmark: string;
    Westholm: string;
    Crownwald: string;
    Vichold: string;
    Brandor: string;
};
export type Nation = {
    id: string;
    tiles: number[];
    capitalTileIdx: number;
    color: string;
    aggression: number;
    expansionBias: number;
    isPlayer: boolean;
    atWar: string[];
};
