export type ArmyMoveProjection = {
  key: string;

  hexId: number;
  nationId: string;

  amount: number;
  direction: { dq: number; dr: number };

  actionId: string;
};
