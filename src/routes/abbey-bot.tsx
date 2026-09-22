import { type FormEvent, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PersonaRouter, scoreMessage } from "@/components/apps/persona-router";
import { PageClose, PageHero, Section } from "@/components/site";
import { Button } from "@/components/ui/button";
import { askPersona } from "@/lib/ai";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { StatusBadge } from "@/components/site/status-badge";

export const Route = createFileRoute("/abbey-bot")({
  head: () => ({
    meta: [
      { title: "Abbey bot — Quesar" },
      { name: "description", content: "Companion bot surface: watch Abi route Abbey and Aviva, then ask a signed-in live model." },
    ],
  }),
  component: AbbeyBotPage,
});

type Turn = { role: "you" | "bot"; text: string; persona: string };

function AbbeyBotPage() {
  const { user } = useCurrentUserState();
  const [input, setInput] = useState("Help me name what the ledger can prove about WDBX.");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    const scores = scoreMessage(text);
    const persona = scores.alpha > 0.55 ? "abbey" : scores.alpha < 0.35 ? "aviva" : "abi";
    setTurns((rows) => [...rows, { role: "you", text, persona }]);
    setInput("");
    setPending(true);
    try {
      const result = await askPersona({ data: { prompt: text, persona } });
      const reply = result.ok
        ? result.text
        : `${persona} would answer locally: ${result.error} Heuristic α=${scores.alpha.toFixed(2)}.`;
      setTurns((rows) => [...rows, { role: "bot", text: reply, persona }]);
    } catch {
      setTurns((rows) => [
        ...rows,
        {
          role: "bot",
          persona,
          text: `Sign in for the live model. Local route: ${persona} (α=${scores.alpha.toFixed(2)}). Abbey names uncertainty; Aviva answers; Abi traces.`,
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Abbey bot"
        title="A companion that says what it knows."
        lede="The Rust bot is the shipping surface. This page is the browser companion: persona routing you can see, and an optional live model behind sign-in."
      >
        <div className="mt-6">
          <StatusBadge status="partial" />
        </div>
      </PageHero>
      <Section eyebrow="Router" title="Watch Abi score the blend.">
        <PersonaRouter />
      </Section>
      <Section eyebrow="Thread" title="One conversation. Three voices.">
        <div className="surface p-5">
          <ul className="space-y-3">
            {turns.length === 0 ? <li className="text-sm text-fg-muted">No turns yet. {user ? "Signed in." : "Local fallback if you are signed out."}</li> : null}
            {turns.map((turn, index) => (
              <li key={`${turn.role}-${index}`} className="rounded-md bg-bg px-4 py-3">
                <p className="font-mono text-[10px] tracking-wide text-fg-subtle uppercase">
                  {turn.role} · {turn.persona}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-fg">{turn.text}</p>
              </li>
            ))}
          </ul>
          <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value.slice(0, 600))}
              className="h-11 flex-1 rounded-md bg-bg px-3 text-sm shadow-[var(--shadow-border)] outline-none"
              placeholder="Ask Abbey, Aviva, or Abi"
            />
            <Button type="submit" disabled={pending}>
              {pending ? "Routing…" : "Send"}
            </Button>
          </form>
        </div>
      </Section>
      <PageClose
        primary={{ to: "/abbey", label: "Abbey product" }}
        secondary={[{ to: "/companion", label: "macOS companion" }]}
        next={[{ to: "/demo", label: "Persona demo", body: "Watch Abi score α without a live model." }]}
      />
    </>
  );
}
