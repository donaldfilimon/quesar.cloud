import { Check, Copy, Loader2, Send, Trash2 } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendChat, type ChatTurn } from "@/lib/console";
import { day, unexpected } from "./format";
import { AiConsentPanel } from "./ai-consent-panel";
import { useAiConsent } from "./use-ai-consent";

/** mlai: the prompt textarea's `maxLength`; the server enforces the same cap. */
const MAX_PROMPT = 16_000;
const MAX_TURNS = 12;

export function ChatPanel({ onOpenAudits }: { onOpenAudits: () => void }) {
  const consent = useAiConsent();
  const { ready, refresh: load } = consent;
  const requestLock = useRef(false);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const content = prompt.trim();
    if (!content || !ready || requestLock.current) return;
    requestLock.current = true;
    const next = [...messages, { role: "user" as const, content }].slice(-MAX_TURNS);
    setBusy(true);
    setError("");
    try {
      const result = await sendChat({ data: { messages: next } });
      if (!result.ok) {
        setError(result.message);
        if (result.reason === "consent_required" || result.reason === "encryption_not_configured")
          await load();
        return;
      }
      setMessages([...next, { role: "assistant", content: result.text }]);
      setPrompt("");
      toast.success(
        `Reply stored as encrypted audit, with an assigned expiry of ${day(result.audit.expiresAt)}.`,
      );
    } catch (cause) {
      // No claim about the audit record: an unexpected failure does not say which step broke.
      setError(
        unexpected("The response could not be generated right now. Try again in a moment.", cause),
      );
    } finally {
      requestLock.current = false;
      setBusy(false);
    }
  }

  const reply = messages.at(-1)?.role === "assistant" ? messages.at(-1)?.content : "";
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(16rem,0.72fr)_minmax(0,1.28fr)]">
      <aside className="grid content-start gap-4">
        <AiConsentPanel consent={consent} busy={busy} />
      </aside>
      <section aria-label="Audited generation" className="grid content-start gap-4">
        <form onSubmit={onSubmit} className="grid gap-3 rounded-xl bg-card p-5 shadow-border">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Label htmlFor="chat-prompt">Prompt</Label>
              <p className="mt-1 text-xs text-fg-subtle">
                A model reply is shown only after its encrypted audit record is stored.
              </p>
            </div>
            {messages.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Clear local conversation"
                onClick={() => setMessages([])}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            ) : null}
          </div>
          <Textarea
            id="chat-prompt"
            rows={6}
            maxLength={MAX_PROMPT}
            value={prompt}
            disabled={busy}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Draft a safe rollout plan for a private retrieval agent that summarizes internal research notes."
          />
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-2xs text-fg-subtle">
              {prompt.length}/{MAX_PROMPT}
            </p>
            <Button type="submit" disabled={busy || !ready || prompt.trim().length === 0}>
              {busy ? (
                <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
              Generate with audit
            </Button>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-status-partial">
              {error}
            </p>
          ) : null}
        </form>

        {messages.length > 0 ? (
          <ol className="grid gap-3" aria-label="This tab's conversation">
            {messages.slice(0, -1).map((message, index) => (
              <li key={index} className="rounded-lg bg-bg-subtle px-4 py-3 text-sm text-fg-muted">
                <span className="text-xs text-fg-subtle">{message.role}</span>
                <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
              </li>
            ))}
          </ol>
        ) : null}

        {reply ? (
          <div className="rounded-xl bg-card p-5 shadow-border">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-accent">Quesar response</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={onOpenAudits}>
                  View audit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Copy response"
                  onClick={() => {
                    void navigator.clipboard.writeText(reply).then(
                      () => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1600);
                      },
                      () => toast.error("Could not copy."),
                    );
                  }}
                >
                  {copied ? (
                    <Check className="size-4" aria-hidden />
                  ) : (
                    <Copy className="size-4" aria-hidden />
                  )}
                </Button>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">
              {reply}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
