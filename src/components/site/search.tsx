import { useNavigate } from "@tanstack/react-router";
import { Search as SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { SearchHit } from "@/lib/site-search";
import {
  headerMenusLoaded,
  openWhenLoaded,
  preloadHeaderMenus,
  TRIGGER_ATTR,
  useHeaderMenus,
} from "./header-menus-loader";
import { preloadSearchPanel } from "./search-panel-loader";

const triggerClass =
  "inline-flex h-11 items-center gap-2 rounded-md px-2.5 text-fg-muted hover:bg-bg-subtle hover:text-fg";

export function SiteSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  // The Radix dialog loads after hydration with the header's other overlays
  // (header-menus-loader.ts); until then the trigger is a plain button with
  // the same markup, and the panel and its catalog load on first intent.
  const menus = useHeaderMenus();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest("input, textarea, select"))
      )
        return;
      event.preventDefault();
      preloadSearchPanel();
      if (headerMenusLoaded()) setOpen((value) => !value);
      else openWhenLoaded(() => setOpen(true));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }

  function go(hit: SearchHit) {
    setOpen(false);
    setQuery("");
    if (hit.external) {
      window.open(hit.href, "_blank", "noopener,noreferrer");
      return;
    }
    void navigate({ to: hit.href as never, search: hit.search as never, hash: hit.hash });
  }

  const content = (
    <>
      <SearchIcon className="size-4" strokeWidth={1.75} />
      <span className="hidden text-xs xl:inline">Search</span>
      <kbd className="hidden rounded-sm bg-bg-subtle px-1.5 py-0.5 font-mono text-10 text-fg-subtle xl:inline">
        ⌘K
      </kbd>
    </>
  );

  if (menus) {
    return (
      <menus.SearchDialog
        open={open}
        onOpenChange={onOpenChange}
        query={query}
        setQuery={setQuery}
        onSelect={go}
        triggerClassName={triggerClass}
      >
        {content}
      </menus.SearchDialog>
    );
  }

  return (
    <button
      type="button"
      className={triggerClass}
      aria-label="Search the site"
      aria-haspopup="dialog"
      aria-expanded={open}
      data-state={open ? "open" : "closed"}
      {...{ [TRIGGER_ATTR]: "search" }}
      onPointerEnter={() => {
        preloadSearchPanel();
        preloadHeaderMenus();
      }}
      onFocus={() => {
        preloadSearchPanel();
        preloadHeaderMenus();
      }}
      onClick={() => openWhenLoaded(() => setOpen(true))}
    >
      {content}
    </button>
  );
}
