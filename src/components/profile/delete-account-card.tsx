import { useState, type FormEvent } from "react";
import { Surface } from "@/components/site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { confirmationMatches } from "./delete-account";

/** Better Auth error codes that mean "sign in again first", not a real failure. */
function friendlyError(code: string | undefined, message: string | undefined): string {
  if (
    code === "SESSION_EXPIRED" ||
    code === "SESSION_NOT_FRESH" ||
    /fresh|expired/i.test(message ?? "")
  ) {
    return "For safety, deleting an account needs a recent sign-in. Sign out, sign back in, and try again.";
  }
  if (code === "INVALID_PASSWORD") return "That password is not correct.";
  return message || "The account could not be deleted. Nothing was removed; try again.";
}

/**
 * Permanently delete the signed-in account. The server purges notes, consents,
 * audits and workspace connections (revoking Google grants) before Better Auth
 * removes the user; contact inquiries are kept but unlinked.
 */
export function DeleteAccountCard({
  email,
  hasPassword,
}: {
  email: string | null;
  hasPassword: boolean;
}) {
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "deleting" | "error">("idle");
  const [error, setError] = useState("");
  const ready = confirmationMatches(typed, email) && (!hasPassword || password.length > 0);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!ready || status === "deleting") return;
    setStatus("deleting");
    setError("");
    const { error: failure } = await authClient.deleteUser(hasPassword ? { password } : {});
    if (failure) {
      setStatus("error");
      setError(friendlyError(failure.code, failure.message));
      return;
    }
    window.location.assign("/");
  }

  return (
    <Surface>
      <p className="font-mono text-[0.68rem] tracking-[0.16em] text-status-partial uppercase">
        Delete account
      </p>
      <p className="mt-2 text-sm text-fg-muted">
        Permanently deletes this account, its sessions, field notes, chat consents and encrypted
        audits, and any workspace connections (Google grants are revoked). Contact inquiries you
        sent are kept, without your account attached. This cannot be undone.
      </p>
      <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
        <div className="grid gap-1.5">
          <Label htmlFor="delete-confirm">Type your email to confirm</Label>
          <Input
            id="delete-confirm"
            autoComplete="off"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={email ?? ""}
          />
        </div>
        {hasPassword ? (
          <div className="grid gap-1.5">
            <Label htmlFor="delete-password">Password</Label>
            <Input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
        ) : null}
        {error ? (
          <p className="text-sm text-status-partial" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="secondary"
          className="text-status-partial"
          disabled={!ready || status === "deleting"}
        >
          {status === "deleting" ? "Deleting…" : "Delete my account"}
        </Button>
      </form>
    </Surface>
  );
}
