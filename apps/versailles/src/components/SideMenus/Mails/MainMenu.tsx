"use client";

import { getUIMails } from "@/lib/UI/mergeData/uiMails";
import { useGameStore } from "@/lib/stores/gameStore";
import { useIntentStore } from "@/lib/stores/intentStore";
import { ChevronDown, Mail as MailIcon, MailOpen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import MailBlock from "./MailBlock";

export default function MailMenu() {
  const [mailOpen, setMailOpen] = useState<boolean>(false);
  const mails = useGameStore((s) => s.mails);
  const readMails = useIntentStore((s) => s.readMails);
  const setReadMails = useIntentStore((s) => s.setReadMails);
  const answeredMails = useIntentStore((s) => s.answeredMails);

  const mailsUI = getUIMails(mails, readMails, answeredMails);
  const unreadMails = mailsUI.filter((m) => !m.read);

  // MAIL OBSERVER
  const pendingReadMails = useRef<Set<string>>(new Set());

  const rootDiv = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!rootDiv.current) return;

    observerRef.current = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const mailId = entry.target.getAttribute("data-mail-id");
            if (!mailId) return;

            if (!pendingReadMails.current.has(mailId)) {
              pendingReadMails.current.add(mailId);
            }
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.8, root: rootDiv.current }
    );

    return () => observerRef.current?.disconnect();
  }, [mailOpen]);

  // track mail meny closure to set mails to "already read"
  useEffect(() => {
    if (mailOpen) return;
    if ([...pendingReadMails.current].length <= 0) return;

    for (const mailId of pendingReadMails.current) {
      if (!readMails.includes(mailId)) {
        setReadMails((prev) => [...prev, mailId]);
      }
    }
    pendingReadMails.current.clear();
  }, [mailOpen]);

  return (
    <div className="absolute w-full h-[50%] flex flex-col justify-start items-end right-0 p-1 gap-1 top-[10%] text-white border border-red-500">
      <div
        className="pointer-events-auto flex justify-center items-center bg-gray-800 border-gray-600 p-2 rounded-md cursor-pointer relative"
        onClick={() => setMailOpen(!mailOpen)}
      >
        {mailOpen ? (
          <ChevronDown className="w-8 h-8 text-amber-300"></ChevronDown>
        ) : (
          <MailIcon className="w-8 h-8 text-amber-300"></MailIcon>
        )}
        {unreadMails.length > 0 && (
          <div className="absolute top-0 left-0 w-5 h-5 flex justify-center items-center translate-x-[-30%] translate-y-[-30%] bg-red-500 text-white rounded-2xl">
            {unreadMails.length}
          </div>
        )}
      </div>

      {mailOpen && (
        <div className="w-full h-full pointer-events-auto flex justify-center items-center bg-gray-800 p-2 rounded-lg">
          <div className="pointer-events-auto w-full h-full flex justify-center items-center bg-gray-900 shadow-black shadow-md rounded-lg">
            <div
              ref={rootDiv}
              className="flex flex-col justify-start items-center w-full h-full overflow-y-auto no-scrollbar"
            >
              {mailsUI.length > 0 ? (
                mailsUI.map((mail) => (
                  <div
                    key={mail.id}
                    ref={(element) => {
                      if (element) observerRef.current?.observe(element);
                    }}
                    data-mail-id={mail.id}
                    className="w-full h-auto"
                  >
                    <MailBlock mail={mail}></MailBlock>
                  </div>
                ))
              ) : (
                <div className="w-full h-full flex flex-col justify-center items-center gap-2 text-gray-400">
                  Mailbox is empty
                  <MailOpen className="w-8 h-8"></MailOpen>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
