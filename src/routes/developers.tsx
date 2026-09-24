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
import { setups } from "@/lib/content";
import { pageHead } from "@/lib/seo";
import { staticSite } from "@/lib/static-site";

export const Route = createFileRoute("/developers")({
  head: () =>
    pageHead(
      "Source — Quesar, ABI, WDBX, Abbey",
      "Public GitHub for MLAI and Quesar: live repository metadata, README excerpts, local setup, verification gates, and skill-creator integrity rules.",
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
              body: "ABI public tree (nightly Rust) with ./tools/cargo.sh and ./tools/check.sh. MCP server (stdio, optional loopback HTTP). Twelve contract-covered MCP tools, including wdbx_query and gpu_status. Local site-builder HTTP API on a trusted LAN (no auth).",
            },
            {
              title: "Not published as a platform SDK",
              body: "A hosted Quesar HTTP API. Client SDKs for third-party SaaS integration. Guaranteed stable versioning across all crates. Deploy adapters and authentication for the local Quasar builder.",
            },
          ]}
        />
      </Section>

      <Section eyebrow="Integrity skill" title="The same rules this site is written under.">
        <p className="max-w-2xl text-sm leading-relaxed text-fg-muted">
          <Link to="/skill-creator" className="text-accent">
            skill-creator
          </Link>{" "}
          is the public agent skill for creating skills and shipping the company site without
          breaking Apple framing, provenance tags, Apache-2.0, or toolchain facts. New numbers that
          are not in that skill's master reference do not ship. Toolchain claims follow each
          repository README — ABI is nightly Rust, not Zig.
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
            body: staticSite
              ? "Field notes need the server deployment."
              : "Sign in and save what you observed on a node.",
          },
          { to: "/services", label: "Services", body: "Audit, design, build, harden." },
          { to: "/contact", label: "Contact", body: "The public path is source." },
        ]}
      />
    </>
  );
}
