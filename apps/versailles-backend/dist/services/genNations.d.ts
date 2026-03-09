import { BuildingType, Hex } from "../lib/map_data.js";
import { Nation } from "../lib/nations.js";
export type newBuildings = {
    hexId: number;
    building: BuildingType;
}[];
export declare function generateNations(): Nation[];
export declare function buildNationBuildings({ nation, mapHexes, newBuildings, }: {
    nation: Nation;
    mapHexes: Hex[];
    newBuildings: newBuildings;
}): Hex[];
export declare function getNationById(nationId: string): Nation | null;
