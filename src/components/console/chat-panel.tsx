import { Check, Copy, Loader2, Send, Trash2 } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Surface } from "@/components/site";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  acceptConsent,
  getConsoleStatus,
  sendChat,
  withdrawConsent,
  type ChatTurn,
  type ConsoleStatus,
} from "@/lib/console";
import { day, unexpected } from "./format";

/** mlai: the prompt textarea's `maxLength`; the server enforces the same cap. */
const MAX_PROMPT = 16_000;
const MAX_TURNS = 12;

function StateRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md bg-bg-subtle px-3 py-2">
      <div className="min-w-0">
        <p className="font-mono text-[10px] tracking-[0.14em] text-fg-subtle uppercase">{label}</p>
        <p className="mt-0.5 break-words font-mono text-xs text-fg-muted">{detail}</p>
      </div>
      <span className={ok ? "text-xs text-status-current" : "text-xs text-status-partial"}>
        {ok ? "configured" : "not configured"}
      </span>
    </div>
  );
}

export function ChatPanel({ onOpenAudits }: { onOpenAudits: () => void }) {
  const [status, setStatus] = useState<ConsoleStatus | null>(null);
  const [loadError, setLoadError] = useState("");
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      setStatus(await getConsoleStatus());
    } catch (cause) {
      setLoadError(
        unexpected("The console could not be loaded right now. Reload the page.", cause),
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const consent = status?.consent;
  const ready = Boolean(status?.encryption && status.llm.configured && consent?.accepted);

  async function accept() {
    if (!consent) return;
    setBusy(true);
    setError("");
    try {
      const result = await acceptConsent({ data: { policyVersion: consent.policyVersion } });
      if (!result.ok) {
        setError(result.message);
        await load();
      } else setStatus((prev) => (prev ? { ...prev, consent: result.consent } : prev));
    } catch (cause) {
      setError(
        unexpected(
          "The audit policy could not be accepted right now. Try again in a moment.",
          cause,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    setBusy(true);
    setError("");
    try {
      const next = await withdrawConsent();
      setStatus((prev) => (prev ? { ...prev, consent: next } : prev));
    } catch (cause) {
      setError(
        unexpected("Consent could not be withdrawn right now. Try again in a moment.", cause),
      );
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const content = prompt.trim();
    if (!content || !ready) return;
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
      toast.success(`Reply stored as encrypted audit, kept until ${day(result.audit.expiresAt)}.`);
    } catch (cause) {
      // No claim about the audit record: an unexpected failure does not say which step broke.
      setError(
        unexpected("The response could not be generated right now. Try again in a moment.", cause),
      );
    } finally {
      setBusy(false);
    }
  }

  const reply = messages.at(-1)?.role === "assistant" ? messages.at(-1)?.content : "";
  const disabledReason = !status
    ? "Loading…"
    : !status.encryption
      ? "Chat is off: audit encryption (APP_ENCRYPTION_KEY) is not configured, and chat never runs unaudited."
      : !status.llm.configured
        ? "Chat is off: no model provider is configured in this environment. Replies are never simulated."
        : !consent?.accepted
          ? "Accept the audit policy before the first chat."
          : "";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(16rem,0.72fr)_minmax(0,1.28fr)]">
      <aside className="grid content-start gap-4">
        <Surface>
          <p className="font-mono text-[0.68rem] tracking-[0.14em] text-accent uppercase">
            Generation boundary
          </p>
          <p className="mt-2 text-sm text-fg-muted">
            No user email is sent to the model provider. Chat stays only in this tab&apos;s memory;
            the durable copy is the encrypted audit.
          </p>
          <div className="mt-4 grid gap-2">
            <StateRow
              label="Model"
              ok={Boolean(status?.llm.configured)}
              detail={
                status
                  ? status.llm.model
                    ? `${status.llm.provider} · ${status.llm.model}`
                    : "none"
                  : "loading"
              }
            />
            <StateRow
              label="Audit encryption"
              ok={Boolean(status?.encryption)}
              detail={
                status
                  ? status.encryption
                    ? "AES-256-GCM"
                    : "APP_ENCRYPTION_KEY missing"
                  : "loading"
              }
            />
          </div>
        </Surface>

        <Surface>
          <p className="font-mono text-[0.68rem] tracking-[0.14em] text-accent uppercase">
            One-year audit policy
          </p>
          <p className="mt-2 text-sm text-fg-muted">
            Prompts and responses are sealed with AES-256-GCM, bound to your account, retained for{" "}
            {status?.policy.retentionDays ?? 365} days, and available to you and to allowlisted
            administrators with a linked Google or Apple account. Every admin read and delete
            is reason-logged.
          </p>
          <p className="mt-3 font-mono text-xs text-fg-subtle">
            policy {consent?.policyVersion ?? "loading"}
          </p>
          {consent?.accepted ? (
            <div className="mt-3 grid gap-2">
              <p className="text-xs text-status-current">
                Accepted{consent.consentedAt ? ` ${day(consent.consentedAt)}` : ""}.
              </p>
              <Button variant="secondary" onClick={() => void withdraw()} disabled={busy}>
                Withdraw consent
              </Button>
            </div>
          ) : (
            <Button
              className="mt-3 w-full"
              onClick={() => void accept()}
              disabled={busy || !consent}
            >
              <Check className="size-4" aria-hidden /> Accept before first chat
            </Button>
          )}
        </Surface>
      </aside>

      <section aria-label="Audited generation" className="grid content-start gap-4">
        {loadError ? (
          <p
            role="alert"
            className="rounded-lg bg-card px-4 py-3 text-sm text-status-partial shadow-[var(--shadow-border)]"
          >
            {loadError}{" "}
            <button type="button" className="underline" onClick={() => void load()}>
              Retry
            </button>
          </p>
        ) : null}
        <form
          onSubmit={onSubmit}
          className="grid gap-3 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <Label htmlFor="chat-prompt">Prompt</Label>
              <p className="mt-1 text-xs text-fg-subtle">
                A reply is shown only after its encrypted audit record is durable.
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
            disabled={!ready}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Draft a safe rollout plan for a private retrieval agent that summarizes internal research notes."
          />
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] text-fg-subtle">
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
          {disabledReason ? <p className="text-sm text-fg-muted">{disabledReason}</p> : null}
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
                <span className="font-mono text-[10px] tracking-[0.14em] text-fg-subtle uppercase">
                  {message.role}
                </span>
                <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
              </li>
            ))}
          </ol>
        ) : null}

        {reply ? (
          <div className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] tracking-[0.2em] text-accent uppercase">
                Quesar response
              </span>
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
