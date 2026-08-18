import { ContractProjection } from "../../mergeData/contracts/types";

export type ContractPrediction = ContractProjection & { blocked: boolean };
