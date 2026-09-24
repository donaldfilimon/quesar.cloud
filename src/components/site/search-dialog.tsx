import { Search as SearchIcon } from "lucide-react";
import { lazy, Suspense, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TRIGGER_ATTR } from "./header-menus-loader";
import type { Hit } from "./search-panel";
import { loadSearchPanel } from "./search-panel-loader";

// Loaded after hydration with the header's other overlays (see
// header-menus-loader.ts); `SiteSearch` renders a plain trigger with the same
// markup until then.

const SearchPanel = lazy(() => loadSearchPanel().then((m) => ({ default: m.SearchPanel })));

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
  onSelect: (hit: Hit) => void;
  triggerClassName: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={triggerClassName}
          aria-label="Search the site"
          {...{ [TRIGGER_ATTR]: "search" }}
          onPointerEnter={() => void loadSearchPanel()}
          onFocus={() => void loadSearchPanel()}
        >
          {children}
        </button>
      </DialogTrigger>
      <DialogContent showClose={false} aria-describedby={undefined} className="p-0">
        <DialogTitle className="sr-only">Search Quesar and MLAI</DialogTitle>
        <DialogDescription className="sr-only">
          Jump to architecture nodes, products, docs, and public repositories.
        </DialogDescription>
        <Suspense fallback={<PanelFallback />}>
          <SearchPanel query={query} setQuery={setQuery} onSelect={onSelect} />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}
