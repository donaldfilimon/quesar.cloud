import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageClose, PageHero, Section, Surface } from "@/components/site";
import { Button } from "@/components/ui/button";
import { RequireSession } from "@/lib/auth/gates";
import { signOut } from "@/lib/auth/client";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/profile")({
  head: () => pageHead("Profile — Quesar", "Your Quesar console account: field notes, workspace, and sign-out."),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <RequireSession>
      {(user) => <ProfileInner user={user} />}
    </RequireSession>
  );
}

function ProfileInner({
  user,
}: {
  user: { displayName: string | null; primaryEmail: string | null; isDevFallback: boolean };
}) {
  const [signingOut, setSigningOut] = useState(false);
  return (
    <>
      <PageHero
        eyebrow="Profile"
        title={user.displayName ?? user.primaryEmail ?? "Operator"}
        lede="This account holds field notes. Documents in the workspace stay in this browser. Neither is an Abbey session."
        atmosphere="none"
      />
      <Section>
        <div className="grid gap-4 md:grid-cols-2">
          <Surface>
            <p className="font-mono text-[0.68rem] tracking-[0.16em] text-fg-subtle uppercase">Email</p>
            <p className="mt-2 text-sm">{user.primaryEmail ?? "—"}</p>
          </Surface>
          <Surface>
            <p className="font-mono text-[0.68rem] tracking-[0.16em] text-fg-subtle uppercase">Session</p>
            <p className="mt-2 text-sm text-fg-muted">
              {user.isDevFallback
                ? "Auth is off in this build, so notes use the local fallback account."
                : "Signed in. Notes are queried with your account id, not a client-supplied one."}
            </p>
            {!user.isDevFallback ? (
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
            ) : null}
          </Surface>
        </div>
      </Section>
      <PageClose
        primary={{ to: "/console", label: "Field console" }}
        secondary={[{ to: "/console/workspace", label: "Console workspace" }]}
      />
    </>
  );
}
