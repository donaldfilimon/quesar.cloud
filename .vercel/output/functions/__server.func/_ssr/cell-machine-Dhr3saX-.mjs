import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { t as Button } from "./button-CAMiJNnG.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/cell-machine-Dhr3saX-.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var COLS = 48;
var ROWS = 28;
function empty() {
	return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 0));
}
function seed() {
	const grid = empty();
	for (let y = 0; y < ROWS; y += 1) for (let x = 0; x < COLS; x += 1) grid[y][x] = Math.random() < .28 ? 1 : 0;
	return grid;
}
function step(grid) {
	const next = empty();
	for (let y = 0; y < ROWS; y += 1) for (let x = 0; x < COLS; x += 1) {
		let n = 0;
		for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
			if (!dx && !dy) continue;
			const yy = (y + dy + ROWS) % ROWS;
			const xx = (x + dx + COLS) % COLS;
			n += grid[yy][xx];
		}
		next[y][x] = grid[y][x] ? n === 2 || n === 3 ? 1 : 0 : n === 3 ? 1 : 0;
	}
	return next;
}
function CellMachine() {
	const [grid, setGrid] = (0, import_react.useState)(() => seed());
	const [running, setRunning] = (0, import_react.useState)(true);
	const ref = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (!running) return;
		const id = window.setInterval(() => setGrid((g) => step(g)), 120);
		return () => window.clearInterval(id);
	}, [running]);
	(0, import_react.useEffect)(() => {
		const canvas = ref.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const w = canvas.width;
		const h = canvas.height;
		const cw = w / COLS;
		const ch = h / ROWS;
		ctx.fillStyle = "#07090d";
		ctx.fillRect(0, 0, w, h);
		for (let y = 0; y < ROWS; y += 1) for (let x = 0; x < COLS; x += 1) {
			if (!grid[y][x]) continue;
			ctx.fillStyle = "rgba(110,202,216,0.85)";
			ctx.fillRect(x * cw + .5, y * ch + .5, cw - 1, ch - 1);
		}
	}, [grid]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "surface overflow-hidden p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-3 flex flex-wrap gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						size: "sm",
						onClick: () => setRunning((v) => !v),
						children: running ? "Pause" : "Run"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						size: "sm",
						variant: "secondary",
						onClick: () => setGrid(seed()),
						children: "Reseed"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						size: "sm",
						variant: "ghost",
						onClick: () => setGrid(empty()),
						children: "Clear"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
				ref,
				width: 768,
				height: 448,
				className: "h-auto w-full rounded-md bg-bg",
				onClick: (event) => {
					const rect = event.currentTarget.getBoundingClientRect();
					const x = Math.floor((event.clientX - rect.left) / rect.width * COLS);
					const y = Math.floor((event.clientY - rect.top) / rect.height * ROWS);
					setGrid((g) => g.map((row, yy) => row.map((cell, xx) => xx === x && yy === y ? cell ? 0 : 1 : cell)));
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-xs text-fg-subtle",
				children: "Founder research. Not a Quesar product. Click a cell to toggle."
			})
		]
	});
}
//#endregion
export { CellMachine as t };
