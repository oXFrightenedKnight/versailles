import { signPeace } from "#simulation/diplomacy/peace";
import { updateMailCreationIdx } from "#simulation/mails/lifecycle";
import { GameCtx } from "#trpc";
import { Nation } from "@repo/shared";
import { ActionOfType } from "@repo/shared/actions";
import { Mail, MailDraft } from "@repo/shared/mails";

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

export function addMail(ctx: GameCtx, mailDraft: MailDraft) {
  // add any additional mailbox logic here to check before adding mail
  const nextIndex = ctx.counters.nextMailCreationIndex;

  const mail = { ...mailDraft, creationIndex: nextIndex } as Mail;
  if (!canInsertMail(ctx, { ...mail, creationIndex: nextIndex })) return;

  ctx.mails.push(mail);
  updateMailCreationIdx(ctx);
}

export function deleteMail(ctx: GameCtx, mailId: string) {
  ctx.mails = ctx.mails.filter((m) => m.id !== mailId);
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
