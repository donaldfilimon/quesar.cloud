import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageClose, PageHero, Section, Surface } from "@/components/site";
import { AccountCard, NameForm, type SaveName } from "@/components/profile/account-card";
import { DeleteAccountCard } from "@/components/profile/delete-account-card";
import { PasskeysCard } from "@/components/profile/passkeys-card";
import { BillingCard, type BillingState } from "@/components/profile/billing-card";
import {
  SessionsCard,
  type SessionRow,
  type SessionsState,
} from "@/components/profile/sessions-card";
import { Button } from "@/components/ui/button";
import { RequireSession } from "@/lib/auth/gates";
import { authClient, signOut } from "@/lib/auth/client";
import type { AppUser } from "@/lib/auth/use-current-user";
import { createCheckout, getBillingPlans } from "@/lib/billing";
import { getProfile, type ProfileRecord } from "@/lib/profile";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/profile")({
  head: () =>
    pageHead(
      "Profile — Quesar",
      "Your Quesar account: display name, sign-in methods, sessions, and billing.",
    ),
  component: ProfilePage,
});

const SESSIONS_FAILED = "Sessions could not be loaded. Try again in a moment.";

function ProfilePage() {
  return <RequireSession feature="Your profile">{(user) => <ProfileInner user={user} />}</RequireSession>;
}

function ProfileInner({ user }: { user: AppUser }) {
  const [profile, setProfile] = useState<ProfileRecord | null | "error">(null);
  const canSignOut = !user.isDevFallback;

  const loadProfile = useCallback(() => {
    // The disabled-auth dev user has no row by construction.
    if (user.isDevFallback) return;
    getProfile()
      .then((record) => setProfile(record))
      .catch(() => setProfile("error"));
  }, [user.isDevFallback]);
  useEffect(loadProfile, [loadProfile]);

  const record = profile && profile !== "error" ? profile : null;
  const account = {
    name: record?.name ?? user.displayName,
    email: record?.email ?? user.primaryEmail,
    image: record?.image ?? user.profileImageUrl,
    emailVerified: record ? record.emailVerified : null,
    providers: record ? record.providers : null,
  };

  const saveName: SaveName = async (name) => {
    const { error } = await authClient.updateUser({ name });
    if (error)
      return { ok: false, error: error.message ?? "We couldn't save your name. Try again." };
    loadProfile();
    return { ok: true };
  };

  return (
    <>
      <PageHero
        eyebrow="Profile"
        title={account.name ?? account.email ?? "Operator"}
        lede="Your account, the devices signed in to it, and billing. Field notes live under this account; workspace documents stay in this browser."
      />
      <Section>
        {profile === "error" ? (
          <p className="mb-4 text-sm text-status-partial" role="alert">
            Account details could not be loaded. Showing what the session knows.
          </p>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          <AccountCard account={account} />
          {user.isDevFallback ? (
            <Surface>
              <p className="text-xs text-fg-subtle">
                Session
              </p>
              <p className="mt-2 text-sm text-fg-muted">
                Auth is off in this build, so notes use the local fallback account. There is no name
                to edit and no session to manage.
              </p>
            </Surface>
          ) : (
            <NameForm initialName={account.name ?? ""} onSave={saveName} />
          )}
        </div>
        {user.isDevFallback ? null : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <SessionsPanel canSignOut={canSignOut} />
            <Surface>
              <p className="text-xs text-fg-subtle">
                This device
              </p>
              <p className="mt-2 text-sm text-fg-muted">
                Signed in. Notes are queried with your account id, not a client-supplied one.
              </p>
              {canSignOut ? <SignOutButton /> : null}
            </Surface>
            <PasskeysCard />
          </div>
        )}
      </Section>
      <Section eyebrow="Billing" title="Plans">
        <BillingPanel />
      </Section>
      {canSignOut ? (
        <Section eyebrow="Account" title="Delete account">
          <DeleteAccountCard
            email={account.email}
            hasPassword={Boolean(account.providers?.includes("credential"))}
          />
        </Section>
      ) : null}
      <PageClose
        primary={{ to: "/console", label: "Field console" }}
        secondary={[{ to: "/console/workspace", label: "Console workspace" }]}
      />
    </>
  );
}

function SignOutButton() {
  const [signingOut, setSigningOut] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      className="mt-4"
      disabled={signingOut}
      onClick={() => {
        setSigningOut(true);
        void signOut("/").catch(() => setSigningOut(false));
      }}
    >
      {signingOut ? "Signing out…" : "Sign out"}
    </Button>
  );
}

