import { Moon, Sun } from "lucide-react";
import { useId, useSyncExternalStore } from "react";
import { applyTheme, currentTheme, subscribeTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/ui/toggle";
import { loadHeaderMenus, TRIGGER_ATTR, useHeaderMenus } from "./header-menus-loader";

export function ThemeToggle({ className }: { className?: string }) {
  // The server (and the hydration pass) render "dark", matching the root
  // markup; the client then reads the theme actually applied to <html>.
  const theme = useSyncExternalStore<Theme>(subscribeTheme, currentTheme, () => "dark");

  const dark = theme === "dark";
  const label = dark ? "Switch to light theme" : "Switch to dark theme";
  // The tooltip (Radix, with the popper stack) loads after hydration with the
  // header's other overlays; until then the bare toggle renders the same
  // markup, including the tooltip trigger's `data-state`.
  const menus = useHeaderMenus();
  const id = useId();

  const toggle = (
    <Toggle
      pressed={dark}
      onPressedChange={(next) => {
        const value: Theme = next ? "dark" : "light";
        applyTheme(value);
      }}
      className={className}
      aria-label="Dark theme"
      {...{ [TRIGGER_ATTR]: id }}
      {...(menus ? null : { "data-state": "closed" })}
      onPointerEnter={loadHeaderMenus}
      onFocus={loadHeaderMenus}
    >
      <span className="relative size-4">
        <Sun
          className={cn(
            "absolute inset-0 size-4 transition-[opacity,transform,filter] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]",
            theme === "light"
              ? "scale-100 opacity-100 blur-0"
              : "scale-[0.25] opacity-0 blur-[4px]",
          )}
          strokeWidth={1.75}
        />
        <Moon
          className={cn(
            "absolute inset-0 size-4 transition-[opacity,transform,filter] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]",
            theme === "dark" ? "scale-100 opacity-100 blur-0" : "scale-[0.25] opacity-0 blur-[4px]",
          )}
          strokeWidth={1.75}
        />
      </span>
    </Toggle>
  );
  return menus ? <menus.Hint label={label}>{toggle}</menus.Hint> : toggle;
}
