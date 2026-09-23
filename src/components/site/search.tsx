import { useNavigate } from "@tanstack/react-router";
import { Search as SearchIcon } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Hit } from "./search-panel";

// The catalog indexes every content dataset and pulls in cmdk. This trigger is
// in the header on every page, so the panel loads on first intent (hover,
// focus, click or the shortcut) instead of riding in the root chunk.
const loadPanel = () => import("./search-panel");
const SearchPanel = lazy(() => loadPanel().then((m) => ({ default: m.SearchPanel })));

/** Same footprint as the panel's input row, shown while the panel loads. */
function PanelFallback() {
  return (
    <div className="flex items-center gap-3 border-b border-border bg-bg-elevated px-4" aria-busy="true">
      <SearchIcon className="size-4 text-fg-subtle" strokeWidth={1.75} />
      <span className="flex h-14 items-center text-sm text-fg-subtle">Search pages, products, and public repositories</span>
    </div>
  );
}

export function SiteSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag && ["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      event.preventDefault();
      void loadPanel();
      setOpen((value) => !value);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(hit: Hit) {
    setOpen(false);
    setQuery("");
    if (hit.external) {
      window.open(hit.href, "_blank", "noopener,noreferrer");
      return;
    }
    void navigate({ to: hit.href as never, search: hit.search as never });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-11 items-center gap-2 rounded-md px-2.5 text-fg-muted hover:bg-bg-subtle hover:text-fg"
          aria-label="Search the site"
          onPointerEnter={() => void loadPanel()}
          onFocus={() => void loadPanel()}
        >
          <SearchIcon className="size-4" strokeWidth={1.75} />
          <span className="hidden text-xs xl:inline">Search</span>
          <kbd className="hidden rounded-sm bg-bg-subtle px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle xl:inline">
            ⌘K
          </kbd>
        </button>
      </DialogTrigger>
      <DialogContent showClose={false} aria-describedby={undefined} className="p-0">
        <DialogTitle className="sr-only">Search Quesar and MLAI</DialogTitle>
        <DialogDescription className="sr-only">
          Jump to architecture nodes, products, docs, and public repositories.
        </DialogDescription>
        <Suspense fallback={<PanelFallback />}>
          <SearchPanel query={query} setQuery={setQuery} onSelect={go} />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}
