import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { research } from "@/lib/mlai";
import { docsHub } from "@/lib/mlai/pages";
import { CopyGrid, NamedGrid } from "./catalog";
import { Callout, CodeBlock, PullQuote, SpecList, StepList } from "./lab";
import { Surface } from "./section";
import { StatusBadge } from "./status-badge";
import { DOCS_HUB_ANCHORS } from "./docs-hub-anchors";

/**
 * The reference half of mlai's `src/views/Docs.tsx` hub: capabilities, runtime
 * build and module map, routing signals, WDBX downloads, MCP tools, the
 * deployment checklist and the API surfaces. The articles in `docs.ts`
 * already carry the narrative; this is the material they did not.
 *
 * Section ids are prefixed `ref-` because the article cards on the same page
 * already use the bare slugs (`runtime`, `wdbx`, `mcp`, ...).
 */

function RefSection({ id, group, title, lede, children }: { id: string; group: string; title: string; lede?: string; children: ReactNode }) {
  return (
    <section id={`ref-${id}`} aria-labelledby={`ref-${id}-title`} className="mt-16 scroll-mt-28">
      <p className="font-mono text-[0.68rem] tracking-[0.16em] text-accent uppercase">{group}</p>
      <h3 id={`ref-${id}-title`} className="mt-2 font-display text-2xl tracking-tight">
        {title}
      </h3>
      {lede ? <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted">{lede}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function PaperLink({ to, children }: { to: string; children: string }) {
  return (
    <Link
      to={to}
      className="mt-6 inline-flex items-center gap-1.5 font-mono text-xs tracking-widest text-accent uppercase no-underline hover:underline"
    >
      {children}
      <ArrowRight className="size-3" aria-hidden="true" />
    </Link>
  );
}

export function DocsHub() {
  const attachments = research.publications.flatMap((publication) => publication.attachments);
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
            className="inline-flex h-9 items-center rounded-full bg-muted px-3 font-mono text-[11px] text-muted-foreground no-underline hover:text-foreground"
          >
            {anchor.label}
          </a>
        ))}
      </nav>
      <div className="mt-8">
        <CopyGrid items={docsHub.capabilities} />
      </div>

      <RefSection
        id="runtime"
        group="Start"
        title="ABI runtime"
        lede="ABI is a Rust framework for local AI orchestration, semantic vector storage, and GPU capability reporting. Build the CLI and MCP server with the repository's pinned toolchain and the ./tools/cargo.sh wrapper."
      >
        <CodeBlock code={docsHub.runtimeCommands} label="donaldfilimon/abi" />
        <div className="mt-6 grid gap-6">
          <SpecList rows={docsHub.runtimeSpec} />
          <NamedGrid items={docsHub.moduleMap} nameClass="text-accent" />
        </div>
        <h4 className="mt-8 font-display text-lg">Design decisions</h4>
        <div className="mt-4">
          <CopyGrid items={docsHub.designDecisions} columns="md:grid-cols-3" />
        </div>
      </RefSection>

      <RefSection
        id="personas"
        group="Architecture"
        title="How a profile is selected"
        lede="An explicit leading persona address takes precedence. Otherwise, token-prefix signals adjust a prior and the runtime normalizes the resulting weights before selecting the largest. The distribution describes routing preference, not model quality, authorization, or a parallel-execution strategy."
      >
        <CopyGrid items={docsHub.routingSignals} columns="md:grid-cols-3" />
        <Callout label="Authority boundary" className="mt-6">
          A persona name is not an authorization mechanism. Execution and admission controls enforce their own policy
          checks independently of the selected profile.
        </Callout>
        <h4 className="mt-8 font-display text-lg">Abbey's voice</h4>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted">
          Abbey is the profile you hear most in explanation and review, so her voice sets the tone for the framework:
          Intelligence Without Limits, gated by policy. She says what she knows and what she doesn't, and will not claim
          unlimited or AGI capability, unverified benchmarks, or Quesar as a bot feature.
        </p>
        <PullQuote className="mt-6">“Care first. Clarity always. Competence throughout.”</PullQuote>
        <div className="mt-6">
          <CopyGrid items={docsHub.abbeyPrinciples} columns="md:grid-cols-3" />
        </div>
        <PaperLink to="/research/policy-locked-tool-use-multi-agent">Read the paper: policy-locked tool use</PaperLink>
      </RefSection>

      <RefSection
        id="wdbx"
        group="Architecture"
        title="WDBX retrieval"
        lede="WDBX is the Weighted Directed Backtrace eXecution store. It keeps context as weighted paths so retrieval can be inspected, not just ranked: key-value, vector, and block surfaces, with snapshot persistence guarded by SHA-256 integrity checks."
      >
        <CopyGrid items={docsHub.wdbxCapabilities} />
        <Callout label="Fail closed" className="mt-6">
          The Rust workspace links WDBX directly. Storage, authentication, and admission failures must be explicit; legacy
          disabled-feature flags are not the current runtime boundary.
        </Callout>
        <PaperLink to="/research/wdbx-weighted-backtrace-memory-store">Read the paper: WDBX weighted-backtrace store</PaperLink>
      </RefSection>

      <RefSection
        id="wdbx-v2"
        group="Architecture"
        title="Historical WDBX V2 documentation"
        lede="This frozen Zig-era documentation mirror is retained for historical reference. It is not the current Rust implementation guide; claims in it require revalidation against the Rust substrate."
      >
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {docsHub.wdbxV2Docs.map((doc) => (
            <li key={doc.file}>
              <a href={`/docs/wdbx/${doc.file}`} download className="surface surface-hover block h-full p-4 no-underline">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-fg">{doc.label}</span>
                  <span className="font-mono text-[10px] text-fg-subtle">.md ↓</span>
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-fg-muted">{doc.body}</span>
              </a>
            </li>
          ))}
        </ul>
        <ul className="mt-6 flex flex-wrap gap-3">
          {attachments.map((attachment) => (
            <li key={attachment.url}>
              <a href={attachment.url} download className="surface surface-hover inline-flex flex-col gap-1 px-4 py-3 no-underline">
                <span className="text-sm text-fg">{attachment.title} (PDF)</span>
                <span className="text-xs text-fg-muted">
                  {attachment.edition === "historical" ? "Historical edition" : "Current edition"} · {attachment.date}
                </span>
              </a>
            </li>
          ))}
        </ul>
        <PaperLink to="/blog/wdbx-v2-release">Read the release note: WDBX V2</PaperLink>
      </RefSection>

      <RefSection
        id="mcp"
        group="Architecture"
        title="MCP server"
        lede="The abi-mcp server speaks JSON-RPC 2.0 over stdio. Its loopback HTTP compatibility listener is not a persistent, conforming MCP HTTP+SSE transport."
      >
        <SpecList rows={docsHub.mcpSpec} />
        <h4 className="mt-8 font-display text-lg">Tools</h4>
        <div className="mt-4">
          <NamedGrid items={docsHub.mcpTools} nameClass="text-accent" columns="sm:grid-cols-2 lg:grid-cols-3" />
        </div>
      </RefSection>

      <RefSection
        id="deployment"
        group="Operations"
        title="Deployment checklist"
        lede="For this site. Each missing value produces a clear &quot;not configured&quot; state, never a crash."
      >
        <StepList steps={docsHub.deploymentSteps} />
      </RefSection>

      <RefSection
        id="api"
        group="Reference"
        title="What this site exposes"
        lede="Protected surfaces require a Better Auth session and fail closed. There is no public hosted assistant API."
      >
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
      </RefSection>
    </div>
  );
}
