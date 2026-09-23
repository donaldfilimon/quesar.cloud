import { useState, type FormEvent } from "react";
import { Surface } from "@/components/site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DISPLAY_NAME_MAX,
  providerLabel,
  validateDisplayName,
  verificationCopy,
} from "@/lib/profile";

const kicker = "text-xs text-fg-subtle";

export interface AccountView {
  name: string | null;
  email: string | null;
  image: string | null;
  /** Null while the profile row is loading or unavailable. */
  emailVerified: boolean | null;
  /** Null while loading or unavailable. */
  providers: string[] | null;
}

export function AccountCard({ account }: { account: AccountView }) {
  return (
    <Surface>
      <div className="flex items-center gap-4">
        {account.image ? (
          <img src={account.image} alt="" className="size-14 rounded-full object-cover" />
        ) : (
          <span className="grid size-14 place-items-center rounded-full bg-primary text-lg font-medium text-primary-foreground">
            {(account.name ?? account.email ?? "?").charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-base text-fg">{account.name ?? "No display name"}</p>
          <p className="truncate text-sm text-fg-muted">{account.email ?? "—"}</p>
        </div>
      </div>
      <dl className="mt-6 grid gap-4 text-sm">
        <div>
          <dt className={kicker}>Email verification</dt>
          <dd className="mt-1 text-fg-muted">
            {verificationCopy(account.emailVerified, account.providers)}
          </dd>
        </div>
        <div>
          <dt className={kicker}>Sign-in methods</dt>
          <dd className="mt-1 text-fg-muted">
            {account.providers === null
              ? "Unknown"
              : account.providers.length === 0
                ? "None linked"
                : account.providers.map(providerLabel).join(", ")}
          </dd>
        </div>
      </dl>
    </Surface>
  );
}

export type SaveName = (name: string) => Promise<{ ok: true } | { ok: false; error: string }>;

/** Edit the display name. Mirrors mlai's per-field 80-character limit in the input itself. */
export function NameForm({ initialName, onSave }: { initialName: string; onSave: SaveName }) {
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const check = validateDisplayName(name);
    if (!check.ok) {
      setStatus({ tone: "error", text: check.error });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const result = await onSave(check.name);
      setStatus(
        result.ok
          ? { tone: "ok", text: "Display name updated." }
          : { tone: "error", text: result.error },
      );
      if (result.ok) setName(check.name);
    } catch {
      setStatus({
        tone: "error",
        text: "We couldn't save your name right now. Try again in a moment.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Surface>
      <form onSubmit={handleSubmit} className="grid gap-3">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          name="displayName"
          value={name}
          maxLength={DISPLAY_NAME_MAX}
          autoComplete="name"
          onChange={(event) => setName(event.target.value)}
        />
        <p className="text-xs text-fg-subtle">
          Up to {DISPLAY_NAME_MAX} characters. Shown in the header and on notes.
        </p>
        <div>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save name"}
          </Button>
        </div>
        {status ? (
          <p
            className={
              status.tone === "error"
                ? "text-sm text-status-partial"
                : "text-sm text-status-current"
            }
            role={status.tone === "error" ? "alert" : "status"}
          >
            {status.text}
          </p>
        ) : null}
      </form>
    </Surface>
  );
}
