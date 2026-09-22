// Ported from mlai `apps/mlai/lib/quasar-screens.tsx` (`QuasarSite`) at b6f3686.
// Quesar changes: the feed cursor lives in one ref applied through
// `applyEventPage` (so a poll that returns after an edit reset is discarded),
// polls never overlap, and an uncertain action offers the Retry the
// connection asks for.
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  editSite,
  getEvents,
  getSite,
  isUncertain,
  previewHref,
  previewStart,
  previewStatus,
  previewStop,
  recover,
} from "@/lib/quasar/api";
import {
  applyEventPage,
  EditSiteBody,
  type GenerationEvent,
  type PreviewStatus,
  type Site,
} from "@/lib/quasar";
import { cn } from "@/lib/utils";
import { Notice, QuasarFrame, ServiceUnreachable, SiteStatusBadge } from "./shared";
import { errorText, formatDate, isUnreachable, useServiceOrigin } from "./util";

type Feed = { events: GenerationEvent[]; next: number };
const EMPTY_FEED: Feed = { events: [], next: 0 };
const POLL_MS = 1000;

export function QuasarSiteDetail({ id }: { id: string }) {
  const origin = useServiceOrigin();
  const [site, setSite] = useState<Site | null>(null);
  const [missing, setMissing] = useState(false);
  const [feed, setFeed] = useState<Feed>(EMPTY_FEED);
  const [preview, setPreview] = useState<PreviewStatus | null>(null);
  const [pollError, setPollError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [uncertain, setUncertain] = useState(false);
  const [busy, setBusy] = useState<null | "edit" | "start" | "stop" | "retry">(null);
  const [editPrompt, setEditPrompt] = useState("");
  const feedRef = useRef<Feed>(EMPTY_FEED);
  const inFlight = useRef(false);

  // One full read of the site, its feed page and its preview. Throws, so the
  // Retry below only clears uncertainty after a read that actually succeeded.
  const readAll = useCallback(async () => {
    const nextSite = await getSite(id);
    setSite(nextSite);
    setMissing(false);
    const since = feedRef.current.next;
    const page = await getEvents(id, since);
    feedRef.current = applyEventPage(feedRef.current, since, page);
    setFeed(feedRef.current);
    setPreview(await previewStatus(id));
    setPollError(null);
  }, [id]);

  const poll = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await readAll();
    } catch (error) {
      if (errorText(error) === "not found") setMissing(true);
      setPollError(error);
    } finally {
      inFlight.current = false;
    }
  }, [readAll]);

  useEffect(() => {
    if (!origin) return;
    feedRef.current = EMPTY_FEED;
    setFeed(EMPTY_FEED);
    void poll();
    const timer = setInterval(() => void poll(), POLL_MS);
    return () => clearInterval(timer);
  }, [origin, poll]);

  function act<T>(
    kind: "edit" | "start" | "stop",
    run: () => Promise<T>,
    done: (value: T) => void,
  ) {
    if (busy) return;
    setBusy(kind);
    setActionError(null);
    run().then(
      (value) => {
        done(value);
        setBusy(null);
      },
      (error: unknown) => {
        setActionError(error);
        setUncertain(isUncertain());
        setBusy(null);
      },
    );
  }

  function retry() {
    if (busy) return;
    setBusy("retry");
    recover(readAll).then(
      () => {
        setUncertain(false);
        setActionError(null);
        setBusy(null);
      },
      (error: unknown) => {
        setActionError(error);
        setBusy(null);
      },
    );
  }

  const generating = site?.status === "generating";
  const editValid = EditSiteBody.safeParse({ prompt: editPrompt.trim() }).success;
  const href = origin ? previewHref(preview?.url ?? null, origin) : null;
  const running = preview?.state === "running";

  if (missing) {
    return (
      <QuasarFrame
        eyebrow="Quasar · site"
        title="Site not found"
        lede={`The service has no site with id ${id}.`}
      >
        <Link to="/quasar/sites" className="text-accent">
          Back to sites
        </Link>
      </QuasarFrame>
    );
  }

  return (
    <QuasarFrame
      eyebrow="Quasar · site"
      title={site?.name ?? "Loading site…"}
      lede={
        site
          ? `~/.quasar/sites/${site.slug} · created ${formatDate(site.createdAt)}. The feed and preview state are polled from the service every second.`
          : "Reading this site from the service."
      }
    >
      {pollError && !site && isUnreachable(pollError) ? (
        <ServiceUnreachable origin={origin} error={pollError} onRetry={() => void poll()} />
      ) : null}
      {pollError && site ? (
        <Notice tone="warn" title="Lost contact" className="mb-6">
          <p>
            The last poll failed ({errorText(pollError)}). Showing the state last read; it is
            retrying every second.
          </p>
        </Notice>
      ) : null}
      {pollError && !site && !isUnreachable(pollError) ? (
        <Notice tone="error" title="The service refused the request" className="mb-6">
          <p>{errorText(pollError)}</p>
        </Notice>
      ) : null}

      {site ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-6">
            <section className="surface p-5" aria-labelledby="quasar-status">
              <div className="flex items-center justify-between gap-3">
                <h2 id="quasar-status" className="font-display text-xl">
                  Status
                </h2>
                <SiteStatusBadge status={site.status} />
              </div>
              {site.lastError ? (
                <p className="mt-2 text-sm text-destructive">Last error: {site.lastError}</p>
              ) : null}
              <ol className="mt-4 space-y-2 text-sm text-fg-muted">
                {site.promptHistory.map((entry, index) => (
                  <li key={`${entry.at}-${index}`}>
                    <span className="font-mono text-xs text-fg-subtle">{formatDate(entry.at)}</span>
                    <p className="mt-0.5 text-fg">{entry.prompt}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section className="surface p-5" aria-labelledby="quasar-feed">
              <h2 id="quasar-feed" className="font-display text-xl">
                Generation feed
              </h2>
              <p className="mt-1 text-xs text-fg-subtle">
                Events buffered by the service for the latest job (cursor {feed.next}).
              </p>
              <FeedList events={feed.events} />
            </section>

            <section className="surface p-5" aria-labelledby="quasar-edit">
              <h2 id="quasar-edit" className="font-display text-xl">
                Edit
              </h2>
              <form
                className="mt-3 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!editValid || generating || uncertain) return;
                  act(
                    "edit",
                    () => editSite(id, editPrompt.trim()),
                    (next) => {
                      setSite(next);
                      setEditPrompt("");
                      // The service resets the job's buffer; follow it from 0.
                      feedRef.current = EMPTY_FEED;
                      setFeed(EMPTY_FEED);
                    },
                  );
                }}
              >
                <Label htmlFor="quasar-edit-prompt">Change request</Label>
                <Textarea
                  id="quasar-edit-prompt"
                  value={editPrompt}
                  maxLength={4000}
                  rows={4}
                  placeholder="Add a colophon with the fonts used."
                  onChange={(event) => setEditPrompt(event.target.value)}
                />
                <Button
                  type="submit"
                  disabled={!editValid || generating || uncertain || busy !== null}
                >
                  {busy === "edit" ? "Sending…" : "Send edit"}
                </Button>
                {generating ? (
                  <p className="text-xs text-fg-subtle">
                    A job is running. The service refuses edits until it finishes.
                  </p>
                ) : null}
              </form>
            </section>
          </div>

          <section className="surface p-5" aria-labelledby="quasar-preview">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="quasar-preview" className="font-display text-xl">
                Preview
              </h2>
              <span className="font-mono text-[0.68rem] tracking-wide text-fg-subtle uppercase">
                {preview ? preview.state : "unknown"}
                {preview?.port ? ` · port ${preview.port}` : ""}
              </span>
            </div>
            <p className="mt-1 text-xs text-fg-subtle">
              Starting runs <span className="font-mono">next dev</span> for this site on the service
              machine and can take up to two minutes the first time.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={busy !== null || uncertain || running}
                onClick={() => act("start", () => previewStart(id), setPreview)}
              >
                {busy === "start" ? "Starting…" : "Start preview"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy !== null || uncertain || !preview || preview.state === "stopped"}
                onClick={() => act("stop", () => previewStop(id), setPreview)}
              >
                {busy === "stop" ? "Stopping…" : "Stop preview"}
              </Button>
              {href && running ? (
                <Button asChild variant="ghost">
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    Open in a new tab
                  </a>
                </Button>
              ) : null}
            </div>

            {href && running ? (
              <div className="mt-5 overflow-hidden rounded-[18px] bg-bg shadow-[var(--shadow-border)]">
                <p className="border-b border-border px-4 py-2 font-mono text-[10px] tracking-[0.16em] text-fg-subtle">
                  {href}
                </p>
                <iframe
                  title={`Preview of ${site.name}`}
                  src={href}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  referrerPolicy="no-referrer"
                  className="h-[32rem] w-full bg-bg"
                />
              </div>
            ) : (
              <p className="mt-5 text-sm text-fg-muted">
                {preview?.state === "crashed"
                  ? "The preview server exited. Its last log lines are below."
                  : preview?.state === "starting"
                    ? "The preview server is starting."
                    : "No preview running."}
              </p>
            )}

            {preview && preview.logTail.length > 0 ? (
              <details className="mt-4" open={preview.state === "crashed"}>
                <summary className="cursor-pointer text-sm text-fg-muted">Preview log</summary>
                <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-bg-subtle p-3 font-mono text-xs text-fg-muted">
                  {preview.logTail.join("\n")}
                </pre>
              </details>
            ) : null}
          </section>
        </div>
      ) : !pollError ? (
        <p className="text-sm text-fg-muted" aria-live="polite">
          Reading this site from the service…
        </p>
      ) : null}

      {actionError || uncertain ? (
        <Notice
          tone="error"
          title={uncertain ? "Outcome unknown" : "Action failed"}
          className="mt-6"
        >
          {actionError ? <p>{errorText(actionError)}</p> : null}
          {uncertain ? (
            <>
              <p>
                The last action may or may not have reached the service. Refresh state before taking
                another action.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={retry}
                disabled={busy !== null}
              >
                {busy === "retry" ? "Refreshing…" : "Retry: refresh state"}
              </Button>
            </>
          ) : null}
        </Notice>
      ) : null}
    </QuasarFrame>
  );
}

function FeedList({ events }: { events: GenerationEvent[] }) {
  if (events.length === 0) {
    return <p className="mt-4 text-sm text-fg-muted">No events buffered for the latest job.</p>;
  }
  return (
    <ol className="mt-4 max-h-[28rem] space-y-1.5 overflow-auto text-sm" aria-live="polite">
      {events.map((event, index) => (
        <li
          key={index}
          className={cn(
            event.type === "text" ? "whitespace-pre-wrap text-fg" : "font-mono text-xs",
            event.type === "tool" && "text-fg-subtle",
            event.type === "done" && "text-status-current",
            event.type === "error" && "text-destructive",
          )}
        >
          {event.type === "text"
            ? event.text
            : event.type === "tool"
              ? `${event.name}${event.path ? ` ${event.path}` : ""}`
              : event.type === "done"
                ? "done"
                : `error: ${event.message}`}
        </li>
      ))}
    </ol>
  );
}
