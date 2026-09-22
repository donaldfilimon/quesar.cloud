import { createFileRoute } from "@tanstack/react-router";
import { AppLink } from "@/components/site/app-link";
import { PageClose, PageHero, Section } from "@/components/site";
import { searchIndex } from "@/lib/content";
import { appSurfaces } from "@/lib/catalog";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/links")({
  head: () => pageHead("Links — Quesar directory", "Internal directory of Quesar pages and apps."),
  component: LinksPage,
});

function LinksPage() {
  const groups = new Map<string, { title: string; href: string }[]>();
  for (const item of searchIndex) {
    const list = groups.get(item.group) ?? [];
    list.push({ title: item.title, href: item.href });
    groups.set(item.group, list);
  }
  return (
    <>
      <PageHero eyebrow="Links" title="The map of this site." lede="Every public page and in-browser app, grouped. Nothing here sends you to GitHub." />
      <Section>
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
