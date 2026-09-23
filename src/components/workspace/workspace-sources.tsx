/* Console workspace → Sources. The Files panel from mlai's ConsoleWorkspace
   (b6f3686): Google Drive and SharePoint / OneDrive results grouped by source,
   with type filters, a search box and a rows/grid toggle, restyled onto
   quesar's tokens and ui primitives.

   Data arrives through `@/lib/workspace-connectors/sources`, backed by the
   same-origin /api/workspace/* server routes. Provider tokens live server-side
   only; this view never holds one. A source the user has not linked comes back
   as `unconfigured` and renders a Connect link rather than an error. Files open
   at the provider in a new tab, exactly as in mlai. */
import { useHydrated } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Cloud,
  File as FileIcon,
  FileText,
  HardDrive,
  LayoutGrid,
  Link2 as LinkIcon,
  List,
  Presentation,
  Table2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  connectHref,
  describeCallbackError,
  disconnectProvider,
  fetchConnections,
  type ProviderConnection,
} from "@/lib/workspace-connectors/client";
import {
  DEFAULT_WINDOW,
  KIND_LABEL,
  SOURCE_PROVIDER,
  countByKind,
  filterFiles,
  formatFileSize,
  formatModified,
  liveWorkspaceAdapters,
  loadWorkspaceSources,
  type WorkspaceFile,
  type WorkspaceFileKind,
  type WorkspaceProviderSlug,
  type WorkspaceSourceId,
  type WorkspaceSourceResult,
} from "@/lib/workspace-connectors/sources";
import { cn } from "@/lib/utils";

type Connections = Partial<Record<WorkspaceProviderSlug, ProviderConnection>>;

const KIND_ICON: Record<WorkspaceFileKind, LucideIcon> = {
  doc: FileText,
  slides: Presentation,
  sheet: Table2,
  pdf: FileIcon,
  other: FileIcon,
};

const SOURCE_ICON: Record<WorkspaceSourceId, LucideIcon> = {
  "google-drive": HardDrive,
  sharepoint: Cloud,
};

const FILTERS: readonly (readonly [string, WorkspaceFileKind | null])[] = [
  ["All", null],
  [KIND_LABEL.doc, "doc"],
  [KIND_LABEL.slides, "slides"],
  [KIND_LABEL.sheet, "sheet"],
  [KIND_LABEL.pdf, "pdf"],
];

const EYEBROW = "text-xs text-fg-subtle";

