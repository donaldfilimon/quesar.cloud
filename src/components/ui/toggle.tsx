import * as TogglePrimitive from "@radix-ui/react-toggle";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Toggle({ className, ...props }: ComponentProps<typeof TogglePrimitive.Root>) {
  return (
    <TogglePrimitive.Root
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-md text-fg-muted hover:bg-bg-subtle hover:text-fg data-[state=on]:text-fg",
        className,
      )}
      {...props}
    />
  );
}
