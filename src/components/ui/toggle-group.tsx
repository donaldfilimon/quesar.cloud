import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function ToggleGroup({ className, ...props }: ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return <ToggleGroupPrimitive.Root className={cn("flex flex-wrap gap-1", className)} {...props} />;
}

export function ToggleGroupItem({ className, ...props }: ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      className={cn(
        "inline-flex h-11 shrink-0 items-center rounded-md px-3 font-mono text-[11px] tracking-wide text-fg-muted uppercase",
        "hover:text-fg data-[state=on]:bg-bg-subtle data-[state=on]:text-fg",
        className,
      )}
      {...props}
    />
  );
}
