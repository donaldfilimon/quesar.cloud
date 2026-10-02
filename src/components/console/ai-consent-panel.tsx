import { Button } from "@/components/ui/button";
import { Surface } from "@/components/site";
import type { AiConsentState } from "./use-ai-consent";
import { day } from "./format";

export function AiConsentPanel({
  consent,
  busy = false,
}: {
  consent: AiConsentState;
  busy?: boolean;
}) {
  const { status } = consent;
  return (
    <Surface>
      <p className="text-xs text-accent">AI transmission and audit policy</p>
      <p className="mt-2 text-sm text-fg-muted">
        After a model request is admitted, your submitted prompts and context can be sent to the
        configured model provider. We do not automatically add your account email; content you
        submit may contain identifying information. Successful exchanges are sealed with
        AES-256-GCM, bound to your account, and assigned a {status?.policy.retentionDays ?? 365}-day
        expiry. Automatic deletion requires the configured expiry job. You can inspect, export, and
        delete your available audits. Allowlisted administrators with a linked Google or Apple
        account can review and delete available audits with a stated reason; those actions are
        logged. A model reply is shown only after its sealed audit is stored.
      </p>
      <p className="mt-2 text-xs text-fg-muted">
        Consent is checked when a request is admitted. Withdrawal blocks future admissions; it does
        not cancel requests already admitted or sent.
      </p>
      <p className="mt-3 font-mono text-xs text-fg-subtle">
        policy {status?.consent.policyVersion ?? "not loaded"} ·{" "}
        {status?.llm.model ? `${status.llm.provider} / ${status.llm.model}` : "no model loaded"}
      </p>
      {status?.consent.accepted ? (
        <>
          <p className="mt-2 text-xs text-status-current">
            Accepted{status.consent.consentedAt ? ` ${day(status.consent.consentedAt)}` : ""}.
          </p>
          <Button
            type="button"
            className="mt-3"
            variant="secondary"
            disabled={busy || consent.loading}
            onClick={() => void consent.withdraw()}
          >
            Withdraw consent
          </Button>
        </>
      ) : (
        <Button
          type="button"
          className="mt-3"
          disabled={busy || consent.loading || !status}
          onClick={() => void consent.accept()}
        >
          Accept AI audit policy
        </Button>
      )}
      <a href="/console" className="ml-3 text-sm underline">
        My audits in Console
      </a>
      {consent.reason ? <p className="mt-3 text-sm text-fg-muted">{consent.reason}</p> : null}
      {consent.error ? (
        <p role="alert" className="mt-3 text-sm text-status-partial">
          {consent.error}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void consent.refresh()}
            disabled={consent.loading}
          >
            Retry policy
          </button>
        </p>
      ) : null}
    </Surface>
  );
}
