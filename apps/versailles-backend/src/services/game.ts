import { GameCtx, IntentInput, NextTurnType, emptyIntentCtx } from "#trpc/index.js";
import { TRPCError } from "@trpc/server";
import { runAIPipeline } from "./ai/main";
import { calcWars, peaceCountdown } from "./army/war";
import { giveProgressBuilding } from "./buildings/construction";
import { buildingOutput } from "./buildings/production";
import { executeContracts, recalculateContractsAmounts } from "./contracts";
import { runAIDiplomacy, runNationDiplomacy } from "./intents/diplomacyIntents";
import { runIntentForEachNation } from "./intents/executeIntents";
import { mailsExpire } from "./mails";
import { getPlayerNation, updatePlayerUI } from "./player";
import { nationsUpdateManpower } from "./resources/manpower";
import { addBaseNationGold } from "./genNations";

export function runGameSimulation(gameCtx: GameCtx, input: NextTurnType) {
  const playerNation = getPlayerNation(gameCtx);
  if (!playerNation) throw new TRPCError({ code: "NOT_FOUND" });

  const playerIntentCtx: IntentInput = {
    ...input.playerIntents,
  };

  // step 1: execute player diplomacy first
  runNationDiplomacy(gameCtx, playerNation, playerIntentCtx);

  // step 2: calculate ai decisions (build, attack, move)
  // merge ai intents in here later
  const intents: { input: IntentInput; nationId: string }[] = [
    { input: playerIntentCtx, nationId: playerNation.id },
  ];

  for (const nation of gameCtx.nations) {
    if (nation.isPlayer) continue;

    try {
      const aiIntents = runAIPipeline(gameCtx, nation);
      intents.push({
        input: {
          ...emptyIntentCtx,
          ...aiIntents,
        },
        nationId: nation.id,
      });
    } catch (err) {
      console.log("AI Pipeline failed for", nation.id, err);
    }
  }

  // step 3: run ai diplomacy
  runAIDiplomacy(gameCtx, intents);

  // step 4: apply intents
  runIntentForEachNation(gameCtx, intents);

  // step 5: calculate battle outcomes
  calcWars(gameCtx);

  // step 6: give progress to buildings in queue
  giveProgressBuilding(gameCtx);

  // step 7: calculate base gold income
  addBaseNationGold(gameCtx);

  // step 8: calculate contracts
  executeContracts(gameCtx);

  // step 9: calculate gold & building output
  buildingOutput(gameCtx);

  // step 10: recalculate all auto-adjust contracts to match new state
  recalculateContractsAmounts(gameCtx);

  // step 11: recalculate manpower
  nationsUpdateManpower(gameCtx);

  // step 12: update peace countdown
  peaceCountdown(gameCtx);

  // step 13: expire mails
  mailsExpire(gameCtx);

  // step 14: update player UI states
  updatePlayerUI(gameCtx, playerIntentCtx, playerNation);

  // step 14: increase turn
  gameCtx.turn++;
}
