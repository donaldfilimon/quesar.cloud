import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useCurrentUserState, type CurrentUserState } from "@/lib/auth/use-current-user";
import { staticSite } from "@/lib/static-site";
import type { CommerceOrder } from "@/lib/commerce";
import { ServerOnlyNotice } from "./server-only-notice";

export function EngineeringEngagements() {
  const { user, isPending } = useCurrentUserState();
  return (
    <EngineeringEngagementsForIdentity
      key={user && !user.isDevFallback ? `user:${user.id}` : "anonymous"}
      user={user}
      isPending={isPending}
    />
  );
}

function EngineeringEngagementsForIdentity({ user, isPending }: CurrentUserState) {
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const [order, setOrder] = useState<CommerceOrder | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestKey = useRef<string | null>(null);
  const requestPending = useRef(false);

  async function requestInvoice() {
    if (requestPending.current || staticSite || !user || user.isDevFallback) return;
    requestPending.current = true;
    setPending(true);
    setError(null);
    requestKey.current ??= crypto.randomUUID();
    try {
      const { createPilotOrder, getCommerceReadiness } = await import("@/lib/commerce");
      const readiness = await getCommerceReadiness();
      if (!active.current) return;
      if (!readiness.configured) {
        setError(
          "Online invoice requests are not configured. Contact us to agree scope and arrange your invoice.",
        );
        return;
      }
      const requested = await createPilotOrder({ data: { idempotencyKey: requestKey.current } });
      if (active.current) setOrder(requested);
    } catch {
      if (!active.current) return;
      setError(
        "The invoice request could not be confirmed. Retry this request or contact us to arrange the engagement.",
      );
    } finally {
      requestPending.current = false;
      if (active.current) setPending(false);
    }
  }

  return (
    <div id="engagements" className="scroll-mt-28">
      <p className="eyebrow">Work with MLAI</p>
      <h2 className="mt-4 max-w-3xl font-display text-3xl tracking-tight sm:text-5xl">
        Turn your next system into something inspectable.
      </h2>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-fg-muted">
        Start with a defined engineering scope. Agree deliverables, access, and acceptance criteria
        before work begins.
      </p>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <article className="rounded-xl border border-accent/40 bg-bg-elevated p-6 sm:p-8">
          <p className="eyebrow">Pilot engagement</p>
          <h3 className="mt-4 font-display text-4xl tracking-tight">
            $2,500 <span className="text-base text-fg-muted">USD / one month</span>
          </h3>
          <p className="mt-5 text-base leading-relaxed text-fg-muted">
            A scoped engineering engagement for an AI workflow, retrieval path, or private
            deployment. Scope and delivery dates are agreed with you.
          </p>
          <ul className="mt-5 space-y-3 text-sm text-fg-muted">
            <li>Agreed deliverables and acceptance criteria</li>
            <li>One month, with no automatic renewal</li>
            <li>Invoiced engagement; hosted model access is not included</li>
          </ul>
          <Link
            to="/contact"
            search={{ service: "Pilot engineering engagement" }}
            className="mt-7 inline-flex min-h-11 items-center rounded-full bg-accent px-6 text-sm font-medium text-bg"
          >
            Discuss the Pilot →
          </Link>
          {staticSite ? (
            <div className="mt-4">
              <ServerOnlyNotice feature="Online invoice requests" compact />
              <p className="mt-4 text-sm leading-relaxed text-fg-muted">
                Contact us to agree the scope and arrange an invoice. Online payment collection is
                not available on this site.
              </p>
            </div>
          ) : (
            <div className="mt-4">
              {user && !user.isDevFallback ? (
                <button
                  type="button"
                  disabled={pending || !!order}
                  onClick={() => void requestInvoice()}
                  className="min-h-11 text-sm text-accent underline underline-offset-4 disabled:opacity-60"
                >
                  {pending
                    ? "Requesting invoice…"
                    : order
                      ? "Invoice requested"
                      : "Request a Pilot invoice"}
                </button>
              ) : (
                <p className="text-sm text-fg-muted">
                  {isPending
                    ? "Checking your account…"
                    : "Sign in to request an invoice, or contact us to agree your scope."}
                </p>
              )}
              <p className="mt-2 text-sm text-fg-subtle">
                Invoice requests require the configured server. Payment is arranged manually after
                scope agreement.
              </p>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-4 text-sm">
              {error}
            </p>
          )}
          {order && (
            <div role="status" className="mt-4 rounded-lg border border-border p-4 text-sm">
              <p>Invoice {order.invoiceNumber}</p>
              <p className="mt-2">
                {order.status === "paid"
                  ? "Payment recorded"
                  : order.status === "cancelled"
                    ? "Invoice cancelled"
                    : "Awaiting payment · $2,500 USD. No payment has been collected."}
              </p>
              <Link
                to="/contact"
                search={{ service: `Pilot invoice ${order.invoiceNumber}` }}
                className="mt-3 inline-block text-accent underline"
              >
                Arrange scope and payment
              </Link>
            </div>
          )}
        </article>
        <article className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <p className="eyebrow">Platform engagement</p>
          <h3 className="mt-4 font-display text-4xl tracking-tight">Built around your scope.</h3>
          <p className="mt-5 text-base leading-relaxed text-fg-muted">
            For larger integration, hardening, and deployment work, define the architecture and
            delivery milestones together. Pricing follows the agreed scope.
          </p>
          <ul className="mt-5 space-y-3 text-sm text-fg-muted">
            <li>Architecture and integration planning</li>
            <li>Operational and security acceptance criteria</li>
            <li>Custom pricing and invoicing</li>
          </ul>
          <Link
            to="/contact"
            search={{ service: "Platform engineering engagement" }}
            className="mt-7 inline-flex min-h-11 items-center text-sm font-medium text-accent"
          >
            Discuss a Platform engagement →
          </Link>
        </article>
      </div>
    </div>
  );
}
