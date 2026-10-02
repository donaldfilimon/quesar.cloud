import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: { component: () => ReactNode }) => ({ options }),
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/site/trailer", () => ({ Trailer: () => <div>Film preview</div> }));
vi.mock("@/components/site/backtrace", () => ({ Backtrace: () => <div>Trace illustration</div> }));
import { Route } from "./index";
describe("client homepage", () => {
  it("puts discussion before platform and retains the complete evidence journey", () => {
    const Home = Route.options.component!;
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain("Make your AI system inspectable.");
    expect(html.indexOf("Discuss your project")).toBeLessThan(html.indexOf("Explore the platform"));
    for (const text of [
      "Assess the system",
      "Build a bounded workflow",
      "Harden the release path",
      "Inspect the architecture",
      "Read the source",
      "Compare product availability",
      "Open the documentation",
      "Engagement process",
      "Film preview",
    ])
      expect(html).toContain(text);
    expect(html).toContain('href="/contact"');
    expect(html).toContain('href="/platform"');
    expect(html).toContain("Planned");
  });
});
