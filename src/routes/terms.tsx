import { createFileRoute } from "@tanstack/react-router";
import { PageClose, PageHero, Section, Surface } from "@/components/site";
import { termsSections } from "@/lib/mlai/pages";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms — MLAI" },
      { name: "description", content: "Terms of use for the public Quesar orientation site." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <>
      <PageHero
        eyebrow="Terms"
        title="This site orients. It does not host your sessions."
        lede="Last updated 22 September 2026. These terms cover the public website and in-browser app orientations."
      />
      <Section>
        <div className="max-w-3xl space-y-6 text-sm leading-relaxed text-fg-muted">
          <p>
            Machine Learning Advanced Innovations, Inc. (“MLAI”) provides this website as
            orientation for Quesar, ABI, WDBX, Abbey, and related public work. It is not a hosted
            assistant, not a production API, and not a substitute for the local applications
            described on the app pages.
          </p>
          <p>
            In-browser workspaces, vaults, and studios store data in your browser unless you sign in
            to the field console, in which case notes are scoped to your account. Do not place
            secrets, regulated corpora, or production credentials here.
          </p>
          <p>
            Public source is described on this site. Core runtimes are Apache-2.0 as stated in each
            tree. Status labels (Current, Partial, Experimental, Planned, Research) mean what the
            status page says they mean.
          </p>
          <p>
            MLAI software is independent and is not affiliated with, endorsed by, or sponsored by
            Apple Inc.
          </p>
        </div>
      </Section>
      <Section eyebrow="Terms of use" title="Use, accounts, and limits.">
        <ol className="grid max-w-3xl gap-4">
          {termsSections.map((section, index) => (
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
      <PageClose
        primary={{ to: "/privacy", label: "Privacy" }}
        secondary={[{ to: "/security", label: "Security" }]}
      />
    </>
  );
}
