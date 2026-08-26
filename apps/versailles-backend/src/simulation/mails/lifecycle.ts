import { deleteMail } from "#simulation/mails/commands";
import { GameCtx } from "#trpc";

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

export function updateMailCreationIdx(ctx: GameCtx) {
  ctx.counters.nextMailCreationIndex++;
}
