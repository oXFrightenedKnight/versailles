import { Mail, MailAnswer } from "@repo/shared";

export function getUIMails(mails: Mail[], readMails: string[], answeredMails: MailAnswer[]) {
  const filtered = filterAnsweredMails(mails, answeredMails);
  const read = markReadMails(filtered, readMails);
  return [...read].reverse(); // send reversed
}

function markReadMails(mails: Mail[], readMails: string[]) {
  return mails.map((m) => {
    const isRead = readMails.includes(m.id);
    return {
      ...m,
      read: isRead ? true : false,
    };
  });
}

function filterAnsweredMails(mails: Mail[], answerMails: MailAnswer[]) {
  const answeredIds = answerMails.map((obj) => obj.id);
  return mails.filter((m) => (m.requireAnswer && !answeredIds.includes(m.id)) || !m.requireAnswer);
}
