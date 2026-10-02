import { AiConsentPanel } from "@/components/console/ai-consent-panel";
import { useAiConsent } from "@/components/console/use-ai-consent";
import { useHydrated } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { askPersonaFromClient } from "@/lib/ai";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { readStore, writeStore } from "@/lib/local-store";
import { staticSite } from "@/lib/static-site";
import { ServerOnlyNotice } from "@/components/site/server-only-notice";

type Doc = { id: string; title: string; body: string; updated: number };

const KEY = "mlai-abbey-workspace";
const WELCOME_BODY =
  "Abbey workspace orientation.\n\nThis page is a browser document preview: documents are stored in this browser's localStorage. A configured server can provide a separate model-request path; the static preview cannot.\n\nWrite a brief, then inspect the available interaction and setup requirements.";

export function WorkspaceApp() {
  const { user } = useCurrentUserState();
  const consent = useAiConsent();
  const requestLock = useRef(false);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [title, setTitle] = useState("Welcome");
  const [body, setBody] = useState(WELCOME_BODY);
  const [question, setQuestion] = useState("Summarize this document and name one risk.");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"idle" | "asking" | "error">("idle");

  // Documents live in localStorage, which the server can't read: the server
  // render and the hydration pass show the welcome draft, then the first client
  // render after hydration loads the stored documents (or seeds the welcome
  // document) once, adjusted during render.
  const hydrated = useHydrated();
  const [loaded, setLoaded] = useState(false);
  // The welcome document used when nothing is stored yet. Created once per mount
  // (lazy initializer); it is only rendered after the load below adopts it.
  const [seed] = useState<Doc>(() => ({
    id: crypto.randomUUID(),
    title: "Welcome",
    body: WELCOME_BODY,
    updated: Date.now(),
  }));
  if (hydrated && !loaded) {
    setLoaded(true);
    const stored = readStore<Doc[]>(KEY, []);
    const first = stored[0];
    if (first) {
      setDocs(stored);
      setActive(first.id);
      setTitle(first.title);
      setBody(first.body);
    } else {
      setDocs([seed]);
      setActive(seed.id);
    }
  }

  useEffect(() => {
    // Never write before the stored documents are loaded, or the empty initial
    // list would overwrite them.
    if (loaded) writeStore(KEY, docs);
  }, [loaded, docs]);

  const current = docs.find((doc) => doc.id === active) ?? null;
  const [query, setQuery] = useState("");
  const visible = docs.filter((doc) =>
    `${doc.title} ${doc.body}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;

  function openDoc(doc: Doc) {
    setActive(doc.id);
    setTitle(doc.title);
    setBody(doc.body);
  }

  function createDoc() {
    const doc: Doc = { id: crypto.randomUUID(), title: "Untitled", body: "", updated: Date.now() };
    setDocs((rows) => [doc, ...rows]);
    openDoc(doc);
  }

  function removeDoc(id: string) {
    const next = docs.filter((doc) => doc.id !== id);
    setDocs(next);
    const fallback = next[0];
    if (fallback) openDoc(fallback);
    else {
      setActive(null);
      setTitle("");
      setBody("");
    }
  }

  function persist(nextTitle: string, nextBody: string) {
    if (!active) return;
    setDocs((rows) =>
      rows.map((row) =>
        row.id === active ? { ...row, title: nextTitle, body: nextBody, updated: Date.now() } : row,
      ),
    );
  }

  async function ask() {
    if (!consent.ready || requestLock.current || !question.trim() || title.length > 200) return;
    requestLock.current = true;
    setStatus("asking");
    setAnswer("");
    try {
      const result = await askPersonaFromClient({
        data: {
          persona: "abbey",
          prompt: `Document titled ${title}:\n${body.slice(0, 800)}\n\nOperator question: ${question}`,
        },
      });
      if (!result.ok) {
        setAnswer(result.message);
        await consent.refresh();
        setStatus("error");
        return;
      }
      setAnswer(result.text);
      setStatus("idle");
    } catch {
      setAnswer(
        "The request could not be completed. Your document and question are preserved; check your session and retry.",
      );
      setStatus("error");
    } finally {
      requestLock.current = false;
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card lg:grid lg:min-h-[32rem] lg:grid-cols-[16rem_minmax(0,1fr)_18rem]">
      <aside className="border-b border-border lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-2 px-3 py-3">
          <p className="text-xs text-accent">Documents</p>
          <Button type="button" size="sm" onClick={createDoc}>
            New
          </Button>
        </div>
        <div className="px-3 pb-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search documents"
            aria-label="Search documents"
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none"
          />
        </div>
        <ul>
          {visible.map((doc) => (
            <li key={doc.id} className="group flex items-stretch">
              <button
                type="button"
                className={`min-h-11 flex-1 px-3 py-2 text-left text-sm ${doc.id === active ? "bg-primary/10 text-fg" : "text-fg-muted hover:bg-muted"}`}
                onClick={() => openDoc(doc)}
              >
                <span className="block truncate">{doc.title || "Untitled"}</span>
                <span className="mt-0.5 block font-mono text-2xs text-fg-subtle">
                  {new Date(doc.updated).toLocaleDateString()}
                </span>
              </button>
              <button
                type="button"
                className="px-3 text-xs text-fg-subtle hover:text-fg"
                aria-label={`Delete ${doc.title || "Untitled"}`}
                onClick={() => removeDoc(doc.id)}
              >
                Delete
              </button>
            </li>
          ))}
          {visible.length === 0 ? (
            <li className="px-3 py-4 text-sm text-fg-muted">No documents match.</li>
          ) : null}
        </ul>
      </aside>
      <div className="border-b border-border p-4 sm:p-5 lg:border-b-0 lg:border-r">
        {current ? (
          <>
            <input
              aria-label="Document title"
              maxLength={200}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                persist(event.target.value, body);
              }}
              className="w-full bg-transparent font-display text-2xl outline-none"
            />
            <p className="mt-2 font-mono text-2xs text-fg-subtle">
              {words} words · saved in this browser
            </p>
            <textarea
              aria-label="Document body"
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                persist(title, event.target.value);
              }}
              className="mt-4 min-h-72 w-full resize-y bg-transparent text-sm leading-relaxed text-fg-muted outline-none"
            />
          </>
        ) : null}
      </div>
      <aside className="p-4 sm:p-5">
        <p className="text-xs text-accent">Assistant</p>
        {staticSite ? (
          <>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">
              Documents on this page stay in this browser.
            </p>
            <ServerOnlyNotice feature="Asking Abbey" compact className="mt-4" />
          </>
        ) : (
          <>
            <p className="mt-2 text-xs text-fg-muted">
              {user
                ? "Signed in. Live model is user-initiated and capped."
                : "Local notes work offline. Sign in to ask Abbey."}
            </p>
            <AiConsentPanel consent={consent} busy={status === "asking"} />
            <p className="mt-3 text-xs text-fg-muted">
              Ask Abbey sends this document’s title, the first 800 body characters, and your
              question to the configured model provider. A successful exchange is stored as a sealed
              audit before its reply is shown. Editing alone stays in this browser.
            </p>
            {title.length > 200 ? (
              <p role="alert">Shorten the title to 200 characters before asking.</p>
            ) : null}
            <textarea
              aria-label="Question for Abbey"
              disabled={status === "asking"}
              value={question}
              onChange={(event) => setQuestion(event.target.value.slice(0, 400))}
              className="mt-3 min-h-24 w-full rounded-md bg-bg px-3 py-2 text-sm shadow-border outline-none"
            />
            <Button
              type="button"
              className="mt-3"
              onClick={() => void ask()}
              disabled={
                status === "asking" || !consent.ready || !question.trim() || title.length > 200
              }
            >
              {status === "asking" ? "Asking…" : "Ask Abbey"}
            </Button>
            {answer ? (
              <p
                role={status === "error" ? "alert" : "status"}
                className="mt-4 text-sm leading-relaxed text-fg-muted"
              >
                {answer}
              </p>
            ) : null}
          </>
        )}
      </aside>
    </div>
  );
}
