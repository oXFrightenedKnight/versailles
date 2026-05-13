export type MODIFIER_CATEGORIES = "manpower";
export type MOD_TYPE = "percent" | "flat";
export type MODIFIER = {
  category: MODIFIER_CATEGORIES;
  type: MOD_TYPE;
  value: number;
  owner: string;
};
