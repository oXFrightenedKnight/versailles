import {
  ActionOfType,
  Mail,
  MailDraft,
  Nation,
  PeaceOfferMail,
  PeaceSignedMail,
  WarEventMail,
} from "@repo/shared";
import { GameCtx } from "../trpc/index.js";
import { signPeace } from "./army/war.js";

export function addMail(ctx: GameCtx, mailDraft: MailDraft) {
  // add any additional mailbox logic here to check before adding mail
  const nextIndex = ctx.counters.nextMailCreationIndex;

  const mail = { ...mailDraft, creationIndex: nextIndex } as Mail;
  if (!canInsertMail(ctx, { ...mail, creationIndex: nextIndex })) return;

  ctx.mails.push(mail);
  updateMailCreationIdx(ctx);
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

export function filterNationMails(mails: Mail[], nationId: string) {
  return mails.filter((m) => m.visibleTo.includes(nationId) || m.visibleTo === "ALL");
}

export function markReadMails(
  ctx: GameCtx,
  readMails: ActionOfType<"mails.read">[],
  nation: Nation
) {
  const mailIdMap = new Map(ctx.mails.map((m) => [m.id, m]));
  for (const { mailId } of readMails) {
    if (!mailIdMap.has(mailId)) continue;

    const mail = mailIdMap.get(mailId);
    if (!mail) continue;
    if (!mail.visibleTo.includes(nation.id) && mail.visibleTo !== "ALL") continue;

    mail.read = true;
  }
}

// Remember that for now this only supports one nation to answer one mail
export function executeMailsAnswers(
  ctx: GameCtx,
  answeredMails: ActionOfType<"mails.answer">[],
  nation: Nation
) {
  const answerMails = ctx.mails.filter((m) => m.requireAnswer);
  const answeredMap = new Map(answeredMails.map((obj) => [obj.mailId, obj.answer]));

  for (const mail of answerMails) {
    if (mail.expire !== undefined && mail.expire <= 0) continue;
    if (!answeredMap.has(mail.id)) continue;
    if (!mail.visibleTo.includes(nation.id) && mail.visibleTo !== "ALL") continue;

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

export function hasExistingPeaceRequest(mails: Mail[], fromNation: string, toNation: string) {
  return (
    mails.find(
      (m) =>
        m.type === "PEACE_OFFER" &&
        m.metadata.fromNation === fromNation &&
        m.metadata.toNation === toNation &&
        m.expire &&
        m.expire > 0
    ) !== undefined
  );
}

export function getLastCreationIndex(mails: Mail[]) {
  return mails.reduce((acc, m) => (acc >= m.creationIndex ? acc : m.creationIndex), 0);
}

export function updateMailCreationIdx(ctx: GameCtx) {
  ctx.counters.nextMailCreationIndex++;
}
