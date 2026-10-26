import { expect, it } from "vitest";
import { Route as ConsoleRoute } from "./console";
import { Route as WorkspaceRoute } from "./console.workspace";
import { Route as DashboardRoute } from "./dashboard";
import { Route as ProfileRoute } from "./profile";

it.each([
  ["/console", ConsoleRoute],
  ["/console/workspace", WorkspaceRoute],
  ["/dashboard", DashboardRoute],
  ["/profile", ProfileRoute],
])("%s declares robots noindex", (_path, route) => {
  const head = route.options.head!({} as never) as { meta: Array<Record<string, string>> };
  expect(head.meta).toContainEqual({ name: "robots", content: "noindex" });
});
