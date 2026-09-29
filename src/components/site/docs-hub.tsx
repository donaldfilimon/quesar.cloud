import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { research } from "@/lib/mlai/categories/research";
import { docsHub } from "@/lib/mlai/pages";
import { CopyGrid, NamedGrid } from "./catalog";
import { Callout, CodeBlock, PullQuote, SpecList, StepList } from "./lab";
import { Surface } from "./section";
import { StatusBadge } from "./status-badge";
import { headingId } from "@/lib/utils";
import {
  DOCS_HUB_ANCHORS,
  DOCS_HUB_SECTIONS,
  docsHubSection,
  type DocsHubSection,
} from "./docs-hub-anchors";

/**
 * The reference half of mlai's `src/views/Docs.tsx` hub: capabilities, runtime
 * build and module map, routing signals, WDBX downloads, MCP tools, site
 * configuration and the API surfaces. The articles in `docs.ts` carry the
 * narrative; this is the material they did not.
 *
 * Each section belongs to one article (`DOCS_HUB_SECTIONS`, keyed by doc
 * slug). `DocsHub` renders them all on /docs under `ref-<slug>` anchors,
 * because the article cards on that page already use the bare slugs;
 * `DocReference` renders one below its article on /docs/<slug>.
 */

type Placement = "hub" | "article";

function RefSection({
  section,
  placement,
  children,
}: {
  section: DocsHubSection;
  placement: Placement;
  children: ReactNode;
}) {
  const id = placement === "hub" ? `ref-${section.slug}` : headingId(section.title);
  const Heading = placement === "hub" ? "h3" : "h2";
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mt-16 scroll-mt-28">
      <p className="text-xs text-accent">{section.group}</p>
      <Heading id={`${id}-title`} className="mt-2 font-display text-2xl tracking-tight">
        {section.title}
      </Heading>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted">{section.lede}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function PaperLink({ to, children }: { to: string; children: string }) {
  return (
    <Link
      to={to}
      className="mt-6 inline-flex items-center gap-1.5 text-xs text-accent no-underline hover:underline"
    >
      {children}
      <ArrowRight className="size-3" aria-hidden="true" />
    </Link>
  );
}

function RuntimeReference({ placement }: { placement: Placement }) {
  const Sub = placement === "hub" ? "h4" : "h3";
  return (
    <>
      <CodeBlock code={docsHub.runtimeCommands} label="donaldfilimon/abi" />
      <div className="mt-6 grid gap-6">
        <SpecList rows={docsHub.runtimeSpec} />
        <NamedGrid items={docsHub.moduleMap} nameClass="text-accent" />
      </div>
      <Sub className="mt-8 font-display text-lg">Design decisions</Sub>
      <div className="mt-4">
        <CopyGrid items={docsHub.designDecisions} columns="md:grid-cols-3" />
      </div>
    </>
  );
}

function PersonasReference({ placement }: { placement: Placement }) {
  const Sub = placement === "hub" ? "h4" : "h3";
  return (
    <>
      <CopyGrid items={docsHub.routingSignals} columns="md:grid-cols-3" />
      <Callout label="Authority boundary" className="mt-6">
        A persona name is not an authorization mechanism. Execution and admission controls enforce
        their own policy checks independently of the selected profile.
      </Callout>
      <Sub className="mt-8 font-display text-lg">Abbey's voice</Sub>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted">
        Abbey is the profile you hear most in explanation and review, so her voice sets the tone for
        the framework: Intelligence Without Limits, gated by policy. She says what she knows and
        what she doesn't, and will not claim unlimited or AGI capability, unverified benchmarks, or
        Quesar as a bot feature.
      </p>
      <PullQuote className="mt-6">“Care first. Clarity always. Competence throughout.”</PullQuote>
      <div className="mt-6">
        <CopyGrid items={docsHub.abbeyPrinciples} columns="md:grid-cols-3" />
      </div>
      <PaperLink to="/research/policy-locked-tool-use-multi-agent">
        Read the paper: policy-locked tool use
      </PaperLink>
    </>
  );
}

function WdbxReference() {
  return (
    <>
      <CopyGrid items={docsHub.wdbxCapabilities} />
      <Callout label="Fail closed" className="mt-6">
        The Rust workspace links WDBX directly. Storage, authentication, and admission failures must
        be explicit; legacy disabled-feature flags are not the current runtime boundary.
      </Callout>
      <PaperLink to="/research/wdbx-weighted-backtrace-memory-store">
        Read the paper: WDBX weighted-backtrace store
      </PaperLink>
    </>
  );
}

