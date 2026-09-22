import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { F as useCurrentUserState, f as RedirectToSignIn } from "./router-CTU_BGql.mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { t as WorkspaceApp } from "./workspace-app-CQXFdjYw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/console.workspace-BNxdTxtl.js
var import_jsx_runtime = require_jsx_runtime();
function ConsoleWorkspacePage() {
	const { user, isPending } = useCurrentUserState();
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "px-4 py-24 text-sm text-fg-muted",
		children: "Loading session…"
	});
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
		eyebrow: "Console workspace",
		title: `Notes for ${user.displayName ?? "operator"}`,
		lede: "Signed in. Documents in this panel stay in the browser. Field notes on architecture nodes live under Console.",
		atmosphere: "none"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WorkspaceApp, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mt-6 text-sm",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/console",
			className: "text-accent",
			children: "Field console"
		})
	})] })] });
}
//#endregion
export { ConsoleWorkspacePage as component };