/** Mounted only with auth on, so `authClient.useSession()` always runs in the same hook order. */
function SessionsPanel({ canSignOut }: { canSignOut: boolean }) {
  const { data } = authClient.useSession();
  const currentSessionId = data?.session.id ?? null;
  const [state, setState] = useState<SessionsState>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // State is only set from the settled promise, so the mount effect below
  // never updates state synchronously.
  const load = useCallback(
    () =>
      authClient.listSessions().then(
        ({ data: sessions, error }) => {
          if (error) {
            // `list-sessions` answers 403 SESSION_NOT_FRESH once this sign-in is older than a day.
            const stale = error.status === 403 || error.code === "SESSION_NOT_FRESH";
            setState(stale ? { kind: "stale" } : { kind: "error", message: SESSIONS_FAILED });
            return;
          }
          setState({ kind: "ready", sessions: (sessions ?? []) as SessionRow[] });
        },
        () => {
          setState({ kind: "error", message: SESSIONS_FAILED });
        },
      ),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<{ error: { message?: string } | null }>, done: string) {
    setBusy(true);
    setNotice(null);
    try {
      const { error } = await action();
      setNotice(error ? (error.message ?? "That did not work. Try again.") : done);
      await load();
    } catch {
      setNotice("That did not work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signOutEverywhere() {
    setBusy(true);
    setNotice(null);
    // Revoke the others, then end this session through `signOut`, which also
    // reports a sign-out only once the server confirms it.
    let revoked: boolean;
    try {
      const { error } = await authClient.revokeOtherSessions();
      revoked = !error;
    } catch {
      revoked = false;
    }
    if (!revoked) {
      setNotice("Other sessions could not be revoked. Nothing was signed out. Try again.");
      setBusy(false);
      return;
    }
    try {
      await signOut("/");
    } catch {
      setNotice(
        "Other sessions were revoked, but this device could not be signed out. Use Sign out to try again.",
      );
      setBusy(false);
      void load();
    }
  }

  return (
    <div className="grid gap-2">
      <SessionsCard
        state={state}
        currentSessionId={currentSessionId}
        busy={busy}
        canSignOut={canSignOut}
        onRevoke={(token) =>
          void run(() => authClient.revokeSession({ token }), "Session revoked.")
        }
        onRevokeOthers={() =>
          void run(() => authClient.revokeOtherSessions(), "Other sessions revoked.")
        }
        onSignOutEverywhere={() => void signOutEverywhere()}
      />
      {notice ? (
        <p className="text-sm text-fg-muted" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  );
}

function BillingPanel() {
  const [state, setState] = useState<BillingState>({ kind: "loading" });
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<{ error: string; nextStep?: string } | null>(null);

  useEffect(() => {
    getBillingPlans()
      .then((result) => setState({ kind: "loaded", result }))
      .catch(() => setState({ kind: "error" }));
  }, []);

  async function checkout(planId: string) {
    setPendingPlan(planId);
    setMessage(null);
    try {
      const result = await createCheckout({ data: { planId } });
      if (result.ok) {
        window.location.href = result.url;
        return;
      }
      setMessage({ error: result.error, nextStep: result.nextStep });
    } catch {
      // Only faults the server did not speak for land here; don't guess the cause.
      setMessage({ error: "Checkout could not be started. Please try again." });
    }
    setPendingPlan(null);
  }

  return (
    <BillingCard
      state={state}
      pendingPlan={pendingPlan}
      message={message}
      onCheckout={(id) => void checkout(id)}
    />
  );
}
