import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { architectureNodes } from "@/lib/content";

export const desks = [
  { id: "abbey", name: "Abbey", line: "Care first. Scaffold the next step." },
  { id: "aviva", name: "Aviva", line: "Clarity always. No borrowed certainty." },
  { id: "abi", name: "Abi", line: "Competence. Route to what the ledger can prove." },
  { id: "quesar", name: "Quesar", line: "Inspect the stack. Name what is current." },
  { id: "wdbx", name: "WDBX", line: "Retrieve from the on-site catalog, then cite." },
] as const;

export type DeskId = (typeof desks)[number]["id"];

const input = z.object({
  desk: z.enum(["abbey", "aviva", "abi", "quesar", "wdbx"]),
  prompt: z.string().trim().min(1).max(1200),
});

const SYSTEM: Record<DeskId, string> = {
  abbey:
    "You are Abbey on the Quesar desk. Care first. Use only the catalog hits provided. Never claim AGI, a hosted session, or a benchmark. Under 160 words.",
  aviva:
    "You are Aviva on the Quesar desk. Clarity, no preamble. Use only the catalog hits. If a fact is not in the hits, say so. Under 140 words.",
  abi: "You are Abi on the Quesar desk. Point to the next inspectable page. Use only the catalog hits. Under 150 words.",
  quesar:
    "You are the Quesar desk. Describe the matching architecture nodes. Separate current source from what is not claimed. Under 160 words.",
  wdbx: "You are the WDBX desk. This retrieval is lexical over the site catalog, not the Rust HNSW. Rank the hits and say that limit. Under 150 words.",
};

type Hit = { id: string; title: string; href: string; excerpt: string; score: number };

function tokens(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);
}

function overlap(query: string, text: string) {
  const wanted = new Set(tokens(query));
  if (!wanted.size) return 0;
  const seen = new Set(tokens(text));
  let hits = 0;
  for (const word of wanted) if (seen.has(word)) hits += 1;
  return hits / wanted.size;
}

function catalogHits(query: string): Hit[] {
  return architectureNodes
    .map((node) => {
      const excerpt = `${node.summary} ${node.detail}`.slice(0, 280);
      return {
        id: node.id,
        title: node.name,
        href: `/architecture?node=${node.id}`,
        excerpt,
        score: overlap(query, `${node.name} ${node.summary} ${node.detail} ${node.implemented.join(" ")}`),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

function localReply(desk: DeskId, hits: Hit[]) {
  const lines = hits
    .filter((hit) => hit.score > 0)
    .map((hit) => `${hit.title}: ${hit.excerpt}`)
    .slice(0, 2);
  const body = lines.length ? lines.join(" ") : "Nothing in the on-site catalog matched that wording.";
  if (desk === "wdbx") return `Local retrieval. This is lexical overlap, not the Rust HNSW. ${body}`;
  if (desk === "quesar") return `Local inspect. The model endpoint is not configured. ${body}`;
  return `Local ${desk} desk. The model endpoint is not configured, so this stays on the catalog. ${body}`;
}

export const askDesk = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((value: unknown) => input.parse(value))
  .handler(async ({ data }) => {
    const hits = catalogHits(data.prompt);
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: true as const, mode: "local" as const, desk: data.desk, text: localReply(data.desk, hits), hits };
    }
    const context = hits.map((hit) => `${hit.title} (${hit.href}): ${hit.excerpt}`).join("\n");
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 320,
        messages: [
          { role: "system", content: SYSTEM[data.desk] },
          { role: "user", content: `Catalog hits:\n${context}\n\nOperator: ${data.prompt}` },
        ],
      }),
    });
    if (!res.ok) {
      return { ok: true as const, mode: "local" as const, desk: data.desk, text: localReply(data.desk, hits), hits };
    }
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return {
      ok: true as const,
      mode: "model" as const,
      desk: data.desk,
      text: body.choices?.[0]?.message?.content ?? localReply(data.desk, hits),
      hits,
    };
  });
