import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ServerOnlyNotice } from "./server-only-notice";

vi.mock("@/framework/router", () => ({
  Link: ({ to, children }: { to: string; children: unknown }) =>
    createElement("a", { href: to }, children as never),
}));

it("full variant asks crawlers not to index the page", () => {
  const html = renderToStaticMarkup(createElement(ServerOnlyNotice, { feature: "Sign-in" }));
  expect(html).toContain('<meta name="robots" content="noindex"');
});

it("compact variant, used inside public pages, does not", () => {
  const html = renderToStaticMarkup(
    createElement(ServerOnlyNotice, { feature: "Chat", compact: true }),
  );
  expect(html).not.toContain("robots");
});
