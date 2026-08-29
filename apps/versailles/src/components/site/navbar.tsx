"use client";

import MobileNavbar from "@/components/site/mobileNavbar";
import MaxWidthWrapper from "@/components/site/ui/MaxWidthWrapper";
import { Button } from "@/components/ui/button";
import { useAuth, UserButton } from "@clerk/clerk-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { isSignedIn } = useAuth();

  const router = useRouter();

  return (
    <nav className="fixed h-14 inset-x-0 top-0 z-30 w-full border-b border-primary/75 bg-transparent backdrop-blur-lg transition-all  select-none">
      <MaxWidthWrapper className="h-full">
        <div className="flex h-full items-center justify-between">
          <div
            className=" h-full relative aspect-3/1 cursor-pointer"
            onClick={() => router.push("/")}
          >
            <Image
              draggable={false}
              fill
              className="object-contain p-2"
              alt="versailles logo"
              src={`/site_assets/logo.png`}
            ></Image>
          </div>

          {/* Main sections */}
          <div className="hidden md:flex h-full justify-between items-center gap-5">
            <Button
              className="h-full cursor-pointer text-foreground hover:text-primary text-lg"
              variant={"link"}
              onClick={() => router.push("/home")}
            >
              Menu
            </Button>
            <Button
              className="h-full cursor-pointer text-foreground hover:text-primary text-lg"
              variant={"link"}
              onClick={() => router.push("/game")}
            >
              Saves
            </Button>
            <Button
              className="h-full cursor-pointer text-foreground hover:text-primary text-lg"
              variant={"link"}
              onClick={() => router.push("/guide")}
            >
              Guide
            </Button>
          </div>

          {/* Github + login */}
          <div className="h-full hidden md:flex justify-center items-center p-1.5 pr-2">
            <div className="flex h-full justify-between items-center gap-4">
              {!isSignedIn ? (
                <>
                  <div className="h-full flex justify-center items-center gap-2">
                    <Button className="cursor-pointer" onClick={() => router.push("/sign-up")}>
                      Sign Up
                    </Button>
                    <Button
                      variant={"ghost"}
                      className="cursor-pointer border border-transparent hover:border-primary hover:border hover:text-primary hover:bg-transparent"
                      onClick={() => router.push("/sign-in")}
                    >
                      Sign In
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <UserButton></UserButton>
                </>
              )}
              <Button
                className="aspect-square h-full w-auto cursor-pointer"
                size="icon"
                onClick={() =>
                  window.open("https://github.com/oXFrightenedKnight/versailles", "_blank")
                }
              >
                {/* Github logo */}
                <svg
                  role="img"
                  width={32}
                  height={32}
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-6"
                >
                  <title>GitHub</title>
                  <path
                    fill={"var(--primary-foreground)"}
                    d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                  />
                </svg>
              </Button>
            </div>
          </div>

          <MobileNavbar></MobileNavbar>
        </div>
      </MaxWidthWrapper>
    </nav>
  );
}
