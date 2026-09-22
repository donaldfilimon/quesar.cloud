import { createFileRoute, Link } from "@tanstack/react-router";
import { PageClose, PageHero, Section } from "@/components/site";
import { AppLink } from "@/components/site/app-link";
import { Button } from "@/components/ui/button";
import { startJourneys } from "@/lib/mlai";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/get-started")({
  head: () =>
    pageHead("Get started — Quesar", "Start journeys for research, Abbey, mobile, and Quasar without leaving this site."),
  component: GetStartedPage,
});

function GetStartedPage() {
  return (
    <>
      <PageHero
        eyebrow="Get started"
        title="What would you like to do?"
        lede="Read first, run locally, or build from source. Choose a path to see what is available and what you need. Setup commands live on the matching app and docs pages, not as a redirect away."
      />
      <Section>
        <div className="space-y-10">
          {startJourneys.map((journey) => (
            <article
              key={journey.id}
              id={journey.id}
              className="grid scroll-mt-32 gap-6 border-t border-border pt-8 lg:grid-cols-[1fr_2fr]"
            >
              <div>
                <h2 className="font-display text-3xl tracking-tight">{journey.title}</h2>
                <p className="mt-3 text-sm text-accent">{journey.availability}</p>
              </div>
              <div className="max-w-2xl">
                <p className="text-lg leading-relaxed text-fg">{journey.description}</p>
                <h3 className="mt-5 font-medium text-fg">Before you start</h3>
                <p className="mt-2 leading-relaxed text-fg-muted">{journey.prerequisites}</p>
                <Button asChild className="mt-6">
                  <AppLink to={journey.href}>{journey.label}</AppLink>
                </Button>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-14 text-sm text-fg-muted">
          Looking for the whole product family?{" "}
          <Link to="/products" className="text-accent">
            Compare products
          </Link>
          .
        </p>
      </Section>
      <PageClose
        primary={{ to: "/docs/getting-started", label: "Docs: getting started" }}
        next={[
          { to: "/architecture", label: "Architecture", body: "Click a node for current versus not claimed." },
          { to: "/apps", label: "Apps", body: "Working orientations of the shipping surfaces." },
        ]}
      />
    </>
  );
}
