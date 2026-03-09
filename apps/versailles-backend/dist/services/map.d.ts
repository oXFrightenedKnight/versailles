import { Hex } from "../lib/map_data.js";
export declare function generateHexMap(radius: number): Hex[];
export declare function randomNationColor(): string;
export declare function getHexById(id: number): Hex | null;
export declare function calculatePopulationChange(hexes: Hex[]): Hex[];
