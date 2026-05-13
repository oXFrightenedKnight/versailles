import { Mail, PeaceOfferMail, PeaceSignedMail, WarEventMail } from "@repo/shared/data/mail.js";
import { GameCtx } from "../trpc/index.js";

export function addMail(ctx: GameCtx, mail: Mail) {
  // add any additional mailbox logic here to check before adding mail
  ctx.mails.push(mail);
}

export function createWarMail(ctx: GameCtx, attacker: string, defender: string) {
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
  } as WarEventMail;
}

export function createPeaceOfferMail(ctx: GameCtx, fromNation: string, toNation: string) {
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
  } as PeaceOfferMail;
}

export function createPeaceSignedMail(ctx: GameCtx, fromNation: string, toNation: string) {
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
  } as PeaceSignedMail;
}

export function filterNationMails(mails: Mail[], nationId: string) {
  return mails.filter((m) => m.visibleTo.includes(nationId) || m.visibleTo === "ALL");
}
