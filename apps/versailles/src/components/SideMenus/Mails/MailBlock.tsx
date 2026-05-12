"use client";

import { MailTexts } from "@/lib/data";
import { getMailText, nationText } from "@/lib/helpers/mails";
import { useGameStore } from "@/lib/stores/gameStore";
import { Mail } from "@repo/shared";
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
      <div className="flex flex-col justify-center items-center text-white">
        {/* Header */}
        <div className="w-full flex justify-start items-center">
          <span className="text-xl">{text.header}</span>
        </div>

        {/* Body */}
        <div className="w-full flex flex-col justify-center items-center">
          <div className="w-full flex justify-start items-center">
            <span className="">{text.body}</span>
          </div>

          <div className="w-full flex justify-end items-center gap-1 border">
            <div className="bg-green-700 flex justify-center items-center gap-1">
              <Check className="w-6 h-6"></Check>
              <span>Accept</span>
            </div>
            <div className="bg-red-700 flex justify-center items-center gap-1">
              <X className="w-6 h-6"></X>
              <span>Decline</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full flex justify-end items-center">
          <span>{mail.createdAt}</span>
        </div>
      </div>
    </div>
  );
}
