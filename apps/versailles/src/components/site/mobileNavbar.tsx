import { Button } from "@/components/ui/button";
import { SheetTrigger, SheetContent, Sheet } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MobileNavbar() {
  const router = useRouter();

  const [open, setOpen] = useState<boolean>();
  return (
    <>
      {/* Mobile menu */}
      <div className="md:hidden flex items-center gap-4 p-2">
        <Sheet open={open} onOpenChange={(isOpen) => setOpen(isOpen)}>
          <SheetTrigger asChild>
            <Button size={"icon"}>
              <Menu className="text-primary-foreground w-6 h-6"></Menu>
            </Button>
          </SheetTrigger>

          <SheetContent
            side="right"
            className="h-full md:hidden bg-background text-primary-foreground border-foreground/50 flex z-100"
          >
            <div className="flex h-full flex-col items-end justify-between">
              <div className="flex flex-col justify-between items-end mt-15 gap-4">
                <Button
                  className="w-auto cursor-pointer text-foreground hover:text-primary text-2xl"
                  variant={"link"}
                  onClick={() => router.push("/home")}
                >
                  Menu
                </Button>
                <Button
                  className="w-auto cursor-pointer text-foreground hover:text-primary text-2xl"
                  variant={"link"}
                  onClick={() => router.push("/game")}
                >
                  Saves
                </Button>
                <Button
                  className="w-auto cursor-pointer text-foreground hover:text-primary text-2xl"
                  variant={"link"}
                  onClick={() => router.push("/guide")}
                >
                  Guide
                </Button>
              </div>

              <div className="flex w-full justify-center items-center gap-2 p-4 border-t border-foreground/50">
                <Button className="w-1/2" size={"lg"} onClick={() => router.push("/profile")}>
                  Manage Account
                </Button>
                <Button
                  className="w-1/2 cursor-pointer border-primary"
                  variant={"outline"}
                  size={"lg"}
                  onClick={() =>
                    window.open("https://github.com/oXFrightenedKnight/versailles", "_blank")
                  }
                >
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
                      fill={"var(--primary)"}
                      d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                    />
                  </svg>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
