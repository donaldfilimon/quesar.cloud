import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

function scaffold(prompt: string) {
  const title = prompt.trim().slice(0, 48) || "Studio site";
  const safe = title.replace(/[<>]/g, "");
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${safe}</title>
<style>
  :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, sans-serif; }
  body { margin: 0; background: #07090d; color: #eef1f5; }
  main { max-width: 42rem; margin: 0 auto; padding: 3rem 1.25rem; }
  p.k { font: 500 11px/1 ui-monospace, monospace; letter-spacing: .16em; text-transform: uppercase; color: #6ecad8; }
  h1 { font-family: Georgia, serif; font-size: 2.4rem; letter-spacing: -0.03em; }
  .card { border: 1px solid rgba(238,241,245,.1); border-radius: 16px; padding: 1.1rem 1.2rem; margin-top: 1rem; }
  .muted { color: #8b96a4; line-height: 1.55; }
</style>
<main>
  <p class="k">Quasar local preview</p>
  <h1>${safe}</h1>
  <p class="muted">Generated in the browser as an orientation of the local builder. The shipping v1 writes a Next.js project to disk via the Bun service — it does not host, deploy, or bill.</p>
  <div class="card"><p class="muted">${prompt.replace(/[<>]/g, "").slice(0, 280) || "Describe a site to see the scaffold."}</p></div>
</main>
</html>`;
}

export function QuasarStudio() {
  const [prompt, setPrompt] = useState("A lab notebook for private retrieval experiments, with a claims legend.");
  const html = useMemo(() => scaffold(prompt), [prompt]);
  const src = useMemo(() => `data:text/html;charset=utf-8,${encodeURIComponent(html)}`, [html]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="surface p-5">
        <p className="font-mono text-[0.68rem] tracking-[0.16em] text-accent uppercase">Studio</p>
        <h3 className="mt-2 font-display text-2xl">Prompt to a preview.</h3>
        <p className="mt-2 text-sm text-fg-muted">
          Browser scaffold only. Real generation needs the local Bun service and Anthropic credentials.
        </p>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value.slice(0, 500))}
          className="mt-4 min-h-32 w-full rounded-md bg-bg px-3 py-3 text-sm shadow-[var(--shadow-border)] outline-none"
        />
        <Button type="button" className="mt-3" onClick={() => setPrompt((p) => p.trim() || p)}>
          Refresh preview
        </Button>
      </div>
      <div className="overflow-hidden rounded-[18px] bg-bg shadow-[var(--shadow-border)]">
        <p className="border-b border-border px-4 py-2 font-mono text-[10px] tracking-[0.16em] text-fg-subtle uppercase">
          next dev · local
        </p>
        <iframe title="Quasar preview" src={src} className="h-[28rem] w-full bg-bg" />
      </div>
    </div>
  );
}
