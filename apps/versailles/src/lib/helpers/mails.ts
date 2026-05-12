import { Mail, MailTypes } from "@repo/shared";
import { getNationName } from "./nations";
import { MailText, MailTexts } from "../data";

export type NationTextObject = {
  subject: string;
  possesive: string;
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
