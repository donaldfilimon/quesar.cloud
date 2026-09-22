import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { F as useCurrentUserState, f as RedirectToSignIn } from "./router-CTU_BGql.mjs";
import { p as Surface, s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { f as PageClose } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/profile-BtlV0-l7.js
var import_jsx_runtime = require_jsx_runtime();
function ProfilePage() {
	const { user, isPending } = useCurrentUserState();
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "px-4 py-24 text-sm text-fg-muted",
		children: "Loading session…"
	});
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Profile",
			title: user.displayName ?? user.primaryEmail ?? "Operator",
			lede: "Signed in for field notes and optional live-model asks. This is not an Abbey session.",
			atmosphere: "none"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-4 md:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-[0.68rem] tracking-[0.16em] text-fg-subtle uppercase",
				children: "Email"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm",
				children: user.primaryEmail ?? "—"
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-[0.68rem] tracking-[0.16em] text-fg-subtle uppercase",
				children: "Surfaces"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-fg-muted",
				children: "Field notes and the local console workspace are scoped to this account."
			})] })]
		}) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/console",
				label: "Field console"
			},
			secondary: [{
				to: "/console/workspace",
				label: "Console workspace"
			}]
		})
	] });
}
//#endregion
export { ProfilePage as component };
