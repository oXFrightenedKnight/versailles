import MaxWidthWrapper from "@/components/site/ui/MaxWidthWrapper";
import ShadedContainer from "@/components/site/ui/ShadedContainer";
import { ExternalLink } from "lucide-react";
import Image from "next/image";

export default function GuideSection() {
  return (
    <>
      <section className="relative isolate w-full overflow-hidden">
        {/* Top-shading */}
        {/* Shading */}
        <div
          className="
            pointer-events-none
            absolute inset-x-0 top-0 z-10 h-40
            bg-linear-to-b
            from-black/50 to-transparent"
        />

        {/* Content */}
        <MaxWidthWrapper className="relative z-20">
          <div className="relative w-full flex flex-col justify-center items-center">
            <div className="w-full justify-center items-center flex flex-col mt-24">
              {/* Header */}
              <div className="flex flex-col justify-center items-center text-balance text-center gap-2">
                <h1 className="text-primary text-4xl font-bold">Don&apos;t know where to start?</h1>
                <span>Check out our short tutorial for help.</span>
              </div>

              {/* Guide link */}
              <div className="w-full flex flex-col gap-5 items-center justify-center md:px-20 lg:px-40 py-10">
                <ShadedContainer className="p-10 border-y border-card">
                  <div className=" w-full flex flex-col md:grid md:grid-cols-[3fr_3fr] bg-card rounded-xl overflow-hidden border border-foreground cursor-pointer">
                    {/* Text */}
                    <div className="w-full flex flex-col gap-3 p-10 justify-center items-start border-b md:border-b-0 md:border-r border-foreground text-balance">
                      <h1 className="text-foreground text-xl font-bold">
                        How to get started in Versailles
                      </h1>

                      <span className="text-sm">
                        Learn how to manage economy, supply, army, and much more!
                      </span>
                    </div>

                    {/* Image */}
                    <div className="relative min-h-50 w-full overflow-hidden md:min-h-0">
                      <Image
                        fill
                        alt=""
                        src="/site_assets/guide_preview.png"
                        className="object-cover opacity-70"
                      />

                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-30 bg-linear-to-t from-black/90 to-transparent" />

                      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-end gap-2 p-4">
                        <span className="text-2xl">Open Guide</span>
                        <ExternalLink className="size-8" />
                      </div>
                    </div>
                  </div>
                </ShadedContainer>
              </div>
            </div>
          </div>
        </MaxWidthWrapper>
      </section>
    </>
  );
}
