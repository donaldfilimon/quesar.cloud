import { createFileRoute, Link } from "@tanstack/react-router";
import { PageClose, PageHero, RouteFrame, Section, Surface } from "@/components/site";
import { DocSidebar } from "@/components/site/doc-nav";
import { DocsHub } from "@/components/site/docs-hub";
import { docs } from "@/lib/mlai/categories/docs";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/docs")({
  head: () =>
    pageHead(
      "Docs — Quesar, ABI, WDBX",
      "Documentation for Quesar and ABI: getting started, runtime, personas, WDBX, MCP, and evidence.",
    ),
  component: DocsPage,
});

function DocsPage() {
  return (
    <RouteFrame>
      <PageHero
        eyebrow="Docs"
        title="Start with the source. Stay on the site."
        lede="Sidebar, search, and articles are the same corpus. Setup commands are copied from READMEs. A successful gate is evidence for that checkout — not for a hosted product."
      />
      <Section>
        <div className="grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <DocSidebar />
          <div className="grid gap-4">
            {docs.map((doc) => (
              <div key={doc.slug} id={doc.slug === "getting-started" ? "intro" : doc.slug}>
                <Surface>
                  <p className="text-xs text-accent">{doc.group}</p>
                  <h2 className="mt-2 font-display text-2xl">
                    <Link to="/docs/$slug" params={{ slug: doc.slug }} className="text-fg no-underline hover:underline">
                      {doc.title}
                    </Link>
                  </h2>
                  <p className="mt-3 max-w-[66ch] text-base leading-7 text-fg">{doc.description}</p>
                  <p className="mt-3 text-xs text-fg-subtle">
                    {Math.max(
                      1,
                      Math.round(
                        doc.body
                          .flatMap((section) => [...(section.paragraphs ?? []), ...(section.list ?? [])])
                          .join(" ")
                          .split(/\s+/)
                          .filter(Boolean).length / 220,
                      ),
                    )}{" "}
                    min read
                  </p>
                </Surface>
              </div>
            ))}
            <div className="mt-12 border-t border-border pt-12">
              <DocsHub />
            </div>
          </div>
        </div>
      </Section>
      <PageClose
        primary={{ to: "/get-started", label: "Get started" }}
        next={[
          { to: "/architecture", label: "Architecture", body: "The same layers, as a diagram." },
          { to: "/developers", label: "Developers", body: "Live READMEs when GitHub answers." },
        ]}
      />
    </RouteFrame>
  );
}
