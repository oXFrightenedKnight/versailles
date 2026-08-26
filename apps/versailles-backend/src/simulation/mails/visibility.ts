import { Mail } from "@repo/shared/mails";

export function filterNationMails(mails: Mail[], nationId: string) {
  return mails.filter((m) => m.visibleTo.includes(nationId) || m.visibleTo === "ALL");
}
