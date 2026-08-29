"use client";

import MaxWidthWrapper from "@/components/site/ui/MaxWidthWrapper";
import PlayButton from "@/components/site/ui/PlayButton";
import { ChevronsDown } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function HeroSection() {
  const router = useRouter();
  return (
    <>
      <section className="relative isolate h-[110vh] w-full overflow-hidden pt-10">
        <Image
          src="/site_assets/hero-background.png"
          alt=""
          fill
          priority
          draggable={false}
          className="pointer-events-none select-none z-0 object-cover blur-sm"
        />
        <MaxWidthWrapper className="h-full">
          <div className=" h-full w-full flex flex-col items-center justify-center text-center gap-10 select-none">
            {/* Logo */}
            <div className="md:w-1/2 w-full relative aspect-3/1">
              <Image
                draggable={false}
                fill
                className="object-contain"
                alt="versailles logo"
                src={`/site_assets/logo.png`}
              ></Image>
            </div>

            {/* Sub-text */}
            <div
              className="border-y border-primary relative px-5 py-3 text-primary text-xl md:text-2xl
            before:pointer-events-none
            before:absolute before:inset-x-0 before:top-0
            before:h-4
            before:bg-linear-to-b
            before:from-primary/15 before:to-transparent

            after:pointer-events-none
            after:absolute after:inset-x-0 after:bottom-0
            after:h-4
            after:bg-linear-to-t
            after:from-primary/15 after:to-transparent"
            >
              <span>A BROWSER STRATEGY GAME</span>
            </div>

            {/* Try Now */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-around items-center z-0">
                <ChevronsDown className="w-7 h-7 text-primary/80 mb-3"></ChevronsDown>
                <ChevronsDown className="w-8 h-8 text-primary"></ChevronsDown>
                <ChevronsDown className="w-7 h-7 text-primary/80 mb-3"></ChevronsDown>
              </div>
              <div
                className="w-50 h-30 border border-card-foreground/50 bg-card rounded-2xl relative cursor-pointer hover:border-primary transition-all hover:scale-105 overflow-hidden
                hover:shadow-[inset_0_0_64px_color-mix(in_oklab,var(--primary)_36%,transparent)]"
                onClick={() => router.push("/home")}
              >
                <Image
                  fill
                  alt=""
                  src="/site_assets/play_preview.png"
                  className="object-cover opacity-70"
                />
                <PlayButton></PlayButton>
              </div>
            </div>
          </div>
        </MaxWidthWrapper>
      </section>
    </>
  );
}
