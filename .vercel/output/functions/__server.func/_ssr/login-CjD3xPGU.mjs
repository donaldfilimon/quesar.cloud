import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { Ft as string, Mt as object } from "../_libs/@better-auth/core+[...].mjs";
import { r as signIn, t as authClient } from "./client-B40BzJxt.mjs";
import { t as GROK_PROVIDERS } from "./server-DOaWCH9S.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { F as useCurrentUserState, l as Route$35 } from "./router-CTU_BGql.mjs";
import { t as Button } from "./button-CAMiJNnG.mjs";
import { t as Label$1 } from "./label-BdJrkPew.mjs";
import { t as Input } from "./input-CLuOZ_Uu.mjs";
import { n as useForm, t as u } from "../_libs/@hookform/resolvers+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-CjD3xPGU.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var schema = object({
	name: string().optional(),
	email: string().email("Enter a valid email."),
	password: string().min(8, "Password must be at least 8 characters.")
});
function Login() {
	const { user, isPending } = useCurrentUserState();
	const { next = "/console" } = Route$35.useSearch();
	const [mode, setMode] = (0, import_react.useState)("signin");
	const form = useForm({
		resolver: u(schema),
		defaultValues: {
			name: "",
			email: "",
			password: ""
		}
	});
	async function onSubmit(values) {
		try {
			const result = mode === "signup" ? await authClient.signUp.email({
				email: values.email,
				password: values.password,
				name: values.name || values.email.split("@")[0]
			}) : await authClient.signIn.email({
				email: values.email,
				password: values.password
			});
			if (result.error) {
				const message = result.error.message ?? "Sign-in failed.";
				form.setError("root", { message });
				toast.error(message);
				return;
			}
			toast.success(mode === "signup" ? "Account created." : "Signed in.");
			window.location.assign(next);
		} catch {
			form.setError("root", { message: "Sign-in failed. Try again." });
			toast.error("Sign-in failed. Try again.");
		}
	}
	(0, import_react.useEffect)(() => {
		if (!isPending && user) window.location.assign(next);
	}, [
		isPending,
		user,
		next
	]);
	if (!isPending && user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mx-auto max-w-md px-4 py-16 text-sm text-fg-muted",
		children: "Continuing to field notes…"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto grid max-w-md gap-8 px-4 py-16 sm:px-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-[0.7rem] tracking-[0.16em] text-accent uppercase",
					children: "Quesar console"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-3 font-serif text-4xl tracking-tight",
					children: "Sign in"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-fg-muted",
					children: "Keep field notes on architecture nodes. Google, X, or email. This is not a hosted Abbey session."
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-col gap-2",
					children: GROK_PROVIDERS.map((provider) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						variant: "secondary",
						onClick: () => signIn(provider.providerId, { callbackURL: next }),
						children: ["Continue with ", provider.label]
					}, provider.providerId))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-center font-mono text-[0.68rem] tracking-[0.14em] text-fg-subtle uppercase",
					children: "or email"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: form.handleSubmit(onSubmit),
					className: "flex flex-col gap-3",
					children: [
						mode === "signup" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, {
							htmlFor: "name",
							children: "Name"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "name",
							autoComplete: "name",
							className: "mt-1",
							...form.register("name")
						})] }) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, {
								htmlFor: "email",
								children: "Email"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "email",
								type: "email",
								required: true,
								autoComplete: "email",
								className: "mt-1",
								...form.register("email")
							}),
							form.formState.errors.email ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm text-status-partial",
								children: form.formState.errors.email.message
							}) : null
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, {
								htmlFor: "password",
								children: "Password"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "password",
								type: "password",
								required: true,
								minLength: 8,
								autoComplete: mode === "signup" ? "new-password" : "current-password",
								className: "mt-1",
								...form.register("password")
							}),
							form.formState.errors.password ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm text-status-partial",
								children: form.formState.errors.password.message
							}) : null
						] }),
						form.formState.errors.root ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-status-partial",
							role: "alert",
							children: form.formState.errors.root.message
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "submit",
							disabled: form.formState.isSubmitting,
							children: form.formState.isSubmitting ? "Working…" : mode === "signup" ? "Create account" : "Sign in with email"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "text-sm text-fg-muted underline-offset-4 hover:text-fg hover:underline",
					onClick: () => {
						setMode(mode === "signup" ? "signin" : "signup");
						form.clearErrors();
					},
					children: mode === "signup" ? "Already have an account? Sign in" : "Need an account? Create one"
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs text-fg-subtle",
				children: [
					"After sign-in you land on field notes. Back to",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "text-accent",
						children: "Quesar"
					}),
					"."
				]
			})
		]
	});
}
//#endregion
export { Login as component };