export function WorkspaceSources() {
  const [view, setView] = useState<"rows" | "grid">("rows");
  const [kind, setKind] = useState<WorkspaceFileKind | null>(null);
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState<WorkspaceSourceResult[] | null>(null);
  const [connections, setConnections] = useState<Connections>({});
  const [connectionsError, setConnectionsError] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState<WorkspaceProviderSlug | null>(null);

  /* The OAuth callback returns here with ?connected=<provider> or ?error=<code>.
     Show it once, then drop it from the address bar. The URL is read on the
     first client render after hydration (the server can't see it, and the
     hydration pass must match the server HTML); the address bar is rewritten
     in the effect once that read has happened. */
  const hydrated = useHydrated();
  const [callbackRead, setCallbackRead] = useState(false);
  if (hydrated && !callbackRead) {
    setCallbackRead(true);
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error = params.get("error");
    if (connected === "google" || connected === "microsoft") {
      setNotice({
        tone: "ok",
        text: `${connected === "google" ? "Google Drive" : "SharePoint / OneDrive"} connected.`,
      });
    } else if (error) {
      setNotice({ tone: "error", text: describeCallbackError(error) });
    }
  }

  useEffect(() => {
    if (!callbackRead) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.get("connected") && !params.get("error")) return;
    params.delete("connected");
    params.delete("error");
    const rest = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${rest ? `?${rest}` : ""}`,
    );
  }, [callbackRead]);

  useEffect(() => {
    const controller = new AbortController();
    let live = true;
    void loadWorkspaceSources(liveWorkspaceAdapters(), DEFAULT_WINDOW, controller.signal).then(
      (result) => {
        if (live) setSources(result);
      },
    );
    return () => {
      live = false;
      controller.abort();
    };
  }, [reload]);

  /* Which accounts are linked, and which providers the server can offer at all:
     an unavailable provider gets no Connect link, because following it would
     only bounce off missing configuration. */
  useEffect(() => {
    const controller = new AbortController();
    let live = true;
    fetchConnections(controller.signal)
      .then((result) => {
        if (!live) return;
        if (result.ok) {
          setConnections(result.providers);
          setConnectionsError(null);
        } else {
          setConnectionsError(result.status);
        }
      })
      .catch(() => {
        /* Aborted or offline; each source still reports its own state. */
      });
    return () => {
      live = false;
      controller.abort();
    };
  }, [reload]);

  const disconnect = useCallback(async (provider: WorkspaceProviderSlug) => {
    setBusy(provider);
    try {
      const result = await disconnectProvider(provider);
      const label = provider === "google" ? "Google Drive" : "SharePoint / OneDrive";
      if (!result.ok)
        setNotice({ tone: "error", text: `${label} could not be disconnected. Try again.` });
      else if (result.revoked)
        setNotice({ tone: "ok", text: `${label} disconnected and the grant revoked.` });
      else
        setNotice({
          tone: "ok",
          text:
            provider === "microsoft"
              ? `${label} disconnected. Microsoft has no delegated revoke; remove the app in My Apps to clear the grant.`
              : `${label} disconnected here. The grant could not be revoked at Google; remove it in your Google account settings.`,
        });
    } catch {
      setNotice({ tone: "error", text: "Disconnect failed. Check your connection and try again." });
    } finally {
      setBusy(null);
      setReload((n) => n + 1);
    }
  }, []);

  const allFiles = useMemo(() => (sources ?? []).flatMap((source) => source.files), [sources]);
  const counts = useMemo(() => countByKind(allFiles), [allFiles]);
  const matched = useMemo(() => filterFiles(allFiles, { kind, query }), [allFiles, kind, query]);
  const filtering = kind !== null || query.trim().length > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={cn(EYEBROW, "text-accent")}>Connected sources</p>
          <h2 className="mt-1 font-display text-2xl">Files</h2>
          <p className="mt-1 font-mono text-[11px] text-fg-muted">
            {sources === null ? "Loading" : `${matched.length} shown`} · last {DEFAULT_WINDOW.days}{" "}
            days · read-only
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search files"
            aria-label="Search connected files"
            className="h-9 w-48 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          />
          <div className="flex rounded-md border border-border" role="group" aria-label="Layout">
            {(
              [
                ["rows", "Rows", List],
                ["grid", "Grid", LayoutGrid],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                aria-pressed={view === id}
                className={cn(
                  "flex h-9 items-center gap-1.5 px-3 text-xs",
                  view === id ? "bg-primary/10 text-fg" : "text-fg-muted hover:bg-muted",
                )}
              >
                <Icon size={14} aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {notice ? (
        <p
          role="status"
          className={cn(
            "mt-4 rounded-md border px-3 py-2 text-sm",
            notice.tone === "ok"
              ? "border-border text-fg"
              : "border-destructive/40 text-destructive",
          )}
        >
          {notice.text}
        </p>
      ) : null}

      {connectionsError !== null ? (
        <p className="mt-4 rounded-md border border-border px-3 py-2 text-sm text-fg-muted">
          {connectionsError === 401
            ? "Sign in again to manage connected sources."
            : `Connection status is unavailable (HTTP ${connectionsError}).`}
        </p>
      ) : null}

      <div className="mt-5 mb-6 flex flex-wrap gap-2">
        {FILTERS.map(([label, value]) => {
          const on = value === kind;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setKind(value)}
              aria-pressed={on}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                on
                  ? "border-primary/50 bg-primary/10 text-fg"
                  : "border-border text-fg-muted hover:bg-muted",
              )}
            >
              {label} <span className="opacity-60">{counts[label] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {sources === null ? (
        <Panel>
          <p className="text-sm text-fg-muted">Loading connected sources…</p>
        </Panel>
      ) : (
        sources.map((source) => (
          <SourceSection
            key={source.source}
            source={source}
            files={filterFiles(source.files, { kind, query })}
            view={view}
            filtering={filtering}
            connection={connections[SOURCE_PROVIDER[source.source]]}
            busy={busy === SOURCE_PROVIDER[source.source]}
            onDisconnect={disconnect}
          />
        ))
      )}
    </div>
  );
}

function SourceSection({
  source,
  files,
  view,
  filtering,
  connection,
  busy,
  onDisconnect,
}: {
  source: WorkspaceSourceResult;
  files: WorkspaceFile[];
  view: "rows" | "grid";
  filtering: boolean;
  connection: ProviderConnection | undefined;
  busy: boolean;
  onDisconnect: (provider: WorkspaceProviderSlug) => void;
}) {
  const Icon = SOURCE_ICON[source.source];
  const provider = SOURCE_PROVIDER[source.source];

  return (
    <section className="mb-7 last:mb-0" aria-label={source.label}>
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <Icon size={15} aria-hidden className="text-accent" />
        <h3 className="text-sm font-semibold">{source.label}</h3>
        <span className={EYEBROW}>
          {source.status === "ok"
            ? `${files.length} files · ${source.identity === "google" ? "my drive" : "tenant"}`
            : source.status === "unconfigured"
              ? source.message === "reauth_required"
                ? "reconnect required"
                : "not connected"
              : source.status}
        </span>
        <span className="h-px min-w-4 flex-1 bg-border" aria-hidden />
        {connection?.stored ? (
          <>
            {connection.accountEmail ? (
              <span className="font-mono text-[10.5px] text-fg-muted">
                {connection.accountEmail}
              </span>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => onDisconnect(provider)}
            >
              {busy ? "Disconnecting…" : "Disconnect"}
            </Button>
          </>
        ) : null}
      </div>

      {source.status === "error" ? (
        <EmptyPanel
          title={`${source.label} could not be reached.`}
          detail={source.message ?? "The source returned an error."}
        />
      ) : source.status === "unconfigured" ? (
        source.message === "reauth_required" || connection?.reason === "reauth_required" ? (
          <ConnectPanel label={source.label} provider={provider} reconnect />
        ) : connection && !connection.configured ? (
          <EmptyPanel
            title={`${source.label} is not available on this deployment.`}
            detail={
              connection.reason === "encryption_not_configured"
                ? "APP_ENCRYPTION_KEY is not set · tokens cannot be sealed, so connect is off"
                : "No OAuth client configured for this provider"
            }
          />
        ) : (
          <ConnectPanel label={source.label} provider={provider} />
        )
      ) : source.files.length === 0 ? (
        <EmptyPanel
          title={`No files returned for the last ${DEFAULT_WINDOW.days} days.`}
          detail={
            source.identity === "microsoft"
              ? "Microsoft 365 connected · tenant empty or out of scope"
              : "Source connected · nothing in window"
          }
        />
      ) : files.length === 0 && filtering ? (
        <EmptyPanel
          title="Nothing matches the current filter."
          detail={`${source.files.length} file(s) in this source are hidden by the search or type filter.`}
        />
      ) : view === "rows" ? (
        <FileRows files={files} />
      ) : (
        <FileGrid files={files} />
      )}
    </section>
  );
}

function FileRows({ files }: { files: WorkspaceFile[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div
        className={cn(
          EYEBROW,
          "hidden grid-cols-[minmax(0,3fr)_110px_130px_90px] gap-3 border-b border-border px-4 py-2 sm:grid",
        )}
      >
        <span>Name</span>
        <span>Type</span>
        <span>Modified</span>
        <span className="text-right">Size</span>
      </div>
      {files.map((file) => {
        const Icon = KIND_ICON[file.kind];
        return (
          <a
            key={file.id}
            href={file.url}
            target="_blank"
            rel="noreferrer noopener"
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border px-4 py-2.5 text-sm no-underline last:border-b-0 hover:bg-muted sm:grid-cols-[minmax(0,3fr)_110px_130px_90px]"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <Icon size={14} aria-hidden className="shrink-0 text-accent" />
              <span className="truncate text-fg">{file.title}</span>
            </span>
            <span className="hidden font-mono text-[11px] text-fg-muted sm:block">
              {KIND_LABEL[file.kind]}
            </span>
            <span className="text-xs text-fg-muted">{formatModified(file.modified)}</span>
            <span className="hidden text-right font-mono text-[11px] text-fg-muted sm:block">
              {formatFileSize(file.sizeBytes)}
            </span>
          </a>
        );
      })}
    </div>
  );
}

function FileGrid({ files }: { files: WorkspaceFile[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-3">
      {files.map((file) => {
        const Icon = KIND_ICON[file.kind];
        return (
          <a
            key={file.id}
            href={file.url}
            target="_blank"
            rel="noreferrer noopener"
            className="flex flex-col gap-3 rounded-lg border border-border p-4 no-underline hover:bg-muted"
          >
            <Icon size={28} aria-hidden className="text-accent" />
            <span className="min-w-0">
              <span className="block truncate text-sm text-fg">{file.title}</span>
              <span className="mt-1 block font-mono text-[10.5px] text-fg-muted">
                {KIND_LABEL[file.kind]} · {formatModified(file.modified)} ·{" "}
                {formatFileSize(file.sizeBytes)}
              </span>
            </span>
          </a>
        );
      })}
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-border px-5 py-6">{children}</div>;
}

function EmptyPanel({ title, detail }: { title: string; detail: string }) {
  return (
    <Panel>
      <p className="text-sm text-fg-muted">{title}</p>
      <p className={cn(EYEBROW, "mt-1.5")}>{detail}</p>
    </Panel>
  );
}

/* A plain link, not a form: the connect route answers with a cross-origin
   redirect to the provider's consent screen. */
function ConnectPanel({
  label,
  provider,
  reconnect = false,
}: {
  label: string;
  provider: WorkspaceProviderSlug;
  /** The stored authorization no longer opens (for example after a key rotation). */
  reconnect?: boolean;
}) {
  return (
    <Panel>
      <p className="mb-3 text-sm text-fg-muted">
        {reconnect
          ? `The saved ${label} authorization can no longer be used. Reconnect to see your files again, or disconnect to remove it.`
          : `Connect ${label} to see your recent files here.`}
      </p>
      <Button asChild size="sm">
        <a href={connectHref(provider)}>
          <LinkIcon size={13} aria-hidden />
          {reconnect ? "Reconnect" : "Connect"} {label}
        </a>
      </Button>
      <p className={cn(EYEBROW, "mt-3")}>Read-only access · disconnect any time</p>
    </Panel>
  );
}
