export type BaseRenderRoad = {
  key: string;

  points: {
    q: number;
    r: number;
    d1: number;
    d2: number;
    isConstructing: boolean;
  }[];
};

export type RenderRoad =
  | (BaseRenderRoad & {
      source: "server";
      roadId: string;
    })
  | (BaseRenderRoad & {
      source: "pending";
      actionId: string;
    });
