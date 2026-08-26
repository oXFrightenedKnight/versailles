import { PendingAction } from "@/lib/types/actions";
import { MailProjection } from "./types";
import { StoreType } from "@/lib/stores/intentStore";
import { Mail } from "@repo/shared/mails";

export function selectMails(mails: Mail[], pendingActions: PendingAction[]) {
  const byMailId = new Map<string, MailProjection>();

  const answeredMailsIds = new Set(
    pendingActions.flatMap(({ action }) => (action.type === "mails.answer" ? [action.mailId] : []))
  );
  const readMailsIds = new Set(
    pendingActions.flatMap(({ action }) => (action.type === "mails.read" ? [action.mailId] : []))
  );

  for (const mail of mails) {
    if (answeredMailsIds.has(mail.id)) continue;

    const read = mail.read || readMailsIds.has(mail.id);

    byMailId.set(mail.id, {
      mail: mail,

      read,
    });
  }

  return [...byMailId.values()];
}

export function setMailRead(mailId: string, createGameAction: StoreType["createGameAction"]) {
  createGameAction({
    action: { type: "mails.read", id: crypto.randomUUID(), mailId: mailId },
    resourceDelta: {},
  });
}

export function setMailAnswer(
  mailId: string,
  answer: boolean,
  pendingActions: PendingAction[],
  createGameAction: StoreType["createGameAction"],
  updateGameAction: StoreType["updateGameAction"]
) {
  const existingAnswer = pendingActions.find(
    (a) => a.action.type === "mails.answer" && a.action.mailId === mailId
  );
  if (existingAnswer) {
    updateGameAction(existingAnswer.action.id, "mails.answer", { answer });
  } else {
    createGameAction({
      action: { type: "mails.answer", id: crypto.randomUUID(), mailId, answer },
      resourceDelta: {},
    });
  }
}
