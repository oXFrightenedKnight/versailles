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
  if (!canInsertMail(ctx, mail)) return;
  ctx.mails.push(mail);
}

function canInsertMail(ctx: GameCtx, mail: Mail): boolean {
  switch (mail.type) {
    case "PEACE_OFFER": {
      // only one pending offer from A -> B at a time
      return !ctx.mails.some(
        (m) =>
          m.type === "PEACE_OFFER" &&
          m.metadata.fromNation === mail.metadata.fromNation &&
          m.metadata.toNation === mail.metadata.toNation &&
          (m.expire === undefined || m.expire > 0)
      );
    }
    default:
      return true;
  }
}

export function deleteMail(ctx: GameCtx, mailId: string) {
  ctx.mails = ctx.mails.filter((m) => m.id !== mailId);
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
    if (!mail.visibleTo.includes(nation.id) && mail.visibleTo !== "ALL") continue;

    mail.read = true;
  }
}

// Remember that for now this only supports one nation to answer one mail
export function executeMailsAnswers(ctx: GameCtx, answeredMails: MailAnswer[], nation: Nation) {
  const answerMails = ctx.mails.filter((m) => m.requireAnswer);
  const answeredMap = new Map(answeredMails.map((obj) => [obj.id, obj.answer]));

  for (const mail of answerMails) {
    if (mail.expire !== undefined && mail.expire <= 0) continue;
    if (!mail.visibleTo.includes(nation.id) && mail.visibleTo !== "ALL") continue;
    if (!answeredMap.has(mail.id)) continue;

    const answerYes = answeredMap.get(mail.id)!;
    switch (mail.type) {
      case "PEACE_OFFER":
        if (answerYes) {
          signPeace(ctx, mail.metadata.fromNation, mail.metadata.toNation);
        }
        break;
    }

    deleteMail(ctx, mail.id);
  }
}

// calculate mail expiration and remove expired
export function mailsExpire(ctx: GameCtx) {
  const expiringMails = ctx.mails.filter((m) => m.expire);

  for (const mail of expiringMails) {
    mail.expire! -= 1;

    if (mail.expire === 0) {
      deleteMail(ctx, mail.id);
    }
  }
}
