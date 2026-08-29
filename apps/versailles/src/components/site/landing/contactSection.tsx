import ContactForm from "@/components/site/ui/ContactForm";
import MaxWidthWrapper from "@/components/site/ui/MaxWidthWrapper";
import Image from "next/image";

export default function ContactSection() {
  return (
    <>
      <section className="relative isolate w-full overflow-hidden">
        <Image
          src="/textures/smoke.jpg"
          alt=""
          fill
          priority
          draggable={false}
          className="pointer-events-none select-none z-0 object-cover opacity-50"
        />

        {/* Shading */}
        <div
          className="
            pointer-events-none
            absolute inset-x-0 top-0 z-10 h-100
            bg-linear-to-b
            from-background to-transparent"
        />

        <MaxWidthWrapper className="relative z-20">
          <div className=" flex justify-center items-center md:p-10 py-10">
            <div className="flex flex-col justify-center items-center gap-5 md:w-[50%] w-full p-10">
              <div className="flex flex-col justify-center items-center gap-2">
                <span className="text-primary text-4xl font-bold text-center">Got Questions?</span>
                <span className="text-secondary text-2xl">Contact Us</span>
              </div>

              <ContactForm></ContactForm>
            </div>
          </div>
        </MaxWidthWrapper>
      </section>
    </>
  );
}
