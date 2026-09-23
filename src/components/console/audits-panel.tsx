import { Download, Eye, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  deleteMyAudit,
  listMyAudits,
  readMyAudit,
  type AuditRecord,
  type AuditSummary,
} from "@/lib/console";
import { AuditView } from "./audit-view";
import { day, downloadAudit, unexpected, when } from "./format";

/** Your own live conversation audits: list, open (decrypt), export, delete. Every access is logged. */
export function AuditsPanel() {
  const [audits, setAudits] = useState<AuditSummary[] | null>(null);
  const [selected, setSelected] = useState<AuditRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // State is only set from the settled promise, so the mount effect below
  // never updates state synchronously.
  const fetchAudits = useCallback(
    () =>
      listMyAudits().then(
        (rows) => {
          setAudits(rows);
        },
        (cause: unknown) => {
          setError(unexpected("Your audit history could not be loaded right now.", cause));
        },
      ),
    [],
  );

  const refresh = useCallback(async () => {
    setError("");
    await fetchAudits();
  }, [fetchAudits]);

  useEffect(() => {
    void fetchAudits();
  }, [fetchAudits]);

  async function open(id: string, download = false) {
    setBusy(true);
    setError("");
    try {
      const result = await readMyAudit({ data: { id, download } });
      if (!result.ok) {
        setError(result.message);
        if (result.reason === "not_found") await refresh();
        return;
      }
      if (download) downloadAudit(result.audit);
      else setSelected(result.audit);
    } catch (cause) {
      setError(
        unexpected(
          "That audit record could not be opened right now. Try again in a moment.",
          cause,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError("");
    try {
      const result = await deleteMyAudit({ data: { id } });
      if (!result.ok) setError(result.message);
      else toast.success("Audit deleted.");
      if (selected?.id === id) setSelected(null);
      await refresh();
    } catch (cause) {
      setError(
        unexpected(
          "That audit record could not be deleted right now. Try again in a moment.",
          cause,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="max-w-3xl">
        <h2 className="text-lg text-fg">Your encrypted audits</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Read, export or delete your live conversation records. Each is sealed with AES-256-GCM and
          expires one year after it was written. Listing, reading, exporting and deleting are all
          recorded in the access log.
        </p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-status-partial">
          {error}
        </p>
      ) : null}
      {audits === null && !error ? (
        <p className="text-sm text-fg-muted">Loading your audits…</p>
      ) : null}
      {audits?.length === 0 ? (
        <p className="text-sm text-fg-muted">
          No durable conversations yet. A chat reply creates one.
        </p>
      ) : null}
      {audits && audits.length > 0 ? (
        <ul className="grid gap-3">
          {audits.map((audit) => (
            <li
              key={audit.id}
              className="grid gap-3 rounded-lg bg-card p-4 shadow-[var(--shadow-border)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <p className="font-mono text-xs text-fg">
                  {audit.provider} · {audit.model}
                </p>
                <p className="mt-1 text-xs text-fg-subtle">
                  {when(audit.createdAt)} · expires {day(audit.expiresAt)}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="View audit"
                  disabled={busy}
                  onClick={() => void open(audit.id)}
                >
                  <Eye className="size-4" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Export audit"
                  disabled={busy}
                  onClick={() => void open(audit.id, true)}
                >
                  <Download className="size-4" aria-hidden />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" aria-label="Delete audit" disabled={busy}>
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this audit now?</AlertDialogTitle>
                      <AlertDialogDescription>
                        The live encrypted record is removed from your account and the deletion is
                        logged. This site cannot restore it.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep</AlertDialogCancel>
                      <AlertDialogAction onClick={() => void remove(audit.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {selected ? <AuditView audit={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
