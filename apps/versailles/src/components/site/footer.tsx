import MaxWidthWrapper from "@/components/site/ui/MaxWidthWrapper";
import Link from "next/link";

export default function Footer() {
  return (
    <>
      <div className="w-full bg-card border-t border-primary">
        <MaxWidthWrapper>
          <div className="w-full flex flex-col justify-center items-center md:px-20 gap-3 text-muted-foreground">
            {/* Contents */}
            <div className="flex border border-red-500 justify-between items-start p-5 gap-20 text-sm">
              {/* Game */}
              <div className="flex flex-col gap-2 text-muted-foreground">
                <h1 className="font-bold text-card-foreground">Game</h1>
                <Link
                  href="/"
                  className="w-auto min-w-0 text-muted-foreground hover:text-foreground p-0 m-0"
                >
                  Home
                </Link>
                <Link
                  href="/guide"
                  className="w-auto min-w-0 text-muted-foreground hover:text-foreground p-0 m-0"
                >
                  Guide
                </Link>
                <Link
                  href="/"
                  className="w-auto min-w-0 text-muted-foreground hover:text-foreground p-0 m-0"
                >
                  Main Menu
                </Link>
                <Link
                  href="/"
                  className="w-auto min-w-0 text-muted-foreground hover:text-foreground p-0 m-0"
                >
                  Load Saves
                </Link>
              </div>
              {/* Social */}
              <div className="flex flex-col gap-2">
                <h1 className="font-bold text-card-foreground">Follow Me</h1>
                <Link
                  href="https://github.com/oXFrightenedKnight"
                  target="_blank"
                  className="w-auto min-w-0 text-muted-foreground hover:text-foreground p-0 m-0"
                >
                  <div className="flex justify-center items-center gap-2 hover:text-foreground text-muted-foreground">
                    <span>GitHub</span>
                    <svg
                      role="img"
                      width={18}
                      height={18}
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <title>GitHub</title>
                      <path
                        fill={"currentColor"}
                        d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                      />
                    </svg>
                  </div>
                </Link>
              </div>
            </div>
            {/* Copyright */}
            <div className="w-full flex justify-center items-center border-t p-2">
              <span className="text-sm">Copyright © 2026 Vlad Stepanov. All Rights reserved.</span>
            </div>
          </div>
        </MaxWidthWrapper>
      </div>
    </>
  );
}
