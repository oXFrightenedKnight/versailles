import { Hex } from "../lib/map_data.js";
export declare function moveArmy({ hexId, amount, nationId, direction, mapHexes, }: {
    hexId: number;
    amount: number;
    nationId: string;
    direction: {
        dq: number;
        dr: number;
    };
    mapHexes: Hex[];
}): void;
export declare function calculateWar(hexId: number): void;
