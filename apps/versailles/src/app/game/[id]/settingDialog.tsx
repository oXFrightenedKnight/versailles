"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Cog } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingDialog({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const router = useRouter();
  function handleContinue() {
    setOpen(false);
  }
  function handleHome() {
    router.push("/home");
  }
  function handleLoadGame() {
    router.push("/game");
  }
  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        setOpen(!open);
      }}
    >
      <DialogContent className="sm:max-w-[300px] bg-gray-900 p-4" showCloseButton={false}>
        <div className="w-full bg-gray-800 rounded-md p-2 flex flex-col justify-center items-center gap-2">
          <DialogHeader>
            <DialogTitle className="text-white">Settings</DialogTitle>
          </DialogHeader>
          <div className="w-full flex flex-col justify-center items-center gap-1">
            <Button className="w-full bg-gray-900 cursor-pointer" onClick={handleContinue}>
              Continue
            </Button>
            <Button className="w-full bg-gray-900 cursor-pointer" onClick={handleLoadGame}>
              Load Game
            </Button>
            <Button className="w-full bg-gray-900 cursor-pointer" onClick={handleHome}>
              Home
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
