import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { site } from "@/lib/site-identity";
import { privacyPolicy, securitySections, teamIntro } from "@/lib/mlai/pages";

vi.mock("@/lib/static-site", () => ({ staticSite: true }));
vi.mock("@/lib/auth/use-current-user", () => ({
  useCurrentUserState: () => ({ user: null, isPending: false }),
}));
vi.mock("@/lib/inquiries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/inquiries")>()),
  getTurnstileConfig: vi.fn(),
  sendInquiry: vi.fn(),
}));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  createFileRoute: () => (options: unknown) => ({ options, useSearch: () => ({}) }),
  useHydrated: () => false,
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

import { Route } from "./contact";
import { SiteFooter } from "@/components/site/footer";
import { Route as PrivacyRoute } from "./privacy";
import { team } from "@/lib/mlai/categories/team";

it("offers accessible public mail and international telephone links before hydration", () => {
  const html = renderToStaticMarkup(createElement(Route.options.component!));
  expect(site.contact).toEqual({
    email: "cbkshadow@icloud.com",
    phone: "813-755-0156",
    phoneInternational: "+18137550156",
  });
  expect(html).toContain('href="mailto:cbkshadow@icloud.com"');
  expect(html).toContain('href="tel:+18137550156"');
  expect(html).toContain(">813-755-0156</a>");
  expect(html).toContain("email draft addressed to cbkshadow@icloud.com");
  expect(html).not.toContain("partnerships@mlai-corp.com");
});

it("keeps footer contact and public deployment claims consistent", () => {
  const footer = renderToStaticMarkup(<SiteFooter />);
  expect(footer).toContain('href="mailto:cbkshadow@icloud.com"');
  expect(footer).toContain('href="tel:+18137550156"');
  const privacy = renderToStaticMarkup(createElement(PrivacyRoute.options.component!));
  expect(privacy).toContain("Privacy follows the deployment boundary");
  expect(privacy).toContain("requires a pairing token");
  expect(privacy).not.toContain("has no authentication");
  expect(privacy).not.toContain("does not take your data because it cannot");
  expect(JSON.stringify(team[0].body)).not.toContain(
    "Zig for the performance-critical core of the ABI runtime",
  );
  expect(JSON.stringify(team[0].body)).toContain("nightly Rust for the current ABI runtime");
});

it("uses the same public address in careers, disclosure and privacy copy", () => {
  expect(teamIntro.join.href).toBe(`mailto:${site.contact.email}`);
  expect(teamIntro.join.label).toBe(site.contact.email);
  expect(
    securitySections.find((section) => section.title === "Responsible disclosure")?.body,
  ).toContain(site.contact.email);
  expect(privacyPolicy.find((section) => section.title === "Contact")?.body).toContain(
    site.contact.email,
  );
  expect(privacyPolicy.find((section) => section.title === "Contact")?.body).toContain(
    site.contact.phone,
  );
});
