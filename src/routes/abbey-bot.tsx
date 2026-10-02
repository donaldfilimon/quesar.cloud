import { AiConsentPanel } from "@/components/console/ai-consent-panel";
import { useAiConsent } from "@/components/console/use-ai-consent";
import { type FormEvent, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PersonaRouter } from "@/components/apps/persona-router";
import { scoreMessage } from "@/components/apps/persona-score";
import { PageClose, PageHero, Section } from "@/components/site";
import { Button } from "@/components/ui/button";
import { askPersonaFromClient } from "@/lib/ai";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { StatusBadge } from "@/components/site/status-badge";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/abbey-bot")({
  head: () =>
    pageHead(
      "Abbey bot — Quesar",
      "Browser persona-routing illustration with an optional configured server model-request path.",
    ),
  component: AbbeyBotPage,
});

type Turn = { role: "you" | "bot"; text: string; persona: string };

function AbbeyBotPage() {
  const { user } = useCurrentUserState();
  const consent = useAiConsent();
  const requestLock = useRef(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState("Help me name what the ledger can prove about WDBX.");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || !consent.ready || requestLock.current) return;
    requestLock.current = true;
    setError("");
    const scores = scoreMessage(text);
    const persona = scores.alpha > 0.55 ? "abbey" : scores.alpha < 0.35 ? "aviva" : "abi";
    setPending(true);
    try {
      const result = await askPersonaFromClient({ data: { prompt: text, persona } });
      if (!result.ok) {
        setError(result.message);
        await consent.refresh();
        return;
      }
      setTurns((rows) => [
        ...rows,
        { role: "you", text, persona },
        { role: "bot", text: result.text, persona },
      ]);
      setInput("");
    } catch {
      setError(
        `The configured server model-request path is unavailable. Local route: ${persona} (α=${scores.alpha.toFixed(2)}).`,
      );
    } finally {
      requestLock.current = false;
      setPending(false);
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Abbey bot"
        title="A companion that says what it knows."
        lede="This browser companion illustrates persona routing and provides an optional configured server model-request path. It does not establish deployment acceptance for the separate Rust bot."
      >
        <div className="mt-6">
          <StatusBadge status="partial" />
        </div>
      </PageHero>
      <Section eyebrow="Router" title="Watch Abi score the blend.">
        <PersonaRouter />
      </Section>
      <Section eyebrow="Thread" title="One conversation. Three voices.">
        <AiConsentPanel consent={consent} busy={pending} />
        <div className="surface p-5">
          <ul className="space-y-3">
            {turns.length === 0 ? (
              <li className="text-sm text-fg-muted">
                No turns yet.{" "}
                {user
                  ? "Signed in."
                  : "Sign in for the live model. Persona scoring above stays local."}
              </li>
            ) : null}
            {turns.map((turn, index) => (
              <li key={`${turn.role}-${index}`} className="rounded-md bg-bg px-4 py-3">
                <p className="text-xs text-fg-subtle">
                  {turn.role} · {turn.persona}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-fg">{turn.text}</p>
              </li>
            ))}
          </ul>
          <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              aria-label="Ask Abbey, Aviva, or Abi"
              disabled={pending}
              value={input}
              onChange={(event) => setInput(event.target.value.slice(0, 600))}
              className="h-11 flex-1 rounded-md bg-bg px-3 text-sm shadow-border outline-none"
              placeholder="Ask Abbey, Aviva, or Abi"
            />
            <Button type="submit" disabled={pending || !consent.ready || !input.trim()}>
              {pending ? "Routing…" : "Send"}
            </Button>
          </form>
          {error ? (
            <p role="alert" className="mt-3 text-sm text-status-partial">
              {error}
            </p>
          ) : null}
        </div>
      </Section>
      <PageClose
        primary={{ to: "/abbey", label: "Abbey product" }}
        secondary={[{ to: "/companion", label: "macOS companion" }]}
        next={[
          { to: "/demo", label: "Persona demo", body: "Watch Abi score α without a live model." },
        ]}
      />
    </>
  );
}
