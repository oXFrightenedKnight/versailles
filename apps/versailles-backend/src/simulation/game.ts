import { categorizeActions, ActionBuckets } from "@repo/shared/actions";
import { TRPCError } from "@trpc/server";
import { runAIPipeline } from "./ai/main";
import { giveProgressBuilding } from "./buildings/construction";
import { runBuildingsSystem } from "./buildings/production";
import { calcWars } from "./combat/calculateHexWar";
import { recalculateContractsAmounts } from "./contracts/calculation";
import { peaceCountdown } from "./diplomacy/peace";
import { runNationDiplomacy, runAIDiplomacy } from "./intents/diplomacyIntents";
import { runIntentForEachNation } from "./intents/executeIntents";
import { mailsExpire } from "./mails/lifecycle";
import { addBaseNationGold } from "./nations/economy";
import { getPlayerNation, updatePlayerUI } from "./player";
import { nationsUpdateManpower } from "./resources/manpower";
import { progressRoadConstruction } from "./roads/construction";
import { revalidateTraining } from "./training/validation";
import { generateHexMap } from "./world/generation/generateMap";
import { generateNations } from "./world/generation/generateNations";
import { GameCtx, NextTurnType } from "#trpc";

export function runGameSimulation(gameCtx: GameCtx, input: NextTurnType) {
  const playerNation = getPlayerNation(gameCtx);
  if (!playerNation) throw new TRPCError({ code: "NOT_FOUND" });

  const playerActions = categorizeActions(input.actions);

  // step 1: execute player diplomacy first
  runNationDiplomacy(gameCtx, playerNation, playerActions);

  // step 2: calculate ai decisions (build, attack, move)
  // merge ai intents in here later
  const actions: { actions: ActionBuckets; nationId: string }[] = [
    { actions: playerActions, nationId: playerNation.id },
  ];

  for (const nation of gameCtx.nations) {
    if (nation.isPlayer) continue;

    try {
      const aiActions = runAIPipeline(gameCtx, nation);
      actions.push({
        actions: {
          ...aiActions,
        },
        nationId: nation.id,
      });
    } catch (err) {
      console.log("AI Pipeline failed for", nation.id, err);
    }
  }

  // step 3: run ai diplomacy
  runAIDiplomacy(gameCtx, actions);

  // step 4: apply intents
  runIntentForEachNation(gameCtx, actions);

  // step 5: calculate battle outcomes
  calcWars(gameCtx);

  // step 6: recalculate contracts amounts
  recalculateContractsAmounts(gameCtx);

  // step 7: revalidate training
  revalidateTraining(gameCtx);

  // step 8: give progress to constructing buildings and roads
  giveProgressBuilding(gameCtx);
  progressRoadConstruction(gameCtx);

  // step 9: calculate base gold income
  addBaseNationGold(gameCtx);

  // step 10: calculate building systems
  runBuildingsSystem(gameCtx);

  // step 11: recalculate manpower
  nationsUpdateManpower(gameCtx);

  // step 12: update peace countdown
  peaceCountdown(gameCtx);

  // step 13: expire mails
  mailsExpire(gameCtx);

  // step 14: update player UI states
  updatePlayerUI(gameCtx, playerActions, playerNation);

  // step 15: increase turn
  gameCtx.turn++;
}

export function populateWorld(ctx: GameCtx) {
  generateHexMap(ctx);
  generateNations(ctx);
}
