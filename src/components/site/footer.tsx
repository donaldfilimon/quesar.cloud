import { Link } from "@tanstack/react-router";
import { ProvLegend } from "./prov-tag";
import { Logo } from "./logo";

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
    <footer className="mt-auto">
      <div className="brand-seam" />
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_2fr]">
        <div>
          <Logo />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-fg-muted">
            MLAI Corporation builds assistant workflows, memory systems, and developer tools with
            inspectable sources and explicit implementation boundaries.
          </p>
          <p className="mt-6 text-xs text-fg-subtle">
            QSR-WEB · Local orientation · No hosted session
          </p>
          <ProvLegend className="mt-6 max-w-sm" />
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-medium text-fg-subtle">{group.title}</p>
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
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} MLAI Corporation. Apache-2.0 on core runtimes.</p>
          <p>
            This site orients and offers a signed-in console for field notes. It does not host
            assistant sessions.
          </p>
        </div>
      </div>
    </footer>
  );
}
