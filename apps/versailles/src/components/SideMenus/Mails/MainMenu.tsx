"use client";

import { useGameStore } from "@/lib/stores/gameStore";
import { ChevronDown, Mail } from "lucide-react";
import { useState } from "react";
import MailBlock from "./MailBlock";

export default function MailMenu() {
  const [mailOpen, setMailOpen] = useState<boolean>(false);
  const mails = useGameStore((s) => s.mails);
  return (
    <div className="absolute w-full h-[50%] flex flex-col justify-start items-end right-0 p-1 gap-1 top-[10%] border border-red-500">
      <div
        className="pointer-events-auto flex justify-center items-center bg-gray-800 border-gray-600 p-2 rounded-md cursor-pointer"
        onClick={() => setMailOpen(!mailOpen)}
      >
        {mailOpen ? (
          <ChevronDown className="w-8 h-8 text-amber-300"></ChevronDown>
        ) : (
          <Mail className="w-8 h-8 text-amber-300"></Mail>
        )}
      </div>

      {mailOpen && (
        <div className="pointer-events-auto w-full h-full flex justify-center items-center bg-gray-800 rounded-lg">
          <div className="flex flex-col justify-center items-start w-full h-full border">
            {/*{mails.map((mail) => (
              <MailBlock mail={mail} key={mail.id}></MailBlock>
            ))}*/}
          </div>
        </div>
      )}
    </div>
  );
}
