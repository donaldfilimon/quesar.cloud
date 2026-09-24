import { Command } from "cmdk";
import { Search as SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import {
  destinationKey,
  rankHits,
  searchCategories,
  type SearchCategory,
  type SearchHit,
} from "@/lib/site-search";

export function SearchPanel({
  catalog,
  query,
  setQuery,
  onSelect,
}: {
  catalog: SearchHit[];
  query: string;
  setQuery: (value: string) => void;
  onSelect: (hit: SearchHit) => void;
}) {
  const [category, setCategory] = useState<SearchCategory>("all");
  const hits = useMemo(() => rankHits(catalog, query, category), [catalog, query, category]);
  return (
    <Command shouldFilter={false} className="bg-bg-elevated text-fg">
      <div className="flex items-center gap-3 border-b border-border px-4">
        <SearchIcon className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
        <Command.Input
          autoFocus
          aria-label="Search pages, products, and public repositories"
          value={query}
          onValueChange={setQuery}
          placeholder="Search the site"
          className="h-14 min-w-0 w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
        />
      </div>
      <div className="border-b border-border px-4 py-2">
        <label className="flex items-center gap-3 text-sm">
          Category
          <select
            aria-label="Category"
            value={category}
            onChange={(event) => setCategory(event.target.value as SearchCategory)}
            className="min-w-0 flex-1 rounded-sm border border-border bg-bg px-2 py-2 text-fg"
          >
            {searchCategories.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Command.List className="max-h-[min(24rem,50dvh)] overflow-y-auto py-2">
        <Command.Empty className="px-4 py-6 text-sm text-fg-muted">
          No pages match that query.
        </Command.Empty>
        {hits.map((hit) => (
          <Command.Item
            key={destinationKey(hit)}
            value={destinationKey(hit)}
            onSelect={() => onSelect(hit)}
            className="flex cursor-pointer flex-col items-start gap-0.5 px-4 py-3 data-[selected=true]:bg-bg-subtle"
          >
            <span className="text-xs text-fg-subtle">{hit.group}</span>
            <span className="text-sm font-medium text-fg">{hit.title}</span>
            <span className="line-clamp-1 text-xs text-fg-muted">{hit.body}</span>
          </Command.Item>
        ))}
      </Command.List>
      {hits.length === 0 ? (
        <button
          type="button"
          className="m-4 min-h-11 text-sm text-primary"
          onClick={() => {
            setCategory("all");
            setQuery("");
          }}
        >
          Clear filters
        </button>
      ) : null}
    </Command>
  );
}
