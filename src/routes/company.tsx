import { createFileRoute } from "@tanstack/react-router";
import {
  FaqList,
  IntegrityList,
  PageClose,
  PageHero,
  PullQuote,
  Section,
  Surface,
} from "@/components/site";
import { StatusBadge } from "@/components/site/status-badge";
import { ProvLegend } from "@/components/site/prov-tag";
import { ProvTag } from "@/components/site/prov-tag";
import { faqs, investor, site, statusCopy, type StatusKind } from "@/lib/content";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/company")({
  head: () =>
    pageHead(
      "Company — MLAI Corporation",
      "MLAI Corporation — Machine Learning Advanced Innovations. Origin, founder, public source, and the only approved Apple sentence.",
    ),
  component: CompanyPage,
});

function CompanyPage() {
  return (
    <>
      <PageHero
        eyebrow="Company"
        title="Three voices. One substrate. Yours alone."
        lede={site.origin}
      />

      <Section eyebrow="Entity" title="Who ships this.">
        <div className="grid gap-4 md:grid-cols-2">
          <Surface>
            <h3 className="font-display text-xl">MLAI Corporation</h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">
              Legal name: {site.legal}. {investor.entity}. Public orientation lives here.
              Integration source lives on GitHub. This website does not host assistant sessions or
              generation.
            </p>
          </Surface>
          <Surface>
            <h3 className="font-display text-xl">Donald Filimon</h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">
              Founder and systems architect. Public work spans Rust, Swift, and TypeScript — ABI,
              WDBX, Abbey, Gama, and the company site. Motto used in internal docs: care first,
              clarity always, competence throughout.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-fg-muted">
              {investor.founder.map((row) => (
                <li key={row.k} className="flex flex-wrap items-center gap-2">
                  <span>{row.k}</span>
                  <ProvTag tag={row.tag} />
                </li>
              ))}
            </ul>
          </Surface>
        </div>
      </Section>

      <Section eyebrow="Origin" title="Why three, not one.">
        <PullQuote>{site.origin}</PullQuote>
      </Section>

      <Section
        eyebrow="Integrity"
        title="Rules that cost more to break than any asset."
        lede="Copied from the public skill-creator skill. They apply to this site as written."
      >
        <IntegrityList />
      </Section>

      <Section
        eyebrow="Status labels"
        title="Labels are not interchangeable."
        lede="Current, Partial, Experimental, In development, Planned, and Research mean different things across this site. Planned functionality is never presented as shipping. Figures carry a separate provenance tag."
      >
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(statusCopy) as StatusKind[]).map((key) => (
            <li key={key} className="surface p-5">
              <StatusBadge status={key} />
              <p className="mt-2 text-sm text-fg-muted">{statusCopy[key].meaning}</p>
            </li>
          ))}
        </ul>
        <ProvLegend className="mt-8" />
      </Section>
      <Section eyebrow="Questions" title="Short answers. No borrowed benchmarks.">
        <FaqList items={faqs} />
      </Section>
      <Section eyebrow="Public work" title="Source is the contact path.">
        <p className="max-w-2xl text-sm leading-relaxed text-fg-muted">
          Issues, setup questions, and patches belong on the pages that implement each surface.
          There is an inquiry form on this site. It does not send mail; signed-in notes land in the
          field console.
        </p>
      </Section>
      <PageClose
        primary={{ to: "/source", label: "Source catalog" }}
        secondary={[
          { to: "/contact", label: "Contact" },
          { to: "/investors", label: "Investors" },
        ]}
        next={[
          { to: "/services", label: "Services", body: "How an engagement actually runs." },
          { to: "/developers", label: "Developers", body: "Public trees and gates." },
        ]}
      />
    </>
  );
}
