import * as AccordionPrimitive from "@radix-ui/react-accordion";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({
  className,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn("group bg-bg-elevated", className)} {...props} />;
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          "flex min-h-14 flex-1 items-center justify-between gap-4 px-5 py-4 text-left font-medium text-fg",
          className,
        )}
        {...props}
      >
        {children}
        <span
          className="font-mono text-lg leading-none text-accent transition-transform duration-150 group-data-[state=open]:rotate-45"
          aria-hidden="true"
        >
          +
        </span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className={cn("overflow-hidden data-[state=closed]:h-0", className)}
      {...props}
    >
      <div className="px-5 pb-5 text-sm leading-relaxed text-fg-muted">{children}</div>
    </AccordionPrimitive.Content>
  );
}
