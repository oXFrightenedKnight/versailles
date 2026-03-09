export type Biome = "desert" | "plains" | "forest" | "mountains";
export type CreatedHexes = {
    desert: number;
    mountains: number;
    plains: number;
    forest: number;
};
export type Hex = {
    id: number;
    biome: Biome | null;
    q: number;
    r: number;
    population: number | null;
    building: {
        type: BuildingType;
    } | null;
    owner: string | null;
    build_queue: {
        building: BuildingType;
        progress: number;
        owner: string;
    } | null;
    army: {
        amount: number;
        nationId: string;
    }[];
    wood: number;
};
export declare const BUILD_TIME: {
    nomadic_camp: number;
    village: number;
    settlement: number;
    city: number;
    imperial_city: number;
    lumberjack_settlement: number;
    farm: number;
    barrack: number;
    watch_tower: number;
};
export declare const BIOMES: Biome[];
export declare const POPULATION_CAPS: {
    nomadic_camp: number;
    village: number;
    settlement: number;
    city: number;
    imperial_city: number;
    lumberjack_settlement: number;
    farm: number;
    barrack: number;
    watch_tower: number;
};
export declare const WOOD_MOD: {
    desert: number;
    mountains: number;
    plains: number;
    forest: number;
};
export type BUILDINGS_CATEGORY = "CIVILIAN" | "BARRACK" | "FARM" | "WATCHTOWER" | "LUMBERJACK_SETTLEMENT";
export declare const BUILDINGS: {
    readonly nomadic_camp: {
        readonly category: "CIVILIAN";
        readonly level: 1;
    };
    readonly village: {
        readonly category: "CIVILIAN";
        readonly level: 2;
    };
    readonly settlement: {
        readonly category: "CIVILIAN";
        readonly level: 3;
    };
    readonly city: {
        readonly category: "CIVILIAN";
        readonly level: 4;
    };
    readonly imperial_city: {
        readonly category: "CIVILIAN";
        readonly level: 5;
    };
    readonly barrack: {
        readonly category: "BARRACK";
        readonly level: 1;
    };
    readonly farm: {
        readonly category: "FARM";
        readonly level: 1;
    };
    readonly watch_tower: {
        readonly category: "WATCHTOWER";
        readonly level: 1;
    };
    readonly lumberjack_settlement: {
        readonly category: "LUMBERJACK";
        readonly level: 1;
    };
};
export type BuildingType = keyof typeof BUILDINGS;
export declare const BIOME_GROWTH: {
    desert: number;
    mountains: number;
    forest: number;
    plains: number;
};
export declare const BIOME_MOD: {
    desert: number;
    mountains: number;
    forest: number;
    plains: number;
};
export declare const HEX_DIRECTIONS: {
    dq: number;
    dr: number;
}[];
export declare const MAP_RADIUS = 9;
export declare const AVAILABLE_TILES: number[];
