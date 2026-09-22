import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { c as ChevronDown, l as Check } from "../_libs/lucide-react.mjs";
import { a as Overlay2, c as Title2, i as Description2, l as Trigger2, n as Cancel, o as Portal2, r as Content2, s as Root2, t as Action } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { a as SelectItemIndicator, c as SelectTrigger$1, i as SelectItem$1, l as SelectValue$1, n as SelectContent$1, o as SelectItemText, r as SelectIcon, s as SelectPortal, t as Select$1, u as SelectViewport } from "../_libs/@radix-ui/react-select+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { F as useCurrentUserState, G as architectureNodes, I as cn, f as RedirectToSignIn, u as Route$45 } from "./router-CTU_BGql.mjs";
import { p as Surface, s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { t as StatusBadge } from "./status-badge-BCCd5LRi.mjs";
import { n as buttonVariants, t as Button } from "./button-CAMiJNnG.mjs";
import { n as ScrollArea, t as JourneyRail } from "./journey-rail-2M6pcVAU.mjs";
import { t as Separator } from "./separator-C6eDeJ8k.mjs";
import { t as Label$1 } from "./label-BdJrkPew.mjs";
import { t as Textarea } from "./textarea-1mlne-9h.mjs";
import { n as ToggleGroupItem, t as ToggleGroup } from "./toggle-group-j2D9SjS7.mjs";
import { n as deleteNote, r as listNotes, t as addNote } from "./workspace-DKdTGnIa.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/console-CbKmvU0d.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var AlertDialog = Root2;
var AlertDialogTrigger = Trigger2;
var AlertDialogTitle = Title2;
var AlertDialogDescription = Description2;
var AlertDialogPortal = Portal2;
function AlertDialogOverlay({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Overlay2, {
		className: cn("fixed inset-0 z-[80] bg-bg/70", className),
		...props
	});
}
function AlertDialogContent({ className, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
		className: cn("fixed top-1/2 left-1/2 z-[81] w-[min(24rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-bg-elevated p-6 text-fg shadow-[var(--shadow-border)]", className),
		...props,
		children
	})] });
}
function AlertDialogHeader({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("grid gap-2", className),
		...props
	});
}
function AlertDialogFooter({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("mt-6 flex flex-wrap justify-end gap-2", className),
		...props
	});
}
function AlertDialogCancel({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cancel, {
		className: cn(buttonVariants({ variant: "ghost" }), className),
		...props
	});
}
function AlertDialogAction({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Action, {
		className: cn(buttonVariants({ variant: "primary" }), className),
		...props
	});
}
var Select = Select$1;
var SelectValue = SelectValue$1;
function SelectTrigger({ className, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectTrigger$1, {
		className: cn("flex h-11 w-full items-center justify-between gap-2 rounded-md bg-bg px-3 text-left text-sm text-fg shadow-[var(--shadow-border)]", "data-[placeholder]:text-fg-subtle", className),
		...props,
		children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectIcon, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
				className: "size-4 shrink-0 text-fg-subtle",
				strokeWidth: 1.75
			})
		})]
	});
}
function SelectContent({ className, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectPortal, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent$1, {
		position: "popper",
		sideOffset: 6,
		className: cn("z-[80] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg bg-bg-elevated p-1 shadow-[var(--shadow-border)]", className),
		...props,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectViewport, {
			className: "p-0.5",
			children
		})
	}) });
}
function SelectItem({ className, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem$1, {
		className: cn("relative flex h-10 cursor-pointer items-center rounded-md py-1.5 pr-8 pl-2 text-sm text-fg outline-none", "data-[highlighted]:bg-bg-subtle data-[state=checked]:text-fg", className),
		...props,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItemText, { children }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItemIndicator, {
			className: "absolute right-2 inline-flex",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
				className: "size-3.5 text-accent",
				strokeWidth: 1.75
			})
		})]
	});
}
function ConsolePage() {
	const { user, isPending } = useCurrentUserState();
	const { node } = Route$45.useSearch();
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mx-auto max-w-3xl px-4 py-24 text-sm text-fg-muted",
		children: "Loading session…"
	});
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConsoleInner, {
		name: user.displayName ?? user.primaryEmail ?? "operator",
		initialNode: node
	});
}
function ConsoleInner({ name, initialNode }) {
	const [notes, setNotes] = (0, import_react.useState)([]);
	const [nodeId, setNodeId] = (0, import_react.useState)(initialNode ?? architectureNodes[1]?.id ?? "quesar");
	const [body, setBody] = (0, import_react.useState)("");
	const [status, setStatus] = (0, import_react.useState)("loading");
	const [filter, setFilter] = (0, import_react.useState)(initialNode ?? "all");
	const node = (0, import_react.useMemo)(() => architectureNodes.find((item) => item.id === nodeId) ?? architectureNodes[1], [nodeId]);
	(0, import_react.useEffect)(() => {
		if (initialNode) {
			setNodeId(initialNode);
			setFilter(initialNode);
		}
	}, [initialNode]);
	async function refresh() {
		try {
			const rows = await listNotes();
			setNotes(rows);
			setStatus("idle");
		} catch {
			setStatus("error");
		}
	}
	(0, import_react.useEffect)(() => {
		refresh();
	}, []);
	async function onSubmit(event) {
		event.preventDefault();
		setStatus("saving");
		try {
			await addNote({ data: {
				nodeId,
				body
			} });
			setBody("");
			setFilter(nodeId);
			await refresh();
			toast.success("Note saved.");
		} catch {
			setStatus("error");
			toast.error("Could not save. Sign in again if the session expired.");
		}
	}
	async function onDelete(id) {
		try {
			await deleteNote({ data: id });
			await refresh();
			toast.success("Note deleted.");
		} catch {
			setStatus("error");
			toast.error("Could not delete that note.");
		}
	}
	const visible = filter === "all" ? notes : notes.filter((note) => note.node_id === filter);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Console",
			title: `Field notes for ${name}.`,
			lede: "Notes are stored against your account and scoped server-side. This is not Abbey memory and not a hosted WDBX store."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(JourneyRail, { current: "console" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, { children: [
			initialNode ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mb-6 rounded-[14px] bg-bg-elevated px-4 py-3 text-sm text-fg-muted shadow-[var(--shadow-border)]",
				children: [
					"From architecture: this form is attached to ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-fg",
						children: node?.name
					}),
					". Current versus not claimed is listed beside it."
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(16rem,0.7fr)]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit,
					className: "grid gap-3 rounded-xl bg-bg-elevated p-5 shadow-[var(--shadow-border)]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, {
							htmlFor: "note-node",
							children: "Architecture node"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: nodeId,
							onValueChange: setNodeId,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
								id: "note-node",
								className: "mt-1",
								"aria-label": "Architecture node",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: architectureNodes.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: item.id,
								children: item.name
							}, item.id)) })]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, {
								htmlFor: "note-body",
								children: "Note"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
								id: "note-body",
								className: "mt-1 bg-bg",
								required: true,
								maxLength: 2e3,
								value: body,
								onChange: (e) => setBody(e.target.value),
								placeholder: `What is current on ${node?.name}, and what is not claimed?`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 font-mono text-[10px] text-fg-subtle",
								children: [body.length, "/2000"]
							})
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "submit",
							disabled: status === "saving",
							children: status === "saving" ? "Saving…" : "Save note"
						}),
						status === "error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-status-partial",
							role: "alert",
							children: "Could not save. Sign in again if the session expired."
						}) : null
					]
				}), node ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-[0.68rem] tracking-[0.14em] text-accent uppercase",
							children: node.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: node.status })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-fg-muted",
						children: node.detail
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 font-mono text-[10px] tracking-[0.14em] text-status-current uppercase",
						children: "Current"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-1 space-y-1 text-sm text-fg-muted",
						children: node.implemented.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: item }, item))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-[10px] tracking-[0.14em] text-fg-subtle uppercase",
						children: "Not claimed"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-1 space-y-1 text-sm text-fg-muted",
						children: node.notClaimed.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: item }, item))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/architecture",
						search: { node: node.id },
						className: "mt-4 inline-flex min-h-11 items-center text-sm text-accent",
						children: "Open in architecture"
					})
				] }) : null]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollArea, {
				className: "mt-10 w-full",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ToggleGroup, {
					type: "single",
					value: filter,
					onValueChange: (value) => {
						if (!value) return;
						setFilter(value);
						if (value !== "all") setNodeId(value);
					},
					className: "flex w-max flex-nowrap gap-1 pb-2",
					"aria-label": "Filter notes by node",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleGroupItem, {
						value: "all",
						children: "All"
					}), architectureNodes.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleGroupItem, {
						value: item.id,
						children: item.name
					}, item.id))]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "mt-6 space-y-3",
				children: [visible.length === 0 && status !== "loading" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
					className: "text-sm text-fg-muted",
					children: "No notes yet. Inspect the architecture, then write what you observed on this node."
				}) : null, visible.map((note) => {
					const named = architectureNodes.find((item) => item.id === note.node_id);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-lg bg-bg-elevated p-4 shadow-[var(--shadow-border)]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-mono text-[0.7rem] tracking-[0.12em] text-accent uppercase",
								children: named?.name ?? note.node_id
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialog, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTrigger, {
								asChild: true,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "text-xs text-fg-subtle hover:text-fg",
									children: "Delete"
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "Delete this note?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogDescription, { children: "The note is removed from your account. This site cannot restore it." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "Keep" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
								onClick: () => void onDelete(note.id),
								children: "Delete"
							})] })] })] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 whitespace-pre-wrap text-sm text-fg-muted",
							children: note.body
						})]
					}, note.id);
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-8 text-sm text-fg-muted",
				children: [
					"Continue in",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/architecture",
						className: "text-accent",
						children: "Architecture"
					}),
					"."
				]
			})
		] })
	] });
}
//#endregion
export { ConsolePage as component };
