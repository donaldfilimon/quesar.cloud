import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Mirrors the named font-size, tracking and radius steps in src/styles.css
// (@theme inline). Without this, tailwind-merge reads `text-10` as a text
// color and would drop a real color class it shares an element with, while
// `text-[10px]` is correctly read as a font size. Keep in sync with styles.css.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "10",
        "10.5",
        "11",
        "12",
        "12.5",
        "13",
        "15",
        "0.7rem",
        "0.8rem",
        "0.9375rem",
        "1.0625rem",
      ],
      tracking: ["0.16em", "0.18em", "0.2em", "0.25em", "0.3em"],
      radius: ["18"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
