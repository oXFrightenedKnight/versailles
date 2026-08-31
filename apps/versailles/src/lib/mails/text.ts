import { getNationName } from "@/lib/helpers/nations";
import { WarEventMail, PeaceOfferMail, PeaceSignedMail, Mail } from "@repo/shared/mails";

export type MailText = {
  header: string;
  body: string;
};

export const MailTexts = {
  WAR: (mail: WarEventMail, playerId: string) => {
    const attacker = nationText(mail.metadata.attackerNation, playerId);
    const defender = nationText(mail.metadata.defenderNation, playerId);
    return {
      header: "War declaration!",
      body: `${attacker.subject} declared war on ${defender.subject}!`,
    };
  },
  PEACE_OFFER: (mail: PeaceOfferMail, playerId: string) => {
    const from = nationText(mail.metadata.fromNation, playerId);
    const to = nationText(mail.metadata.toNation, playerId);
    return {
      header: "Peace Offer",
      body: `${from.subject} wants to sign peace treaty with ${to.subject}.`,
    };
  },
  PEACE_SIGNED: (mail: PeaceSignedMail, playerId: string) => {
    const from = nationText(mail.metadata.fromNation, playerId);
    const to = nationText(mail.metadata.toNation, playerId);
    return {
      header: "Peace Signed",
      body: `${from.subject} accepted ${to.possesive} peace treaty.`,
    };
  },
};

export function nationText(nationId: string, playerNationId: string) {
  const isPlayer = nationId === playerNationId;

  return {
    subject: isPlayer ? "you" : getNationName({ id: nationId }),
    possesive: isPlayer ? "your" : `${getNationName({ id: nationId })}'s`,
  };
}

export function getMailText(mail: Mail, playerId: string) {
  const fn = MailTexts[mail.type] as (mail: Mail, playerId: string) => MailText;
  return fn(mail, playerId);
}
