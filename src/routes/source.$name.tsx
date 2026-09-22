import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CellMachine } from "@/components/apps/cell-machine";
import { PageClose, PageHero, Section, Surface } from "@/components/site";
import { StatusBadge } from "@/components/site/status-badge";
import { pathForRepo, repoDocs, repoPaths } from "@/lib/catalog";
import { loadGithubData, type LiveRepo } from "@/lib/github";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/source/$name")({
  head: ({ params }) => {
    const name = params.name;
    const doc = repoDocs[name] ?? repoDocs[name.toLowerCase()];
    return pageHead(`${doc?.title ?? name} — Source`, doc?.lede ?? `Public repository ${name}, described on this site.`);
  },
  component: SourceRepoPage,
});

function SourceRepoPage() {
  const { name } = Route.useParams();
  const decoded = decodeURIComponent(name);
  const canonical = pathForRepo(decoded);
  const doc = repoDocs[decoded] ?? repoDocs[decoded.toLowerCase()];
  const [live, setLive] = useState<LiveRepo | null>(null);

  useEffect(() => {
    void loadGithubData().then((payload) => {
      setLive(payload.repos.find((row) => row.name === decoded) ?? null);
    });
  }, [decoded]);

  if (canonical !== `/source/${encodeURIComponent(decoded)}` && repoPaths[decoded]) {
    return (
      <Section>
        <p className="text-sm text-fg-muted">This repository has a product page.</p>
        <Link to={canonical as never} className="mt-4 inline-flex text-accent">
          Open {decoded}
        </Link>
      </Section>
    );
  }

  return (
    <>
      <PageHero
        eyebrow="Source"
        title={doc?.title ?? decoded}
        lede={live?.description || doc?.lede || "Public repository. Described here so the catalog is complete without sending you away."}
      >
        <div className="mt-6 flex flex-wrap gap-3">
          {doc ? <StatusBadge status={doc.status} /> : <StatusBadge status="research" />}
          <span className="font-mono text-sm text-fg-subtle">{live?.language ?? doc?.language ?? "public"}</span>
        </div>
      </PageHero>
      <Section>
        {doc?.sections.map((section) => (
          <Surface key={section.title} className="mb-4">
            <h3 className="font-display text-xl">{section.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">{section.body}</p>
          </Surface>
        ))}
        {decoded === "cell-machine" ? (
          <div className="mt-8">
            <CellMachine />
          </div>
        ) : null}
        {live ? (
          <p className="mt-6 font-mono text-[11px] text-fg-subtle">
            {live.stars} stars · updated {live.updated.slice(0, 10)}
          </p>
        ) : null}
      </Section>
      <PageClose
        primary={{ to: "/source", label: "Source catalog" }}
        next={[{ to: "/developers", label: "Developers", body: "Live READMEs when GitHub answers." }]}
      />
    </>
  );
}
