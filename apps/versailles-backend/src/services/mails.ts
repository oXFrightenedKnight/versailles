import {
  Mail,
  MailAnswer,
  Nation,
  PeaceOfferMail,
  PeaceSignedMail,
  WarEventMail,
} from "@repo/shared";
import { GameCtx } from "../trpc/index.js";
import { signPeace } from "./army.js";

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

export function markReadMails(ctx: GameCtx, readMails: string[], nation: Nation) {
  const mailIdMap = new Map(ctx.mails.map((m) => [m.id, m]));
  for (const mailId of readMails) {
    if (!mailIdMap.has(mailId)) continue;

    const mail = mailIdMap.get(mailId);
    if (!mail) continue;
    if (!mail.visibleTo.includes(nation.id)) continue;

    mail.read = true;
  }
}

export function executeMailsAnswers(ctx: GameCtx, answeredMails: MailAnswer[], nation: Nation) {
  const answerMails = ctx.mails.filter((m) => m.requireAnswer);
  const answeredMap = new Map(answeredMails.map((obj) => [obj.id, obj.answer]));

  for (const mail of answerMails) {
    if (!mail.visibleTo.includes(nation.id)) continue;
    if (!answeredMap.has(mail.id)) continue;

    const answerYes = answeredMap.get(mail.id)!;
    switch (mail.type) {
      case "PEACE_OFFER":
        if (answerYes) {
          signPeace(ctx, mail.metadata.fromNation, mail.metadata.toNation);
        }
        break;
    }
  }
}
