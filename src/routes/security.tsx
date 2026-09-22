import { createFileRoute } from "@tanstack/react-router";
import { PageClose, PageHero, Section, Surface } from "@/components/site";
import { StatusBadge } from "@/components/site/status-badge";
import { LEGAL_UPDATED, securitySections } from "@/lib/mlai/pages";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security — Quesar / MLAI" },
      {
        name: "description",
        content:
          "Security posture for MLAI and Quesar: claim-honest language, local trust boundaries, and documented hazards.",
      },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  return (
    <>
      <PageHero
        eyebrow="Security"
        title="Responsible language. Documented hazards."
        lede="We do not describe Quesar as 100% private, completely secure, military-grade, or unhackable. Security claims track source, tests, and operator choices."
      />
      <Section
        eyebrow="Security whitepaper"
        title="Controls, as implemented."
        lede={`Last updated ${LEGAL_UPDATED}. Each control is labeled with its status; nothing below is a certification claim.`}
      >
        <ol className="grid gap-4">
          {securitySections.map((section, index) => (
            <li key={section.title}>
              <Surface>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-xl">
                    <span className="mr-2 font-mono text-sm text-accent">{index + 1}.</span>
                    {section.title}
                  </h2>
                  <StatusBadge status={section.status} />
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-fg-muted">{section.body}</p>
              </Surface>
            </li>
          ))}
        </ol>
      </Section>
      <Section title="What we will say">
        <ul className="max-w-2xl space-y-3 text-sm leading-relaxed text-fg-muted">
          <li>
            Ed25519 signatures and SHA-256 content addressing are used on WDBX transaction and
            segment objects where implemented.
          </li>
          <li>
            ABI workers describe authenticated, audience-bound admission with finite leases and
            replay resistance as contracts — not as a deployed cluster.
          </li>
          <li>
            Abbey daemon authentication uses a local bearer token on a Unix socket when that surface
            is run.
          </li>
          <li>
            GPU capability reporting is honest about missing kernels rather than implying
            acceleration that is not linked.
          </li>
        </ul>
      </Section>
      <Section title="What we will not say">
        <ul className="max-w-2xl space-y-3 text-sm leading-relaxed text-fg-muted">
          <li>That the reference cluster protocol is production sharding.</li>
          <li>That FHE reference paths, AES/RBAC, or key rotation are complete products.</li>
          <li>That the local site builder is safe to expose beyond a trusted LAN.</li>
          <li>That storing a record makes it true, or that a signature makes a deployment federated.</li>
        </ul>
      </Section>
      <PageClose
        primary={{ to: "/contact", label: "Contact" }}
        next={[{ to: "/privacy", label: "Privacy", body: "What this site stores, and what it does not." }]}
      />
    </>
  );
}
