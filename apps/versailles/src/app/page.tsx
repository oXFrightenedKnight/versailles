"use client";

import Footer from "@/components/site/footer";
import AISection from "@/components/site/landing/AISection";
import ContactSection from "@/components/site/landing/contactSection";
import ProjectShowcase from "@/components/site/landing/description";
import GuideSection from "@/components/site/landing/guideSection";
import HeroSection from "@/components/site/landing/heroSection";
import Navbar from "@/components/site/navbar";
import ShadedContainer from "@/components/site/ui/ShadedContainer";

export default function Home() {
  return (
    <>
      <div className="relative">
        <Navbar></Navbar>
        <ShadedContainer className="before:from-black/50 after:from-black/50 after:h-40 before:h-40">
          <div className="w-full h-auto">
            <HeroSection></HeroSection>
            <ProjectShowcase></ProjectShowcase>
            <AISection></AISection>
            <GuideSection></GuideSection>
            <ContactSection></ContactSection>
          </div>
        </ShadedContainer>
        <Footer></Footer>
      </div>
    </>
  );
}

{
  /* 
  <div className="w-full h-screen flex justify-center items-center border">
      <div className="flex flex-col items-center justify-center p-20 gap-10 border-red-500 border">
        <p className="text-9xl">Versailles</p>
        <SignedOut>
          <div className="w-full h-full flex justify-center items-center gap-5">
            <Button
              className="text-white bg-amber-600 border-amber-800 border-2 rounded-[12px] cursor-pointer hover:bg-amber-700 text-3xl p-8"
              onClick={() => redirect("/sign-in")}
            >
              Sign In
            </Button>
            <Button
              className="text-white bg-amber-600 border-amber-800 border-2 rounded-[12px] cursor-pointer hover:bg-amber-700 text-3xl p-8"
              onClick={() => redirect("/sign-up")}
            >
              Sign Up
            </Button>
          </div>
        </SignedOut>
        <SignedIn>
          <div className="w-full h-full flex justify-center items-center gap-5">
            <Button
              className="text-white bg-amber-600 border-amber-800 border-2 rounded-[12px] cursor-pointer hover:bg-amber-700 text-3xl p-8"
              onClick={() => redirect("/")}
            >
              Continue
            </Button>
            <Button
              className="text-white bg-amber-600 border-amber-800 border-2 rounded-[12px] cursor-pointer hover:bg-amber-700 text-3xl p-8"
              onClick={() => redirect("/game")}
            >
              New Game
            </Button>
          </div>
        </SignedIn>
      </div>
    </div> */
}
