import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppLink } from "./app-link";

describe("explicit external source links", () => {
  it("preserves GitHub repository destinations instead of rewriting them as site routes", () => {
    for (const name of ["quesar.cloud", "MLAI-CORPORATION-WWW"]) {
      const href = `https://github.com/donaldfilimon/${name}`;
      const html = renderToStaticMarkup(
        <AppLink to={href} external>
          Source
        </AppLink>,
      );
      expect(html).toContain(`href="${href}"`);
    }
  });
});
