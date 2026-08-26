import { Mail, PeaceOfferMail } from "@repo/shared/mails";

// returns all peace request mails sent to this nation
export function getNationPeaceReqMails(mails: Mail[], nationId: string) {
  return mails.filter(
    (m): m is PeaceOfferMail =>
      isPeaceOfferMail(m) &&
      canReadMail(m, nationId) &&
      m.metadata.toNation === nationId &&
      m.expire !== undefined &&
      m.expire > 0
  );
}

function canReadMail(mail: Mail, nationId: string) {
  return mail.visibleTo === "ALL" ? true : mail.visibleTo.includes(nationId);
}

function isPeaceOfferMail(mail: Mail): mail is PeaceOfferMail {
  return mail.type === "PEACE_OFFER";
}
