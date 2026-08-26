import { BASE_RESOURCE } from "@repo/shared/resources";

export type NewContract = {
  startBuildingId: string;
  endBuildingId: string;
  amount: number;
  resource: BASE_RESOURCE;
  autoAdjust: boolean;
};
