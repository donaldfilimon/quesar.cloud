import { Surface } from "@/components/site";
import { Button } from "@/components/ui/button";

export interface SessionRow {
  id: string;
  token: string;
  createdAt: Date | string;
  expiresAt: Date | string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export type SessionsState =
  | { kind: "loading" }
  /** Better Auth refuses `list-sessions` once the session is older than `freshAge` (1 day). */
  | { kind: "stale" }
  | { kind: "error"; message: string }
  | { kind: "ready"; sessions: SessionRow[] };

function when(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "unknown" : date.toLocaleString();
}

export function SessionsCard({
  state,
  currentSessionId,
  busy,
  canSignOut,
  onRevoke,
  onRevokeOthers,
  onSignOutEverywhere,
}: {
  state: SessionsState;
  currentSessionId: string | null;
  busy: boolean;
  /** False for the disabled-auth dev user, who has no session to end. */
  canSignOut: boolean;
  onRevoke: (token: string) => void;
  onRevokeOthers: () => void;
  onSignOutEverywhere: () => void;
}) {
  const others =
    state.kind === "ready" ? state.sessions.filter((s) => s.id !== currentSessionId) : [];
  return (
    <Surface>
      <p className="font-mono text-[0.68rem] tracking-[0.16em] text-fg-subtle uppercase">
        Active sessions
      </p>
      {state.kind === "loading" ? (
        <p className="mt-3 text-sm text-fg-muted">Loading sessions…</p>
      ) : null}
      {state.kind === "stale" ? (
        <p className="mt-3 text-sm text-fg-muted">
          This sign-in is more than a day old. Sign out and sign in again to manage sessions.
        </p>
      ) : null}
      {state.kind === "error" ? (
        <p className="mt-3 text-sm text-status-partial" role="alert">
          {state.message}
        </p>
      ) : null}
      {state.kind === "ready" ? (
        <ul className="mt-3 grid gap-3">
          {state.sessions.map((session) => {
            const current = session.id === currentSessionId;
            return (
              <li
                key={session.id}
                className="flex flex-wrap items-start justify-between gap-3 border-t border-border pt-3"
              >
                <div className="min-w-0 text-sm">
                  <p className="truncate text-fg" title={session.userAgent ?? undefined}>
                    {session.userAgent || "Unknown device"}
                  </p>
                  <p className="text-xs text-fg-subtle">
                    {session.ipAddress ? `${session.ipAddress} · ` : ""}
                    signed in {when(session.createdAt)} · expires {when(session.expiresAt)}
                  </p>
                </div>
                {current ? (
                  <span className="font-mono text-[10px] tracking-[0.14em] text-status-current uppercase">
                    This device
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => onRevoke(session.token)}
                  >
                    Revoke
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
      <p className="mt-4 text-xs text-fg-subtle">
        A revoked device can stay signed in for up to five minutes while its cached session expires.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={busy || (state.kind === "ready" && others.length === 0)}
          onClick={onRevokeOthers}
        >
          Sign out other sessions
        </Button>
        {canSignOut ? (
          <Button type="button" variant="secondary" disabled={busy} onClick={onSignOutEverywhere}>
            Sign out everywhere
          </Button>
        ) : null}
      </div>
    </Surface>
  );
}
