import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export default function ShadedContainer({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        `z-9 relative w-full h-full justify-center items-center before:pointer-events-none
            before:absolute before:inset-x-0 before:top-0
            before:h-20
            before:z-20
            before:bg-linear-to-b
            before:from-black/10 before:to-transparent

            after:pointer-events-none
            after:absolute after:inset-x-0 after:bottom-0
            after:h-20
            after:z-20
            after:bg-linear-to-t
            after:from-black/10 after:to-transparent`,
        className
      )}
    >
      {children}
    </div>
  );
}
