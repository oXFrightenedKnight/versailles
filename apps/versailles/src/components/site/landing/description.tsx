import MaxWidthWrapper from "@/components/site/ui/MaxWidthWrapper";
import Image from "next/image";

export default function ProjectShowcase() {
  return (
    <>
      <section className="relative isolate w-full overflow-hidden">
        {/* Background */}
        <Image
          src="/site_assets/gameplay_description.png"
          alt=""
          fill
          priority
          draggable={false}
          className="pointer-events-none select-none z-0 object-cover opacity-80"
        />

        {/* right-Shading */}
        <div
          className="
            pointer-events-none
            absolute inset-y-0 right-0 z-10 w-[70%]
            bg-linear-to-l
            from-background to-transparent"
        />

        {/* Content */}
        <MaxWidthWrapper className="relative z-20">
          <div className="w-full">
            <div className="w-full py-10 flex justify-end items-center">
              {/** description */}
              <div className="py-40 border md:max-w-[50%] max-w-full">
                <div className="w-full flex flex-col jutify-center items-center text-end p-6 md:pr-20 gap-5 border">
                  <div className="w-full gap-2 flex flex-col justify-center items-end">
                    <h1 className="text-4xl text-primary font-bold text-balance">
                      Experience Epic Turn-Based Simulation
                    </h1>
                    <h2 className="text-2xl text-secondary text-balance">
                      Subjugate the entire map!
                    </h2>
                  </div>
                  <div className="flex justify-end items-center">
                    <span className="text-foreground text-balance">
                      Compete among 5 other nations to decide who will control the entire map. Build
                      buildings and infrastracture, train units, declare wars, and carry your
                      kingdom to victory in Versailles.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </MaxWidthWrapper>
      </section>
    </>
  );
}
