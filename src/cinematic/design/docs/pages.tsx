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
          MLAI runs <strong style={{ color: "var(--text)" }}>local-first</strong>: the WDBX runtime, the ABI
          framework and the personas all execute on your own infrastructure. Nothing leaves the device unless
          you opt in.
        </P>
        <Callout kind="proof" title="Private by default">
          Telemetry is off until you enable it in Settings. Every memory write is SHA-256-chained and verified
          on read.
        </Callout>
        <H2 id="install">Build from source</H2>
        <P>
          WDBX is a Rust workspace consumed by ABI and Abbey through sibling path dependencies. Clone the
          public source and run its declared verification gate:
        </P>
        <CodeBlock
          label="shell"
          code={`git clone https://github.com/donaldfilimon/wdbx.git\ncd wdbx\ncargo test --workspace`}
        />
        <H2 id="first-index">Verify the index</H2>
        <P>
          The real-store integration test rebuilds a layered HNSW graph from stored vectors, validates the
          graph, and compares approximate search with the exact index.
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
          WDBX is a purpose-built vector-database runtime — HNSW search, durable WAL-backed storage,
          SHA-256-chained history and lock-free MVCC concurrency. Memory you can verify.
        </P>
        <H2 id="model">Storage model</H2>
        <P>
          Each store rebuilds its HNSW graph from a durable snapshot and records writes through a CRC-framed
          write-ahead log. Cluster support provides replication and read repair; it is not production sharding.
        </P>
        <Callout kind="info" title="Replication">
          Replication and read repair are substrate capabilities, not a claim of a hosted multi-node service.
        </Callout>
        <H2 id="integrity">Verifiable memory</H2>
        <P>
          Every write is hashed and chained to its predecessor. Tamper with one block and the chain rejects
          everything downstream on the next read.
        </P>
        <CodeBlock
          label="shell"
          code={`cargo test -p abi-wdbx --lib hash\ncargo test -p abi-wdbx --lib durable`}
        />
        <H2 id="concurrency">Concurrency</H2>
        <P>
          Readers never block writers. <IC>wdbx</IC> uses lock-free MVCC: each query sees a consistent snapshot
          while upserts proceed.
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
          Hierarchical Navigable Small World graphs trade memory and build time for recall and latency. These
          are the knobs that matter.
        </P>
        <H2 id="build">Build parameters</H2>
        <ParamTable
          rows={[
            ["M", "16", "Edges per node. Higher = better recall, more memory."],
            ["ef_construction", "40", "Candidate list size at build time. Higher = better graph, slower build."],
            ["metric", "cosine", "cosine for text embeddings; L2 for clustering."],
          ]}
        />
        <H2 id="query">Query parameters</H2>
        <ParamTable
          rows={[
            ["k", "10", "Number of neighbors to return."],
            ["ef", "32", "Search breadth. Higher = better recall, higher latency."],
          ]}
        />
        <H2 id="guidance">Guidance</H2>
        <Callout kind="warn" title="Aviva says">
          Use HNSW. M=16, ef=32. Cosine for text, L2 for clustering. Done.
        </Callout>
        <P>
          Numbers above are defaults, not benchmarks. Publish measured latency/recall only against a
          reproducible suite.
        </P>
      </>
    ),
  },
  personas: {
    eyebrow: "Personas",
    title: "Three minds, one system",
    toc: [
      ["abi", "Abi · moderator"],
      ["abbey", "Abbey · polymath"],
      ["aviva", "Aviva · expert"],
    ],
    body: () => (
      <>
        <P>
          The personas are three registers exposed by the ABI framework. <IC>Abi</IC> is the default — she
          classifies intent and routes to the others.
        </P>
        <H2 id="abi">Abi · Adaptive Moderator</H2>
        <Callout kind="info" title="Cyan · interactive">
          Neutral and balanced; the connective tissue. "Routing this to Abbey — it reads as a learning question
          with some frustration."
        </Callout>
        <H2 id="abbey">Abbey · Empathic Polymath</H2>
        <Callout kind="proof" title="Emerald · proof">
          Warm, scaffolds with metaphor before precision. "Think of a vector database as a library that files
          books by meaning, not title."
        </Callout>
        <H2 id="aviva">Aviva · Unfiltered Expert</H2>
        <Callout kind="warn" title="Violet · vision">
          Direct, dense, zero hedging. "Use HNSW. M=16, ef=32. Cosine for text, L2 for clustering. Done."
        </Callout>
      </>
    ),
  },
};
