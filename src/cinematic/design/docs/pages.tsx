/* MLAI docs — sample pages built from the DocsContent primitives. Split out of
   DocsContent.tsx so that module exports only components (fast refresh); this
   file exports no components, only the PAGES data. */
import { Callout, CodeBlock, H2, IC, P, ParamTable, type DocPage } from "./DocsContent";

export const PAGES: Record<string, DocPage> = {
  quickstart: {
    eyebrow: "Getting started",
    title: "Quickstart",
    toc: [
      ["install", "Install"],
      ["first-index", "Verify the index"],
      ["next", "Next steps"],
    ],
    body: () => (
      <>
        <P>
          This is a <strong style={{ color: "var(--text)" }}>concept docs board</strong>. Inspect the intended data boundary and execution path before making a deployment claim.
        </P>
        <Callout kind="proof" title="Source inspection / scoped integrity">
          WDBX has predecessor-link checks and strict stored-content hash checks. Hash links are not digital signatures. This board is not a live settings service.
        </Callout>
        <H2 id="install">Build from source</H2>
        <P>
          These source commands are illustrative. Check the intended revision and its declared gate before running them:
        </P>
        <CodeBlock
          label="shell"
          code={`git clone https://github.com/donaldfilimon/wdbx.git\ncd wdbx\ncargo test --workspace`}
        />
        <H2 id="first-index">Verify the index</H2>
        <P>
          Qualification needs a reproducible workload and comparison against an exact reference. Commands displayed here do not establish that those tests have passed.
        </P>
        <CodeBlock
          label="shell"
          code={`cargo test -p abi-wdbx --lib hnsw\ncargo test -p abi-wdbx --test real_store`}
        />
        <H2 id="next">Next steps</H2>
        <P>
          Tune recall vs. latency on the <IC>WDBX · HNSW</IC> page, or wire the personas with the{" "}
          <IC>ABI Framework</IC>.
        </P>
      </>
    ),
  },
  wdbx: {
    eyebrow: "WDBX",
    title: "The vector runtime",
    toc: [
      ["model", "Storage model"],
      ["integrity", "Verifiable memory"],
      ["concurrency", "Concurrency"],
    ],
    body: () => (
      <>
        <P>
          WDBX source contains CRC-framed write-ahead records, snapshots and recovery paths. Source inspection does not establish runtime or security acceptance.
        </P>
        <H2 id="model">Storage model</H2>
        <P>
          Durable storage and recovery paths need failure-path qualification. Distributed deployment is a separate acceptance question.
        </P>
        <Callout kind="info" title="Replication">
          This concept board does not establish a hosted multi-node service.
        </Callout>
        <H2 id="integrity">Verifiable memory</H2>
        <P>
          Strict verification recomputes stored block hashes. Link-only verification checks predecessor links. Neither proves that an entire chain cannot be rewritten.
        </P>
        <CodeBlock
          label="shell"
          code={`cargo test -p abi-wdbx --lib hash\ncargo test -p abi-wdbx --lib durable`}
        />
        <H2 id="concurrency">Concurrency</H2>
        <P>
          Concurrency behavior needs evidence on the intended execution path. This layout does not establish lock-free operation or nonblocking guarantees.
        </P>
      </>
    ),
  },
  hnsw: {
    eyebrow: "WDBX",
    title: "HNSW parameters",
    toc: [
      ["build", "Build parameters"],
      ["query", "Query parameters"],
      ["guidance", "Guidance"],
    ],
    body: () => (
      <>
        <P>
          A concept layout for exploring graph-search parameters.
        </P>
        <H2 id="build">Build parameters</H2>
        <ParamTable
          rows={[
            ["M", "16", "Illustrative edge budget"],
            ["ef_construction", "40", "Illustrative construction candidate budget"],
            ["metric", "cosine", "Illustrative metric choice; evaluate against the workload"],
          ]}
        />
        <H2 id="query">Query parameters</H2>
        <ParamTable
          rows={[
            ["k", "10", "Illustrative requested neighbor count"],
            ["ef", "32", "Illustrative query candidate budget"],
          ]}
        />
        <H2 id="guidance">Guidance</H2>
        <Callout kind="warn" title="Illustrative guidance">
          Choose the metric and search breadth against the intended data and measured recall; these sample settings are not a recommendation.
        </Callout>
        <P>
          Numbers above are sample settings for this layout, not verified runtime defaults or benchmarks. Measure the intended workload.
        </P>
      </>
    ),
  },
  personas: {
    eyebrow: "Personas",
    title: "Three profiles, one system",
    toc: [
      ["abi", "Abi · moderator"],
      ["abbey", "Abbey · polymath"],
      ["aviva", "Aviva · expert"],
    ],
    body: () => (
      <>
        <P>
          ABI defines three profile contracts. <IC>Abbey</IC> is the neutral routing prior. A local keyword routing path exists, and explicit selection can bypass scoring.
        </P>
        <H2 id="abi">ABI · Orchestration Profile</H2>
        <Callout kind="info" title="Cyan · interactive">
          Neutral and balanced; the connective tissue. "Routing this to Abbey — it reads as a learning question
          with some frustration."
        </Callout>
        <H2 id="abbey">Abbey · Empathic Polymath</H2>
        <Callout kind="proof" title="Emerald · conversational">
          Warm, scaffolds with metaphor before precision. "Think of a vector database as a library that files
          books by meaning, not title."
        </Callout>
        <H2 id="aviva">Aviva · Direct Technical Profile</H2>
        <Callout kind="warn" title="Violet · technical">
          Direct and technically precise; uncertainty remains explicit. "Choose the metric and search breadth against the intended data and measured recall; these sample settings are not a recommendation."
        </Callout>
      </>
    ),
  },
};
