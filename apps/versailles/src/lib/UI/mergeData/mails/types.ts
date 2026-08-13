import { Mail } from "@repo/shared";

export type MailProjection = {
  mail: Mail;

  read: boolean;
};
