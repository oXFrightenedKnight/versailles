import { Mail } from "@repo/shared/mails";

export type MailProjection = {
  mail: Mail;

  read: boolean;
};
