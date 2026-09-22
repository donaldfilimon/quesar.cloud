import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { C as require_jsx_runtime } from "../_libs/@radix-ui/react-accordion+[...].mjs";
import { s as PageHero, u as Section } from "./section-MuxObx9K.mjs";
import { t as Button } from "./button-CAMiJNnG.mjs";
import { f as PageClose } from "./catalog-mPups2gl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/tf-pose-demo-DBiSIrF7.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function PosePage() {
	const canvasRef = (0, import_react.useRef)(null);
	const [running, setRunning] = (0, import_react.useState)(true);
	(0, import_react.useEffect)(() => {
		if (!running) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		let frame = 0;
		let raf = 0;
		const joints = [
			[.5, .18],
			[.5, .32],
			[.38, .34],
			[.62, .34],
			[.32, .5],
			[.68, .5],
			[.42, .58],
			[.58, .58],
			[.4, .82],
			[.6, .82]
		];
		const edges = [
			[0, 1],
			[1, 2],
			[1, 3],
			[2, 4],
			[3, 5],
			[1, 6],
			[1, 7],
			[6, 8],
			[7, 9]
		];
		function draw() {
			if (!ctx || !canvas) return;
			frame += 1;
			ctx.fillStyle = "#07090d";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			const t = frame / 40;
			ctx.strokeStyle = "rgba(110,202,216,0.85)";
			ctx.lineWidth = 3;
			ctx.lineCap = "round";
			const width = canvas.width;
			const height = canvas.height;
			function pt(i) {
				const [x, y] = joints[i];
				return [(x + Math.sin(t + i) * .015) * width, (y + Math.cos(t + i * .4) * .01) * height];
			}
			ctx.beginPath();
			for (const [a, b] of edges) {
				const [x1, y1] = pt(a);
				const [x2, y2] = pt(b);
				ctx.moveTo(x1, y1);
				ctx.lineTo(x2, y2);
			}
			ctx.stroke();
			ctx.fillStyle = "#5ec49a";
			for (let i = 0; i < joints.length; i += 1) {
				const [x, y] = pt(i);
				ctx.beginPath();
				ctx.arc(x, y, 4, 0, Math.PI * 2);
				ctx.fill();
			}
			raf = window.requestAnimationFrame(draw);
		}
		raf = window.requestAnimationFrame(draw);
		return () => window.cancelAnimationFrame(raf);
	}, [running]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHero, {
			eyebrow: "Pose demo",
			title: "A skeleton, not a product.",
			lede: "Illustrative browser animation of the historical tf-pose demo. This is not a production vision stack and does not access your camera unless you opt in later."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
			ref: canvasRef,
			width: 720,
			height: 420,
			className: "h-auto w-full rounded-[18px] bg-bg-elevated shadow-[var(--shadow-border)]"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-4",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				variant: "secondary",
				onClick: () => setRunning((v) => !v),
				children: running ? "Pause" : "Run"
			})
		})] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageClose, {
			primary: {
				to: "/demo",
				label: "Persona demo"
			},
			next: [{
				to: "/apps",
				label: "Apps",
				body: "Other in-browser orientations."
			}]
		})
	] });
}
//#endregion
export { PosePage as component };
