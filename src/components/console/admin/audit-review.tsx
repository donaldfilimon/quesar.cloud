import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  adminAudits,
  adminDeleteAuditFn,
  adminReadAuditFn,
  type AuditRecord,
  type AuditSummary,
} from "@/lib/console";
import { AuditView } from "../audit-view";
import { day, unexpected, when } from "../format";

const REASON_MIN = 8;
const REASON_MAX = 200;

/** Cross-user audit review. Every list, read and delete carries a reason and is logged as `admin`. */
export function AuditReview() {
  const [reason, setReason] = useState("");
  const [userId, setUserId] = useState("");
  const [audits, setAudits] = useState<AuditSummary[] | null>(null);
  const [selected, setSelected] = useState<AuditRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const trimmed = reason.trim();
  const reasonOk = trimmed.length >= REASON_MIN && trimmed.length <= REASON_MAX;

  async function run<T>(task: () => Promise<T>, fallback: string): Promise<T | undefined> {
    setBusy(true);
    setError("");
    try {
      return await task();
    } catch (cause) {
      setError(unexpected(fallback, cause));
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  async function load() {
    const result = await run(
      () => adminAudits({ data: { reason: trimmed, userId: userId.trim() || undefined } }),
      "The audit inventory could not be loaded right now.",
    );
    if (!result) return;
    if (!result.ok) {
      setAudits(null);
      setError(result.message);
    } else setAudits(result.audits);
  }

  async function read(id: string) {
    const result = await run(
      () => adminReadAuditFn({ data: { id, reason: trimmed } }),
      "That audit could not be opened.",
    );
    if (!result) return;
    if (!result.ok) setError(result.message);
    else setSelected(result.audit);
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this user's audit now? The deletion and your reason are logged."))
      return;
    const result = await run(
      () => adminDeleteAuditFn({ data: { id, reason: trimmed } }),
      "That audit could not be deleted.",
    );
    if (!result) return;
    if (!result.ok) setError(result.message);
    else {
      toast.success("Audit deleted and logged.");
      if (selected?.id === id) setSelected(null);
      setAudits((rows) => rows?.filter((row) => row.id !== id) ?? null);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 rounded-xl bg-card p-5 shadow-border">
        <div>
          <Label htmlFor="admin-reason">Reason for this access</Label>
          <Textarea
            id="admin-reason"
            className="mt-1"
            rows={2}
            maxLength={REASON_MAX}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={`Why you are reviewing these records (${REASON_MIN}–${REASON_MAX} characters). Logged with every action.`}
          />
          <p className="mt-1 font-mono text-10 text-fg-subtle">
            {trimmed.length}/{REASON_MAX}
          </p>
        </div>
        <div>
          <Label htmlFor="admin-user">User id (optional)</Label>
          <Input
            id="admin-user"
            className="mt-1"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="Filter to one account's audits"
          />
        </div>
        <Button onClick={() => void load()} disabled={busy || !reasonOk}>
          Load reason-logged inventory
        </Button>
        {error ? (
          <p role="alert" className="text-sm text-status-partial">
            {error}
          </p>
        ) : null}
      </div>

      {audits?.length === 0 ? <p className="text-sm text-fg-muted">No live audits match.</p> : null}
      {audits && audits.length > 0 ? (
        <ul className="grid gap-2">
          {audits.map((audit) => (
            <li
              key={audit.id}
              className="grid gap-3 rounded-lg bg-card p-3 shadow-border sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-xs text-fg">{audit.userId}</p>
                <p className="mt-1 text-xs text-fg-subtle">
                  {audit.model} · {when(audit.createdAt)} · expires {day(audit.expiresAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy || !reasonOk}
                  onClick={() => void read(audit.id)}
                >
                  Read
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy || !reasonOk}
                  onClick={() => void remove(audit.id)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {selected ? <AuditView audit={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
