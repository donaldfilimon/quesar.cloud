import { createFileRoute, Link } from "@tanstack/react-router";
import { RepoList } from "@/components/github/repo-list";
import { GithubStatusLine, SourcePanel } from "@/components/github/source-panel";
import {
  CodeBlock,
  CopyGrid,
  IntegrityList,
  JourneyRail,
  PageClose,
  PageHero,
  Section,
  Surface,
} from "@/components/site";
import { fieldNotesOffline } from "@/lib/mlai/categories/site-copy";
import { setups } from "@/lib/mlai/categories/surfaces";
import { pageHead } from "@/lib/seo";
import { staticSite } from "@/lib/static-site";

export const Route = createFileRoute("/developers")({
  head: () =>
    pageHead(
      "Source — Quesar, ABI, WDBX, Abbey",
      "MLAI source orientation: repository metadata, README excerpts, setup requirements, verification gates, and site integrity rules.",
    ),
  component: DevelopersPage,
});

function DevelopersPage() {
  return (
    <>
      <PageHero
        eyebrow="Source"
        title="The public tree is the documentation."
        lede="Live GitHub metadata and README excerpts from donaldfilimon when GitHub answers. Architecture diagrams, setup, and verification gates. There is no fabricated SDK. Where an API exists, it is in the source. Where it does not, it is marked planned."
      >
        <GithubStatusLine />
      </PageHero>
      <JourneyRail current="developers" />

      <Section eyebrow="Readmes" title="First paragraphs, pulled from GitHub when it answers.">
        <SourcePanel />
      </Section>

      <Section eyebrow="Repositories" title="Catalog, live stars, and recent public activity.">
        <RepoList />
      </Section>

      <Section eyebrow="Local development" title="Check each source tree on its own terms.">
        <div className="grid gap-4 lg:grid-cols-2">
          {setups.map((item) => (
            <Surface key={item.title}>
              <h3 className="font-display text-xl">{item.title}</h3>
              <p className="mt-2 text-sm text-fg-muted">{item.body}</p>
              {item.code ? (
                <div className="mt-4">
                  <CodeBlock code={item.code} label={item.title} />
                </div>
              ) : null}
              <Link
                to={item.href as never}
                className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-accent"
              >
                Read details
              </Link>
            </Surface>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="API direction"
        title="What you can call today vs. what is not a product yet."
      >
        <CopyGrid
          items={[
            {
              title: "Current in source",
              body: "ABI provides a Rust source tree with ./tools/cargo.sh and ./tools/check.sh, and MCP stdio plus an optional loopback HTTP listener. Separately, the experimental Quasar sidecar exposes a browser-paired local website-builder API, defaults to loopback, and requires authentication for API operations.",
            },
            {
              title: "Not published as a platform SDK",
              body: "Source does not establish a managed Quesar platform API, third-party SaaS SDK, or stable versioning across every crate. Quasar generation requires a configured provider; remote exposure and previews require the operator's network and HTTPS setup.",
            },
          ]}
        />
      </Section>

      <Section eyebrow="Integrity skill" title="The same rules this site is written under.">
        <p className="max-w-2xl text-sm leading-relaxed text-fg-muted">
          This site uses integrity rules for Apple framing, provenance, named repository licensing,
          and toolchain facts. Figures require a named source artifact and the appropriate measured,
          reported, or target tag. Repository toolchain claims follow the source README. The skill
          composer on this site is a browser preview; copied external-skill attribution has not been
          established.
        </p>
        <div className="mt-6">
          <IntegrityList />
        </div>
      </Section>
      <PageClose
        primary={{ to: "/architecture", label: "Architecture" }}
        secondary={[
          { to: "/investors", label: "Investors" },
          { to: "/skill-creator", label: "skill-creator" },
        ]}
        next={[
          {
            to: "/console",
            label: "Console",
            body: staticSite ? fieldNotesOffline : "Sign in and save what you observed on a node.",
          },
          { to: "/services", label: "Services", body: "Audit, design, build, harden." },
          { to: "/contact", label: "Contact", body: "The public path is source." },
        ]}
      />
    </>
  );
}
