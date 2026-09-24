import { useNavigate } from "@tanstack/react-router";
import { Search as SearchIcon } from "lucide-react";
import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { SearchHit } from "@/lib/site-search";

// The catalog indexes every content dataset and pulls in cmdk. This trigger is
// in the header on every page, so the panel loads on first intent (hover,
// focus, click or the shortcut) instead of riding in the root chunk.
let panelPromise: Promise<typeof import("./search-panel")> | undefined;
const loadPanel = () =>
  (panelPromise ??= import("./search-panel").catch((error: unknown) => {
    panelPromise = undefined;
    throw error;
  }));
const makePanel = () => lazy(() => loadPanel().then((m) => ({ default: m.SearchPanel })));
const InitialPanel = makePanel();
const preload = () => {
  void loadPanel().catch(() => {});
};

class SearchBoundary extends Component<
  { children: ReactNode; retry: () => void; close: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="p-5">
        <p role="alert" className="text-sm">
          Search could not load.
        </p>
        <div className="mt-3 flex gap-4">
          <button
            type="button"
            className="min-h-11 text-sm text-primary"
            onClick={this.props.retry}
          >
            Retry search
          </button>
          <button type="button" className="min-h-11 text-sm" onClick={this.props.close}>
            Close search
          </button>
        </div>
      </div>
    );
  }
}

/** Same footprint as the panel's input row, shown while the panel loads. */
function PanelFallback() {
  return (
    <div
      className="flex items-center gap-3 border-b border-border bg-bg-elevated px-4"
      aria-busy="true"
    >
      <SearchIcon className="size-4 text-fg-subtle" strokeWidth={1.75} />
      <span className="flex h-14 items-center text-sm text-fg-subtle">
        Search pages, products, and public repositories
      </span>
    </div>
  );
}

export function SiteSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [Panel, setPanel] = useState(() => InitialPanel);
  const [attempt, setAttempt] = useState(0);
  const navigate = useNavigate();

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
      preload();
      setOpen((value) => !value);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(hit: SearchHit) {
    setOpen(false);
    setQuery("");
    if (hit.external) {
      window.open(hit.href, "_blank", "noopener,noreferrer");
      return;
    }
    void navigate({ to: hit.href as never, search: hit.search as never, hash: hit.hash });
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
          onPointerEnter={preload}
          onFocus={preload}
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
        <SearchBoundary
          key={attempt}
          close={() => {
            setOpen(false);
            setQuery("");
          }}
          retry={() => {
            panelPromise = undefined;
            setPanel(() => makePanel());
            setAttempt((value) => value + 1);
          }}
        >
          <Suspense fallback={<PanelFallback />}>
            <Panel query={query} setQuery={setQuery} onSelect={go} />
          </Suspense>
        </SearchBoundary>
      </DialogContent>
    </Dialog>
  );
}
