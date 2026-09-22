import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RequireSession } from "@/lib/auth/gates";
import { askDesk, desks, type DeskId } from "@/lib/systems";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () =>
    pageHead(
      "Desk — Quesar",
      "Signed-in desk for Abbey, Aviva, Abi, Quesar, and WDBX. Retrieval is the on-site catalog unless the model endpoint answers.",
    ),
  component: DashboardPage,
});

type Reply = {
  mode: "local" | "model";
  text: string;
  hits: { id: string; title: string; href: string; excerpt: string; score: number }[];
};

function DashboardPage() {
  return (
    <RequireSession>
      {(user) => <Desk name={user.displayName ?? user.primaryEmail ?? "operator"} />}
    </RequireSession>
  );
}

function Desk({ name }: { name: string }) {
  const [desk, setDesk] = useState<DeskId>("abbey");
  const [prompt, setPrompt] = useState("What is current in this stack, and what is not claimed?");
  const [reply, setReply] = useState<Reply | null>(null);
  const [status, setStatus] = useState<"idle" | "asking" | "error">("idle");
  const [error, setError] = useState("");
  const current = desks.find((item) => item.id === desk) ?? desks[0];

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("asking");
    setError("");
    try {
      const result = await askDesk({ data: { desk, prompt } });
      setReply({ mode: result.mode, text: result.text, hits: result.hits });
      setStatus("idle");
    } catch {
      setError("Sign in again. The desk API requires a session.");
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.68rem] tracking-[0.16em] text-primary uppercase">Signed-in desk</p>
          <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-5xl">Hello, {name}.</h1>
          <p className="mt-3 max-w-[66ch] text-base leading-7 text-fg">
            Abbey, Aviva, Abi, Quesar, and WDBX answer through one API. WDBX here is lexical catalog retrieval, not the Rust index.
          </p>
        </div>
        <Link to="/console" className="text-sm text-primary no-underline hover:underline">
          Console
        </Link>
      </header>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 lg:hidden">
        {desks.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setDesk(item.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm",
              item.id === desk ? "bg-primary text-primary-foreground" : "bg-muted text-fg",
            )}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <ul className="space-y-1">
            {desks.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setDesk(item.id)}
                  className={cn(
                    "w-full rounded-lg px-3 py-3 text-left",
                    item.id === desk ? "bg-primary/15 text-fg" : "text-fg-muted hover:bg-muted",
                  )}
                >
                  <span className="block text-sm font-medium">{item.name}</span>
                  <span className="mt-1 block text-xs leading-5">{item.line}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-6">
          <p className="font-mono text-[0.68rem] tracking-[0.16em] text-primary uppercase">{current.name}</p>
          <p className="mt-2 text-base leading-7 text-fg">{current.line}</p>

          {reply ? (
            <div className="mt-6">
              <p className="font-mono text-[11px] tracking-[0.14em] text-fg-subtle uppercase">
                {reply.mode === "model" ? "Model endpoint" : "Local catalog"}
              </p>
              <p className="mt-3 max-w-[66ch] text-[1.0625rem] leading-8 text-fg">{reply.text}</p>
              {reply.hits.some((hit) => hit.score > 0) ? (
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {reply.hits
                    .filter((hit) => hit.score > 0)
                    .map((hit) => (
                      <li key={hit.id} className="rounded-lg border border-border p-3">
                        <Link
                          to="/architecture"
                          search={{ node: hit.id }}
                          className="text-sm font-medium text-fg no-underline hover:underline"
                        >
                          {hit.title}
                        </Link>
                        <p className="mt-2 text-sm leading-6 text-fg-muted">{hit.excerpt}</p>
                      </li>
                    ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <form onSubmit={(event) => void onSubmit(event)} className="mt-6">
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value.slice(0, 1200))}
              className="min-h-28 text-base leading-7"
              aria-label={`Ask ${current.name}`}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={status === "asking"}>
                {status === "asking" ? "Calling API…" : `Ask ${current.name}`}
              </Button>
              {error ? <p className="text-sm text-status-partial">{error}</p> : null}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
