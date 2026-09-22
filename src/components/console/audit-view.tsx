import { Button } from "@/components/ui/button";
import type { AuditRecord } from "@/lib/console";
import { day, when } from "./format";

/** A decrypted audit: metadata, then the stored turns and reply. */
export function AuditView({ audit, onClose }: { audit: AuditRecord; onClose: () => void }) {
  return (
    <div
      className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]"
      aria-label={`Audit ${audit.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-all font-mono text-xs text-accent">audit {audit.id}</p>
          <p className="mt-1 text-xs text-fg-subtle">
            {audit.provider} · {audit.model} · {when(audit.createdAt)} · expires{" "}
            {day(audit.expiresAt)} · policy {audit.policyVersion}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <ol className="mt-4 grid gap-2">
        {audit.content.messages.map((message, index) => (
          <li key={index} className="rounded-md bg-bg-subtle px-3 py-2 text-sm text-fg-muted">
            <span className="font-mono text-[10px] tracking-[0.14em] text-fg-subtle uppercase">
              {message.role}
            </span>
            <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
          </li>
        ))}
        <li className="rounded-md bg-bg-subtle px-3 py-2 text-sm text-fg">
          <span className="font-mono text-[10px] tracking-[0.14em] text-accent uppercase">
            reply
          </span>
          <p className="mt-1 whitespace-pre-wrap">{audit.content.reply}</p>
        </li>
      </ol>
      <p className="mt-3 break-all font-mono text-[10px] text-fg-subtle">
        sha-256 {audit.contentDigest}
      </p>
    </div>
  );
}
