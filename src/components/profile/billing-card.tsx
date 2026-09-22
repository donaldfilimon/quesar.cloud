import { Link } from "@tanstack/react-router";
import { Surface } from "@/components/site";
import { Button } from "@/components/ui/button";
import type { BillingPlansResult } from "@/lib/billing";

const kicker = "font-mono text-[0.68rem] tracking-[0.16em] text-fg-subtle uppercase";

export type BillingState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "loaded"; result: BillingPlansResult };

/**
 * Plans and checkout. With no usable payment link there are no plans to show,
 * only the "not configured" card: nothing here is a sample catalog.
 */
export function BillingCard({
  state,
  pendingPlan,
  message,
  onCheckout,
}: {
  state: BillingState;
  pendingPlan: string | null;
  message: { error: string; nextStep?: string } | null;
  onCheckout: (planId: string) => void;
}) {
  if (state.kind === "loading") {
    return (
      <Surface>
        <p className={kicker}>Billing</p>
        <p className="mt-3 text-sm text-fg-muted">Loading billing…</p>
      </Surface>
    );
  }
  if (state.kind === "error") {
    return (
      <Surface>
        <p className={kicker}>Billing</p>
        <p className="mt-3 text-sm text-status-partial" role="alert">
          Billing status could not be loaded. Try again in a moment.
        </p>
      </Surface>
    );
  }
  const { result } = state;
  if (!result.configured) {
    return (
      <Surface>
        <p className={kicker}>Billing</p>
        <h3 className="mt-3 text-lg text-fg">Billing is not configured yet</h3>
        <p className="mt-2 text-sm text-fg-muted">
          {result.reason === "misconfigured"
            ? "The checkout link in this deployment is not a usable https payment link, so no plan can be purchased here."
            : "This deployment has no checkout link, so no plan can be purchased here."}{" "}
          To talk about a pilot, <Link to="/contact">contact us</Link>.
        </p>
      </Surface>
    );
  }
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        {result.plans.map((plan) => (
          <Surface key={plan.id}>
            <p className={kicker}>{plan.price}</p>
            <h3 className="mt-3 text-lg text-fg">{plan.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">{plan.description}</p>
            {plan.id === "pilot" ? (
              <Button
                type="button"
                className="mt-4"
                disabled={pendingPlan !== null}
                onClick={() => onCheckout(plan.id)}
              >
                {pendingPlan === plan.id ? "Opening checkout…" : "Start checkout"}
              </Button>
            ) : (
              <Button asChild variant="secondary" className="mt-4">
                <Link to="/contact">Contact sales</Link>
              </Button>
            )}
          </Surface>
        ))}
      </div>
      {message ? (
        <p className="text-sm text-status-partial" role="alert">
          {message.error}
          {message.nextStep ? ` ${message.nextStep}` : ""}
        </p>
      ) : null}
    </div>
  );
}
