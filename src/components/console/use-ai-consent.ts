import { useCallback, useEffect, useRef, useState } from "react";
import {
  acceptConsent,
  getConsoleStatus,
  withdrawConsent,
  type ConsoleStatus,
} from "@/lib/console";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { staticSite } from "@/lib/static-site";

/** Cached presentation only: every request rechecks the current policy on the server. */
export function useAiConsent() {
  const { user, isPending } = useCurrentUserState();
  const owner = staticSite ? undefined : user?.id;
  const [snapshot, setSnapshot] = useState<{ owner: string; status: ConsoleStatus } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const sequence = useRef(0);
  const mutationLock = useRef(false);
  const status = snapshot?.owner === owner ? snapshot?.status : null;
  const fetchStatus = useCallback(() => {
    if (!owner) return Promise.resolve();
    const ticket = ++sequence.current;
    return getConsoleStatus().then(
      (next) => {
        if (ticket === sequence.current) {
          setSnapshot({ owner, status: next });
          setError("");
          setLoading(false);
        }
      },
      () => {
        if (ticket === sequence.current) {
          setSnapshot(null);
          setError(
            "The AI policy could not be loaded. Retry to check your session and current policy.",
          );
          setLoading(false);
        }
      },
    );
  }, [owner]);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    await fetchStatus();
  }, [fetchStatus]);
  const invalidate = useCallback(() => {
    ++sequence.current;
  }, []);
  useEffect(() => {
    void fetchStatus();
    window.addEventListener("focus", refresh);
    return () => {
      invalidate();
      window.removeEventListener("focus", refresh);
    };
  }, [fetchStatus, refresh, invalidate]);
  async function change(accept: boolean) {
    if (!owner || !status || mutationLock.current) return;
    mutationLock.current = true;
    setMutating(true);
    setError("");
    // Invalidate in-flight status reads before changing the policy.
    ++sequence.current;
    try {
      if (accept) {
        const result = await acceptConsent({
          data: { policyVersion: status.consent.policyVersion },
        });
        await refresh();
        if (!result.ok) setError(result.message);
      } else {
        await withdrawConsent();
        await refresh();
      }
    } catch {
      setSnapshot(null);
      setError("The AI policy could not be updated. Retry to check its current state.");
    } finally {
      mutationLock.current = false;
      setMutating(false);
    }
  }
  const blocked = loading || mutating || isPending;
  const ready = Boolean(
    owner && status?.encryption && status.llm.configured && status.consent.accepted && !blocked,
  );
  const reason = staticSite
    ? "Live AI is unavailable in this static preview."
    : isPending
      ? "Checking your session…"
      : !owner
        ? "Sign in to use live AI. Local tools remain available."
        : loading || !status
          ? "Checking the current AI policy…"
          : !status.encryption
            ? "Live AI is off because audit encryption is not configured."
            : !status.llm.configured
              ? "No model provider is configured. Catalog-only desk queries remain available."
              : !status.consent.accepted
                ? "Accept the current audit policy before sending to the model."
                : "";
  return {
    status,
    error,
    loading: blocked,
    ready,
    reason,
    refresh,
    accept: () => change(true),
    withdraw: () => change(false),
  };
}
export type AiConsentState = ReturnType<typeof useAiConsent>;
