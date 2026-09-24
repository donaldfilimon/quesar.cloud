import { createFileRoute } from "@tanstack/react-router";
import { PageClose, PageHero, Section, Surface } from "@/components/site";
import { LEGAL_UPDATED, privacyPolicy } from "@/lib/mlai/pages";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — Quesar / MLAI" },
      {
        name: "description",
        content:
          "How MLAI treats privacy as architecture: local processing, operator-owned memory, and the limits of this public website.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Privacy"
        title="This site does not take your data because it cannot."
        lede="The public Quesar website is orientation plus an optional console. It does not host Abbey sessions or accept document uploads. Signed-in persona replies reach a model provider only when one is configured. Product privacy lives in the architecture you run locally."
      />
      <Section title="What this website collects">
        <p className="max-w-2xl text-sm leading-relaxed text-fg-muted">
          This product site stores a theme preference in your browser when you toggle light or dark.
          If you sign in, it stores an account and the field notes you write in the console. Notes
          are scoped to your account on the server. They are not Abbey memory and not a hosted WDBX
          store. If you click through to GitHub, GitHub's own policies apply. Optional live
          repository metadata is requested from GitHub's public API in your browser; if that request
          fails, the page falls back to verified links with no statistics.
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
              body: "Local builder has no authentication and binds to the LAN. That is a documented hazard, not a privacy feature. Run it on a trusted network.",
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
