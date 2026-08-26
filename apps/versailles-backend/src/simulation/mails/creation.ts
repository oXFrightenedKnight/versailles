import { GameCtx } from "#trpc";
import { MailDraft, WarEventMail, PeaceOfferMail, PeaceSignedMail } from "@repo/shared/mails";

export function createWarMail(
  ctx: GameCtx,
  attacker: string,
  defender: string
): MailDraft<WarEventMail> {
  return {
    id: crypto.randomUUID(),
    visibleTo: "ALL",
    createdAt: ctx.turn,
    read: false,
    type: "WAR",
    metadata: {
      attackerNation: attacker,
      defenderNation: defender,
    },
  };
}

export function createPeaceOfferMail(
  ctx: GameCtx,
  fromNation: string,
  toNation: string
): MailDraft<PeaceOfferMail> {
  return {
    id: crypto.randomUUID(),
    visibleTo: [toNation],
    createdAt: ctx.turn,
    read: false,
    type: "PEACE_OFFER",
    requireAnswer: true,
    expire: 3,
    metadata: {
      fromNation,
      toNation,
    },
  };
}

export function createPeaceSignedMail(
  ctx: GameCtx,
  fromNation: string,
  toNation: string
): MailDraft<PeaceSignedMail> {
  return {
    id: crypto.randomUUID(),
    visibleTo: "ALL",
    createdAt: ctx.turn,
    read: false,
    type: "PEACE_SIGNED",
    metadata: {
      fromNation,
      toNation,
    },
  };
}
