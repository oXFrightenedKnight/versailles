import MaxWidthWrapper from "@/components/site/ui/MaxWidthWrapper";
import Image from "next/image";

export default function AISection() {
  return (
    <>
      <section className="relative isolate w-full overflow-hidden">
        {/* Background */}
        <Image
          src="/site_assets/ai_description.png"
          alt=""
          fill
          priority
          draggable={false}
          className="pointer-events-none select-none z-0 object-cover opacity-80"
        />

        {/* left-Shading */}
        <div
          className="
            pointer-events-none
            absolute inset-y-0 left-0 z-10 w-[70%]
            bg-linear-to-r
            from-background to-transparent"
        />

        {/* Content */}
        <MaxWidthWrapper className="relative z-20">
          <div className="w-full">
            <div className="w-full py-10 flex justify-start items-center">
              {/** description */}
              <div className="py-40 border max-w-full md:max-w-[50%]">
                <div className="w-full flex flex-col jutify-center items-center text-start p-6 md:pl-20 gap-5 border">
                  <div className="w-full gap-2 flex flex-col justify-center items-start">
                    <h1 className="text-4xl text-primary font-bold text-balance">
                      Defend Your Nation From Complex AI
                    </h1>
                    <h2 className="text-2xl text-secondary text-balance">
                      Show &apos;em no mercy!
                    </h2>
                  </div>
                  <div className="flex justify-end items-center">
                    <span className="text-foreground text-balance">
                      Test your strategy in with real time, adaptable AI. Declare wars, sign peace
                      treaties, and fight others to gain power and resources.
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
