import { Mail } from "@repo/shared/mails";

export function hasExistingPeaceRequest(mails: Mail[], fromNation: string, toNation: string) {
  return (
    mails.find(
      (m) =>
        m.type === "PEACE_OFFER" &&
        m.metadata.fromNation === fromNation &&
        m.metadata.toNation === toNation &&
        m.expire &&
        m.expire > 0
    ) !== undefined
  );
}

export function getLastCreationIndex(mails: Mail[]) {
  return mails.reduce((acc, m) => (acc >= m.creationIndex ? acc : m.creationIndex), 0);
}
