import { clientExperience } from "@/lib/mlai/categories/client-experience";
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
import { faqs } from "@/lib/mlai/categories/site-copy";
import { investor } from "@/lib/mlai/categories/investor";
import { site, type StatusKind } from "@/lib/site-identity";
import { statusCopy } from "@/lib/status-copy";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/company")({
  head: () =>
    pageHead(
      "Company — MLAI",
      "MLAI: founder-led AI engineering, source references, implementation boundaries, and proposed engagement scopes.",
    ),
  component: CompanyPage,
});

function CompanyPage() {
  return (
    <>
      <PageHero
        eyebrow={clientExperience.landingIntros.company.eyebrow}
        title={clientExperience.landingIntros.company.title}
        lede={clientExperience.landingIntros.company.lede}
      />
      <Section>
        <p className="max-w-3xl text-base leading-relaxed text-fg-muted">
          {clientExperience.landingIntros.company.availability}
        </p>
        <a
          href={clientExperience.landingIntros.company.sources[0]}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-sm text-accent underline underline-offset-4"
        >
          Inspect the source behind this page
        </a>
      </Section>

      <Section eyebrow="Company" title="Who develops this.">
        <div className="grid gap-4 md:grid-cols-2">
          <Surface>
            <h3 className="font-display text-xl">MLAI</h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">
              MLAI is the company brand used on this site. Its public pages provide orientation and
              source references.
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
        lede="These are the site's integrity rules. Licensing statements refer to the named repository licenses; figures require a source and provenance tag."
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
      <Section eyebrow="Public work" title="Choose the right contact path.">
        <p className="max-w-2xl text-sm leading-relaxed text-fg-muted">
          Discuss a project through the contact form. The public static site requests an email draft
          in your email app; a configured server accepts and stores inquiries. Setup questions and
          patches belong with the source for the relevant product.
        </p>
      </Section>
      <PageClose
        primary={{ to: "/contact", label: "Discuss your project" }}
        secondary={[
          { to: "/source", label: "Source catalog" },
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