function WdbxV2Reference() {
  const attachments = research.publications.flatMap((publication) => publication.attachments);
  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {docsHub.wdbxV2Docs.map((doc) => (
          <li key={doc.file}>
            <a
              href={`/docs/wdbx/${doc.file}`}
              download
              className="surface surface-hover block h-full p-4 no-underline"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-fg">{doc.label}</span>
                <span className="font-mono text-2xs text-fg-subtle">.md ↓</span>
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-fg-muted">{doc.body}</span>
            </a>
          </li>
        ))}
      </ul>
      <ul className="mt-6 flex flex-wrap gap-3">
        {attachments.map((attachment) => (
          <li key={attachment.url}>
            <a
              href={attachment.url}
              download
              className="surface surface-hover inline-flex flex-col gap-1 px-4 py-3 no-underline"
            >
              <span className="text-sm text-fg">{attachment.title} (PDF)</span>
              <span className="text-xs text-fg-muted">
                {attachment.edition === "historical" ? "Historical edition" : "Current edition"} ·{" "}
                {attachment.date}
              </span>
            </a>
          </li>
        ))}
      </ul>
      <PaperLink to="/blog/wdbx-v2-release">Read the release note: WDBX V2</PaperLink>
    </>
  );
}

function McpReference({ placement }: { placement: Placement }) {
  const Sub = placement === "hub" ? "h4" : "h3";
  return (
    <>
      <SpecList rows={docsHub.mcpSpec} />
      <Sub className="mt-8 font-display text-lg">Tools</Sub>
      <div className="mt-4">
        <NamedGrid
          items={docsHub.mcpTools}
          nameClass="text-accent"
          columns="sm:grid-cols-2 lg:grid-cols-3"
        />
      </div>
    </>
  );
}

function DeploymentReference() {
  return <StepList steps={docsHub.deploymentSteps} />;
}

function ApiReference() {
  return (
    <ul className="grid gap-3">
      {docsHub.apiSurfaces.map((item) => (
        <li key={item.name}>
          <Surface className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-sm text-fg">{item.name}</p>
              <StatusBadge status={item.status} />
            </div>
            <p className="mt-1 text-sm text-fg-muted">{item.body}</p>
          </Surface>
        </li>
      ))}
    </ul>
  );
}

const REFERENCE_BODY: Record<
  DocsHubSection["slug"],
  (props: { placement: Placement }) => ReactNode
> = {
  runtime: RuntimeReference,
  personas: PersonasReference,
  wdbx: WdbxReference,
  "wdbx-v2": WdbxV2Reference,
  mcp: McpReference,
  deployment: DeploymentReference,
  api: ApiReference,
};

function Reference({ section, placement }: { section: DocsHubSection; placement: Placement }) {
  const Body = REFERENCE_BODY[section.slug];
  return (
    <RefSection section={section} placement={placement}>
      <Body placement={placement} />
    </RefSection>
  );
}

/** The reference section belonging to one article, or nothing if it has none. */
export function DocReference({ slug }: { slug: string }) {
  const section = docsHubSection(slug);
  return section ? <Reference section={section} placement="article" /> : null;
}

export function DocsHub() {
  return (
    <div>
      <h2 id="reference" className="scroll-mt-28 font-display text-3xl tracking-tight">
        {docsHub.title}
      </h2>
      <p className="mt-4 max-w-[66ch] text-base leading-7 text-fg">{docsHub.lede}</p>
      <nav aria-label="Reference sections" className="mt-6 flex flex-wrap gap-2">
        {DOCS_HUB_ANCHORS.map((anchor) => (
          <a
            key={anchor.id}
            href={`#${anchor.id}`}
            className="inline-flex h-9 items-center rounded-full bg-muted px-3 font-mono text-2xs text-muted-foreground no-underline hover:text-foreground"
          >
            {anchor.label}
          </a>
        ))}
      </nav>
      <div className="mt-8">
        <CopyGrid items={docsHub.capabilities} />
      </div>
      {DOCS_HUB_SECTIONS.map((section) => (
        <Reference key={section.slug} section={section} placement="hub" />
      ))}
    </div>
  );
}
