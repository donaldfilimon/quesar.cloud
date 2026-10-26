import { Link } from "@tanstack/react-router";
import { ProvLegend } from "./prov-tag";
import { Logo } from "./logo";
import { site } from "@/lib/site-identity";

const groups = [
  {
    title: "Product",
    links: [
      { to: "/quesar", label: "Quesar" },
      { to: "/platform", label: "Platform" },
      { to: "/abbey", label: "Abbey" },
      { to: "/abi", label: "ABI" },
      { to: "/wdbx", label: "WDBX" },
    ],
  },
  {
    title: "Developers",
    links: [
      { to: "/architecture", label: "Architecture" },
      { to: "/developers", label: "Source" },
      { to: "/console", label: "Console" },
      { to: "/quasar/sites", label: "Quasar sites" },
      { to: "/research", label: "Research" },
      { to: "/research/implementations", label: "Implementations" },
      { to: "/docs", label: "Docs" },
      { to: "/workspace", label: "Workspace" },
      { to: "/apps", label: "Apps" },
    ],
  },
  {
    title: "MLAI",
    links: [
      { to: "/company", label: "Company" },
      { to: "/blog", label: "Blog" },
      { to: "/projects", label: "Projects" },
      { to: "/services", label: "Services" },
      { to: "/investors", label: "Investors" },
      { to: "/privacy", label: "Privacy" },
      { to: "/security", label: "Security" },
      { to: "/terms", label: "Terms" },
      { to: "/contact", label: "Contact" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_2fr]">
        <div>
          <Logo />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-fg-muted">
            MLAI builds assistant workflows, memory systems, and developer tools with inspectable
            sources and explicit implementation boundaries.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a href={`mailto:${site.contact.email}`} className="break-words text-accent">
                {site.contact.email}
              </a>
            </li>
            <li>
              <a href={`tel:${site.contact.phoneInternational}`} className="text-accent">
                {site.contact.phone}
              </a>
            </li>
          </ul>
          <p className="mt-6 text-xs text-fg-subtle">
            QSR-WEB · Browser orientation and configured server features
          </p>
          <ProvLegend className="mt-6 max-w-sm" />
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="bp-label">{group.title}</p>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-sm text-fg-muted no-underline hover:text-fg">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        {/* Title block: the corner of a drawing sheet that names who drew it. */}
        <dl className="bp-frame grid text-xs text-fg-subtle sm:grid-cols-[auto_auto_1fr]">
          <div className="border-b border-border px-4 py-3 sm:border-r sm:border-b-0">
            <dt className="bp-label">Drawn by</dt>
            <dd className="mt-1 text-fg">© {new Date().getFullYear()} MLAI</dd>
          </div>
          <div className="border-b border-border px-4 py-3 sm:border-r sm:border-b-0">
            <dt className="bp-label">Licenses</dt>
            <dd className="mt-1">ABI and WDBX include Apache-2.0 licenses.</dd>
          </div>
          <div className="px-4 py-3">
            <dt className="bp-label">Build</dt>
            <dd className="mt-1">
              The static preview provides orientation and browser demos. A configured server
              separately supports protected field notes and consent-gated model requests.
            </dd>
          </div>
        </dl>
      </div>
    </footer>
  );
}
