import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppLink } from "@/components/site/app-link";
import { PageClose, PageHero, Section } from "@/components/site";
import { searchIndex } from "@/lib/content";
import { appSurfaces } from "@/lib/catalog";
import { internalHref, isExternal } from "@/lib/internal";
import { linkHub } from "@/lib/mlai/pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/links")({
  head: () => pageHead("Links — Quesar directory", "Link hub and internal directory of Quesar pages and apps."),
  component: LinksPage,
});

function PlainLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  return (
    <a href={to} className={className}>
      {children}
    </a>
  );
}

function LinksPage() {
  const groups = new Map<string, { title: string; href: string }[]>();
  for (const item of searchIndex) {
    const list = groups.get(item.group) ?? [];
    list.push({ title: item.title, href: item.href });
    groups.set(item.group, list);
  }
  return (
    <>
      <PageHero
        eyebrow="Link hub"
        title="Every important door, one screen."
        lede="Source, reference docs, the founder's profile, and the product surfaces. GitHub repositories open on this site's source pages; the few links that leave the site say so."
      />
      <Section>
        <div className="space-y-16">
          {linkHub.map((section) => (
            <div key={section.title}>
              <div className="mb-6 flex items-baseline gap-4">
                <span className="font-mono text-[0.68rem] tracking-[0.16em] text-accent uppercase">{section.kicker}</span>
                <h2 className="font-display text-2xl tracking-tight">{section.title}</h2>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.items.map((item) => {
                  const href = internalHref(item.href);
                  const external = isExternal(href);
                  // Server routes and static files (e.g. /feed.xml) are not router pages: use a plain anchor.
                  const fileLink = !external && /\.[a-z0-9]+$/i.test(href);
                  const Card = fileLink ? PlainLink : AppLink;
                  return (
                    <li key={item.title}>
                      <Card to={item.href} className="surface surface-hover flex h-full flex-col p-5 no-underline">
                        <span className="font-mono text-[10px] tracking-[0.2em] text-fg-subtle uppercase">
                          {external ? "External" : "On this site"}
                        </span>
                        <span className="mt-2 font-display text-lg text-fg">{item.title}</span>
                        <span className="mt-2 text-sm leading-relaxed text-fg-muted">{item.body}</span>
                        <span className="mt-auto pt-4 font-mono text-xs text-accent">
                          {external ? `${href.replace(/^https?:\/\//, "")} ↗` : `${href} →`}
                        </span>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </Section>
      <Section eyebrow="Directory" title="The map of this site.">
        <div className="grid gap-10 md:grid-cols-2">
          {[...groups.entries()].map(([group, items]) => (
            <div key={group}>
              <p className="font-mono text-[0.68rem] tracking-[0.16em] text-fg-subtle uppercase">{group}</p>
              <ul className="mt-3 space-y-2">
                {items.map((item) => (
                  <li key={item.href}>
                    <AppLink to={item.href} className="text-sm text-fg-muted no-underline hover:text-fg">
                      {item.title}
                    </AppLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-10 font-mono text-[0.68rem] tracking-[0.16em] text-fg-subtle uppercase">Apps</p>
        <ul className="mt-3 flex flex-wrap gap-3">
          {appSurfaces.map((app) => (
            <li key={app.id}>
              <AppLink to={app.path} className="text-sm text-accent">
                {app.name}
              </AppLink>
            </li>
          ))}
        </ul>
      </Section>
      <PageClose
        primary={{ to: "/", label: "Home" }}
        next={[{ to: "/apps", label: "Apps", body: "Working orientations of the same names." }]}
      />
    </>
  );
}
