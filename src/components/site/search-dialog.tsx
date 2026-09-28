import { Search as SearchIcon } from "lucide-react";
import { Component, lazy, Suspense, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { SearchHit } from "@/lib/site-search";
import { TRIGGER_ATTR } from "./header-menus-loader";
import { loadSearchPanel, preloadSearchPanel, resetSearchPanel } from "./search-panel-loader";

// Loaded after hydration with the header's other overlays (see
// header-menus-loader.ts); `SiteSearch` renders a plain trigger with the same
// markup until then.

const makePanel = () => lazy(loadSearchPanel);
const InitialPanel = makePanel();

/** Contains a failed panel or catalog load inside the dialog, with a retry. */
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

/** The site search dialog; `children` is the trigger's content. */
export function SearchDialog({
  open,
  onOpenChange,
  query,
  setQuery,
  onSelect,
  triggerClassName,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  setQuery: (query: string) => void;
  onSelect: (hit: SearchHit) => void;
  triggerClassName: string;
  children: ReactNode;
}) {
  // A fresh lazy component per retry: React keeps a rejected lazy rejected.
  const [Panel, setPanel] = useState(() => InitialPanel);
  const [attempt, setAttempt] = useState(0);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={triggerClassName}
          aria-label="Search the site"
          {...{ [TRIGGER_ATTR]: "search" }}
          onPointerEnter={preloadSearchPanel}
          onFocus={preloadSearchPanel}
        >
          {children}
        </button>
      </DialogTrigger>
      <DialogContent showClose={false} aria-describedby={undefined} className="p-0">
        <DialogTitle className="sr-only">Search Quesar and MLAI</DialogTitle>
        <DialogDescription className="sr-only">
          Jump to architecture nodes, products, docs, and public repositories.
        </DialogDescription>
        <SearchBoundary
          key={attempt}
          close={() => onOpenChange(false)}
          retry={() => {
            resetSearchPanel();
            setPanel(() => makePanel());
            setAttempt((value) => value + 1);
          }}
        >
          <Suspense fallback={<PanelFallback />}>
            <Panel query={query} setQuery={setQuery} onSelect={onSelect} />
          </Suspense>
        </SearchBoundary>
      </DialogContent>
    </Dialog>
  );
}
