import { createFileRoute } from "@tanstack/react-router";
import { PageClose, PageHero, Section, Surface } from "@/components/site";
import { LEGAL_UPDATED, privacyPolicy } from "@/lib/mlai/pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () =>
    pageHead(
      "Privacy — Quesar / MLAI",
      "How MLAI treats privacy as architecture: local processing, operator-owned memory, and the limits of this public website.",
    ),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Privacy"
        title="Privacy follows the deployment boundary."
        lede="The static preview stores browser preferences and local copies; its contact form requests an email draft without confirming delivery. A configured server can store accounts, inquiries, field notes, and consent-gated model exchanges. It is not a hosted Abbey session or WDBX store."
      />
      <Section title="What this website collects">
        <p className="max-w-2xl text-sm leading-relaxed text-fg-muted">
          This product site stores browser preferences and local preview data. A configured server
          stores account-scoped records and accepted inquiries according to the policy below; model
          exchanges require current audit consent and encryption. If you click through to GitHub,
          GitHub's own policies apply. Repository metadata is requested from GitHub's public API;
          unavailable data may use a labelled build-time snapshot.
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-fg-muted">
          We do not invent a hosted analytics program here. If this deployment injects platform
          tooling outside MLAI's source, that tooling is not an MLAI product claim.
        </p>
      </Section>
      <Section
        eyebrow="Privacy policy"
        title="What is collected, and how it is handled."
        lede={`Last updated ${LEGAL_UPDATED}.`}
      >
        <ol className="grid max-w-3xl gap-4">
          {privacyPolicy.map((section, index) => (
            <li key={section.title}>
              <Surface>
                <h2 className="font-display text-xl">
                  <span className="mr-2 font-mono text-sm text-accent">{index + 1}.</span>
                  {section.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-fg-muted">{section.body}</p>
              </Surface>
            </li>
          ))}
        </ol>
      </Section>
      <Section
        eyebrow="Product"
        title="Mechanisms, with scope."
        lede="Privacy in Quesar is a set of placement and inspection choices — not a promise that a system is unhackable."
      >
        <ul className="grid gap-3 md:grid-cols-2">
          {[
            {
              title: "Local processing",
              body: "ABI, Abbey, and WDBX are built to run on operator-owned machines. Cloud backends are optional.",
            },
            {
              title: "Operator-owned memory",
              body: "WDBX stores, episodes, evidence payloads, credentials, and runtime data stay private to their owners. Public repos are source, not a hosted database.",
            },
            {
              title: "Controlled writes",
              body: "Persistence that is skipped or unavailable is not reported as a successful write. Admission checks reject replay and stale policy/consent bindings.",
            },
            {
              title: "Provenance",
              body: "Content addressing and signatures support later inspection. They do not make a stored statement true.",
            },
            {
              title: "Permissions",
              body: "The separate local Quasar service binds to loopback by default and requires a pairing token for its APIs. Non-loopback exposure requires explicit opt-in and an HTTPS public origin. Generated code runs as the operator; pairing is not an operating-system sandbox.",
            },
            {
              title: "Model selection",
              body: "Local models are optional. Live providers require stored credentials. This website does not broker them.",
            },
          ].map((item) => (
            <li key={item.title} className="rounded-lg bg-bg-elevated p-5 shadow-border">
              <h3 className="text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-fg-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </Section>
      <PageClose
        primary={{ to: "/security", label: "Security" }}
        secondary={[{ to: "/architecture", label: "Architecture" }]}
        next={[{ to: "/terms", label: "Terms", body: "The same limits, as a contract." }]}
      />
    </>
  );
}
