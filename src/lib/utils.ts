import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Mirrors the named font-size steps src/styles.css adds to Tailwind's own
// (@theme inline). Without this, tailwind-merge reads `text-2xs` as a text
// color and would drop a real color class it shares an element with.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["2xs", "display"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** The anchor id a heading gets; shared by article bodies and the doc outline. */
export function headingId(heading: string): string {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
