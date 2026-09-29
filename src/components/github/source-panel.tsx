import { Link } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGithubData } from "@/lib/use-github-data";
import { README_NAMES } from "@/lib/github-readmes";
import { repos } from "@/lib/mlai/categories/repos";
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

/**
 * Until GitHub answers (and in the prerendered page, and if it never does),
 * the panel shows each repository's catalog summary: the same records the
 * repo list renders, so there is no second hand-kept copy to go stale.
 */
const catalogCards = README_NAMES.flatMap((name) => {
  const repo = repos.find((r) => r.name === name);
  return repo ? [{ name, excerpt: repo.summary }] : [];
});

export function SourcePanel() {
  const { data, loading, retry } = useGithubData();
  const live = data?.readmes ?? [];
  const cards: { name: string; excerpt: string; capturedAt?: string }[] = live.length
    ? live
    : catalogCards;
  const first = cards[0]?.name ?? "abi";

  return (
    <div className="min-w-0 overflow-hidden rounded-3xl bg-bg-elevated shadow-border">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <GithubSectionStatus
          status={data?.sections.readmes}
          loading={loading}
          label="READMEs"
          retry={retry}
        />
      </div>
      {!loading && !live.length ? (
        <p className="border-b border-border px-4 py-2 text-xs text-fg-muted">
          README excerpts could not be loaded, so each tab shows the repository's catalog summary.
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
              {card.capturedAt ? (
                <p className="mt-2 text-xs text-fg-subtle">
                  From the snapshot taken when this site was built,{" "}
                  <time dateTime={card.capturedAt}>
                    {new Date(card.capturedAt).toLocaleDateString()}
                  </time>
                  .
                </p>
              ) : null}
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
