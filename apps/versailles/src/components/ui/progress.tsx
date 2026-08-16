"use client";

import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  value2,
  indicatorClassName,
  indicatorClassName2,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string;
  indicatorClassName2?: string;
  value2?: number;
}) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative flex h-2 w-full overflow-hidden rounded-full bg-primary/20",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn("h-full shrink-0 bg-primary transition-all", indicatorClassName)}
        style={{ width: `${value || 0}%` }}
      />
      {value2 !== undefined && (
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className={cn("h-full shrink-0 bg-secondary transition-all", indicatorClassName2)}
          style={{ width: `${value2 || 0}%` }}
        />
      )}
    </ProgressPrimitive.Root>
  );
}

export { Progress };
