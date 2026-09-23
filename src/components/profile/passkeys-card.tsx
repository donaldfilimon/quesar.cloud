import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Surface } from "@/components/site";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

interface PasskeyRow {
  id: string;
  name?: string | null;
  deviceType: string;
  backedUp: boolean;
  createdAt?: Date | string | null;
}

type PasskeysState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; passkeys: PasskeyRow[] };

function when(value: Date | string | null | undefined): string {
  if (!value) return "unknown";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "unknown" : date.toLocaleDateString();
}

/** Register, list and remove passkeys (WebAuthn) for the signed-in account. */
export function PasskeysCard() {
  const [state, setState] = useState<PasskeysState>({ kind: "loading" });
  const [busy, setBusy] = useState(false);

  // State is only set from the settled promise, so the mount effect below
  // never updates state synchronously.
  const load = useCallback(
    () =>
      authClient.passkey.listUserPasskeys().then(({ data, error }) => {
        if (error)
          setState({ kind: "error", message: "Passkeys could not be loaded. Try again in a moment." });
        else setState({ kind: "ready", passkeys: (data ?? []) as PasskeyRow[] });
      }),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    setBusy(true);
    try {
      const result = await authClient.passkey.addPasskey({ name: "Quesar passkey" });
      if (result?.error) toast.error(result.error.message ?? "The passkey was not added.");
      else toast.success("Passkey added. You can sign in with it next time.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      const { error } = await authClient.passkey.deletePasskey({ id });
      if (error) toast.error(error.message ?? "The passkey was not removed.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Surface>
      <p className="text-xs text-fg-subtle">
        Passkeys
      </p>
      <p className="mt-2 text-sm text-fg-muted">
        Sign in with Face ID, Touch ID, Windows Hello or a security key instead of a password.
      </p>
      {state.kind === "loading" ? (
        <p className="mt-3 text-sm text-fg-muted">Loading passkeys…</p>
      ) : null}
      {state.kind === "error" ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      {state.kind === "ready" ? (
        state.passkeys.length === 0 ? (
          <p className="mt-3 text-sm text-fg-muted">No passkeys yet.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {state.passkeys.map((key) => (
              <li key={key.id} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  {key.name || "Passkey"}
                  <span className="text-fg-subtle">
                    {" "}
                    · added {when(key.createdAt)}
                    {key.backedUp ? " · synced" : ""}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void remove(key.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )
      ) : null}
      <Button
        type="button"
        className="mt-4"
        variant="secondary"
        disabled={busy}
        onClick={() => void add()}
      >
        Add a passkey
      </Button>
    </Surface>
  );
}
