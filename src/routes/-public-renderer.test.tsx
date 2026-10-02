import type { ComponentType, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mode = vi.hoisted(() => ({ static: true }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: { component: ComponentType; head: () => unknown }) => ({
    options,
    useSearch: () => ({}),
  }),
  useHydrated: () => false,
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));
vi.mock("@/lib/static-site", () => ({
  get staticSite() {
    return mode.static;
  },
}));
vi.mock("@/lib/auth/use-current-user", () => ({ useCurrentUserState: () => ({ user: null }) }));
vi.mock("@/lib/inquiries", async () => ({
  ...(await import("@/lib/inquiry-rules")),
  getTurnstileConfig: vi.fn(),
  sendInquiry: vi.fn(),
}));
vi.mock("@/components/site/trailer", () => ({ Trailer: () => <div>Film preview</div> }));
vi.mock("@/components/site/backtrace", () => ({ Backtrace: () => <div>Trace illustration</div> }));
vi.mock("@/components/charts/arr-chart", () => ({ ArrChart: () => <div>ARR chart</div> }));
vi.mock("@/components/charts/tam-chart", () => ({ TamChart: () => <div>TAM chart</div> }));

import { HomeControlPlane, HomeProductBoundary } from "@/components/site/home-sections";
import { appSurfaces } from "@/lib/catalog";
import { site } from "@/lib/site-identity";
import { Route as HomeRoute } from "./index";
import { Route as CompanyRoute } from "./company";
import { Route as ServicesRoute } from "./services";
import { Route as ContactRoute } from "./contact";
import { Route as InvestorRoute } from "./investors";
import { Route as MobileRoute } from "./mobile";
import { Route as CompanionRoute } from "./companion";
import { Route as PluginsRoute } from "./plugins";
import { Route as SkillRoute } from "./skill-creator";

type TestRoute = { options: { component?: unknown; head?: unknown } };
function render(route: TestRoute) {
  const Component = route.options.component as ComponentType;
  return renderToStaticMarkup(<Component />);
}
function head(route: TestRoute) {
  return (route.options.head as () => { scripts?: { children?: string }[]; meta: unknown[] })();
}

beforeEach(() => {
  mode.static = true;
});

describe("public renderer claim boundaries", () => {
  it("publishes organization brand metadata without legal registration assertions", () => {
    const organization = JSON.parse(head(HomeRoute).scripts![0]!.children!);
    expect(organization.name).toBe(site.company);
    expect(organization).not.toHaveProperty("legalName");
    expect(organization.url).toBe("https://quesar.cloud/");
    const company = render(CompanyRoute);
    expect(company).toContain("company brand used on this site");
    expect(company).not.toMatch(
      /Legal name:|Delaware C-Corp|Machine Learning Advanced Innovations, Inc/,
    );
  });

  it("scopes retained control and builder panels to their actual paths", () => {
    const control = renderToStaticMarkup(<HomeControlPlane />);
    expect(control).toContain("Configured console Chat: three boundaries.");
    expect(control).toContain("stores the sealed audit before returning a successful reply");
    expect(control).toContain("static preview has no server chat");
    expect(control).not.toContain("Three of the five are still being built");
    const product = renderToStaticMarkup(<HomeProductBoundary />);
    expect(product).toContain("experimental local builder");
    expect(product).toContain("Live provider generation remains unverified");
    expect(product).not.toContain("large model that trains and improves");
  });

  it("renders service and investor figures as proposals and planning scenarios", () => {
    const services = render(ServicesRoute);
    expect(services).toContain("Nine proposed engagement scopes.");
    expect(services).toContain("deliverables to agree for each project");
    const investors = render(InvestorRoute);
    expect(investors).toContain("illustrative planning assumptions");
    expect(investors).toContain("not validated market sizing or reachable revenue");
    expect(investors).toContain("Source reports and proposed acceptance.");
    expect(investors).not.toMatch(
      /295|Master reference|skill-creator master reference|What is measured/,
    );
  });

  it("distinguishes a static email draft from configured-server storage", () => {
    const preview = render(ContactRoute);
    expect(preview).toContain("submitting requests an email draft");
    expect(preview).toContain("delivery is unconfirmed");
    expect(preview).toContain("Open email draft");
    mode.static = false;
    const configured = render(ContactRoute);
    expect(configured).toContain("server accepts and stores your inquiry");
    expect(configured).toContain("local receipt records acceptance by the site");
    expect(configured).toContain("Send inquiry");
    expect(JSON.stringify(head(ContactRoute).meta)).toContain(
      "static preview requests an email draft",
    );
  });

  it("describes browser storage without claiming native build or sync acceptance", () => {
    const mobile = render(MobileRoute);
    expect(mobile).toContain("stores notes in localStorage");
    expect(mobile).toContain("does not implement CloudKit sync");
    expect(mobile).toContain("signed-device sync acceptance remain unverified");
    const workspace = appSurfaces.find((item) => item.id === "workspace")!;
    expect(workspace.body).toContain("stores its documents in localStorage");
    expect(workspace.body).toContain("static preview cannot call a model");
    expect(mobile).not.toMatch(/Expo SDK|encrypted-local fallback|Private vault on a signed/);
  });

  it("renders companion and plugin concepts without invented source attribution", () => {
    const companion = render(CompanionRoute);
    expect(companion).toContain("Browser orientation to companion concepts");
    expect(companion).not.toMatch(/SwiftData|binary runs on your Mac/);
    const plugins = render(PluginsRoute);
    expect(plugins).toContain("Proposed grouping");
    expect(plugins).toContain("CLI names shown in this orientation");
    expect(plugins).not.toContain("consumed by /sync-clis");
    const skill = render(SkillRoute);
    expect(skill).toContain("SKILL.md preview");
    expect(skill).toContain("Site integrity rules.");
    expect(skill).not.toContain("Copied from the public skill");
    expect(render(CompanyRoute)).not.toContain("Copied from the public skill-creator skill");
  });
});
