// mail types describe action that this mail is delivering
// war - mail describing war between you and other nation
// peace_offer - mail coming from another nation requesting peace
// peace_signed - mail to inform peace offer was signed.
export type MailTypes = "WAR" | "PEACE_OFFER" | "PEACE_SIGNED";

export type BaseMail = {
  id: string;
  visibleTo: string[] | "ALL";
  createdAt: number; // turn
  read: boolean;
  requireAnswer?: boolean;
  expire?: number; // number if turns before expiry
};
export type WarEventMail = BaseMail & {
  type: "WAR";

  metadata: {
    attackerNation: string;
    defenderNation: string;
  };
};
export type PeaceOfferMail = BaseMail & {
  type: "PEACE_OFFER";

  requireAnswer: true;

  metadata: {
    fromNation: string;
    toNation: string;
  };
};
export type PeaceSignedMail = BaseMail & {
  type: "PEACE_SIGNED";

  metadata: {
    fromNation: string;
    toNation: string;
  };
};
export type Mail = WarEventMail | PeaceOfferMail | PeaceSignedMail;

export type MailAnswer = {
  id: string;
  answer: boolean;
};
