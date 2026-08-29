"use client";

import { Button } from "@/components/ui/button";
import { useAuth, UserProfile } from "@clerk/clerk-react";

export default function ProfilePage() {
  const { isSignedIn, signOut } = useAuth();
  if (!isSignedIn) return null;
  return (
    <>
      <div className=" pt-20 pb-10 w-full h-auto flex flex-col justify-center items-center gap-5">
        <UserProfile />
        <Button
          variant={"outline"}
          size={"lg"}
          className="cursor-pointer border-destructive text-destructive hover:text-foreground hover:bg-destructive"
          onClick={() => signOut()}
        >
          Sign Out
        </Button>
      </div>
    </>
  );
}
