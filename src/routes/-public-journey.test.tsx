import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: { component: () => ReactNode }) => ({ options }),
  Link: ({
    to,
    params,
    children,
    ...props
  }: {
    to: string;
    params?: Record<string, string>;
    children: ReactNode;
  }) => (
    <a href={to.replace(/\$(\w+)/g, (match, key: string) => params?.[key] ?? match)} {...props}>
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
    expect(html).toContain("Human imagination.");
    expect(html).toContain("Adaptive intelligence.");
    expect(html).toContain("Private AI operations.");
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
      "AI should amplify human creativity.",
      "Distinct roles. One inspectable architecture.",
      "Hosted Quesar APIs and platform SDKs are not published.",
      "NYON: deterministic worlds",
      "Build in the open.",
    ])
      expect(html).toContain(text);
    expect(html).toContain('href="/contact"');
    expect(html).toContain('href="/platform"');
    expect(html).toContain("Planned");
    expect(html).toContain('href="/abbey"');
    expect(html).toContain('href="/developers"');
    expect(html).toContain('href="/source/nyon"');
    expect(html).toContain("This example illustrates an inspectable trace.");
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
