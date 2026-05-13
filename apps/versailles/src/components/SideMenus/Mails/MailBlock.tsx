"use client";

import { getMailText } from "@/lib/helpers/mails";
import { useGameStore } from "@/lib/stores/gameStore";
import { Mail } from "@repo/shared/data/mail";
import { Check, X } from "lucide-react";
import { useMemo } from "react";

export default function MailBlock({ mail }: { mail: Mail }) {
  const playerNation = useGameStore((s) => s.playerNation);

  const text = useMemo(() => {
    const playerId = playerNation ? playerNation.id : null;
    if (!playerId) return null;

    return getMailText(mail, playerId);
  }, [mail, playerNation]);

  if (!text) return null;

  return (
    <div className="w-full h-auto p-1">
      <div
        className={`flex flex-col justify-center items-center p-2 gap-1 bg-gray-800 text-white border border-gray-600 ${!mail.read ? "border-2 shadow-[0_0_5px_rgba(255,255,255,1)]" : ""} rounded-lg`}
      >
        {/* Header */}
        <div className="w-full flex justify-start items-center">
          <span className="text-md">{text.header}</span>
        </div>

        {/* Body */}
        <div className="w-full flex flex-col justify-center items-center p-1 gap-4">
          <div className="w-full flex justify-start items-center">
            <span className="text-xs"> {text.body}</span>
          </div>

          {mail.requireAnswer && (
            <div className="w-full flex justify-end items-center gap-1">
              <div className="bg-green-700 flex justify-center items-center p-1 gap-1 rounded-md cursor-pointer">
                <Check className="w-6 h-6"></Check>
                <span>Accept</span>
              </div>
              <div className="bg-red-700 flex justify-center items-center p-1 gap-1 rounded-md cursor-pointer">
                <X className="w-6 h-6"></X>
                <span>Decline</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`w-full flex ${mail.expire ? "justify-around" : "justify-end"} items-center`}
        >
          {mail.expire && (
            <span className="text-xs text-gray-400">Expires: {mail.expire} Turn</span>
          )}
          <span className="text-xs text-gray-400">Recieved: Turn {mail.createdAt}</span>
        </div>
      </div>
    </div>
  );
}
