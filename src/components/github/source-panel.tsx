import { Link } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGithubData } from "@/lib/use-github-data";
import { GithubSectionStatus } from "./section-status";
import { pathForRepo } from "@/lib/catalog";

export function GithubStatusLine() {
  const { data, loading, retry } = useGithubData();
  return (
    <div className="mt-6">
      <GithubSectionStatus
        status={data?.sections.readmes}
        loading={loading}
        label="READMEs"
        retry={retry}
      />
    </div>
  );
}

export function SourcePanel() {
  const { data, loading, retry } = useGithubData();
  const cards = data?.readmes ?? [];
  const first = cards[0]?.name ?? "abi";

  return (
    <div className="min-w-0 overflow-hidden rounded-18 bg-bg-elevated shadow-border">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <GithubSectionStatus
          status={data?.sections.readmes}
          loading={loading}
          label="READMEs"
          retry={retry}
        />
      </div>
      {!loading && !cards.length ? (
        <p className="px-5 py-6 text-sm text-fg-muted">
          No README excerpts could be loaded. Every repository still has its page in the{" "}
          <Link to="/source" className="text-accent">
            source catalog
          </Link>
          .
        </p>
      ) : null}
      {cards.length ? (
        <Tabs defaultValue={first} key={first}>
          <TabsList aria-label="Repositories">
            {cards.map((item) => (
              <TabsTrigger key={item.name} value={item.name}>
                {item.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {cards.map((card) => (
            <TabsContent key={card.name} value={card.name} className="p-5 sm:p-6">
              <h3 className="font-display text-2xl tracking-tight">{card.name}</h3>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted">{card.excerpt}</p>
              <Link
                to={pathForRepo(card.name) as never}
                className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-accent"
              >
                Open {card.name}
              </Link>
            </TabsContent>
          ))}
        </Tabs>
      ) : null}
    </div>
  );
}
