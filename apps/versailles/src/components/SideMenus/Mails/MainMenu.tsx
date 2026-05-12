"use client";

import { useGameStore } from "@/lib/stores/gameStore";
import { ChevronDown, Mail, MailOpen } from "lucide-react";
import { useState } from "react";
import MailBlock from "./MailBlock";

export default function MailMenu() {
  const [mailOpen, setMailOpen] = useState<boolean>(false);
  const mails = useGameStore((s) => s.mails);
  const unreadMails = mails.filter((m) => !m.read);
  return (
    <div className="absolute w-full h-[50%] flex flex-col justify-start items-end right-0 p-1 gap-1 top-[10%] text-white border border-red-500">
      <div
        className="pointer-events-auto flex justify-center items-center bg-gray-800 border-gray-600 p-2 rounded-md cursor-pointer relative"
        onClick={() => setMailOpen(!mailOpen)}
      >
        {mailOpen ? (
          <ChevronDown className="w-8 h-8 text-amber-300"></ChevronDown>
        ) : (
          <Mail className="w-8 h-8 text-amber-300"></Mail>
        )}
        {unreadMails.length > 0 && (
          <div className="absolute top-0 left-0 w-5 h-5 flex justify-center items-center translate-x-[-30%] translate-y-[-30%] bg-red-500 text-white rounded-2xl">
            {mails.length}
          </div>
        )}
      </div>

      {mailOpen && (
        <div className="w-full h-full pointer-events-auto flex justify-center items-center bg-gray-800 p-2 rounded-lg">
          <div className="pointer-events-auto w-full h-full flex justify-center items-center bg-gray-900 shadow-black shadow-md rounded-lg">
            <div className="flex flex-col justify-center items-start w-full h-full">
              {mails.length > 0 ? (
                mails.map((mail) => <MailBlock mail={mail} key={mail.id}></MailBlock>)
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
