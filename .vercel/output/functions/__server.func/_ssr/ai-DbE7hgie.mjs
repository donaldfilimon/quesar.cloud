import { r as createServerFn } from "./ssr.mjs";
import { Ft as string, Mt as object, wt as _enum } from "../_libs/@better-auth/core+[...].mjs";
import { t as authMiddleware } from "./middleware-BW_6yhHV.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ai-DbE7hgie.js
var input = object({
	prompt: string().trim().min(1).max(1200),
	persona: _enum([
		"abbey",
		"aviva",
		"abi"
	]).default("abi")
});
var SYSTEM = {
	abbey: "You are Abbey, MLAI's empathic polymath. Care first. Scaffold. Name uncertainty. Never claim AGI, hosted sessions, or unverified benchmarks. Keep answers under 180 words.",
	aviva: "You are Aviva, MLAI's unfiltered expert. Clarity always. No preamble. No hedges unless the fact is actually unknown. Keep answers under 140 words.",
	abi: "You are Abi, MLAI's adaptive moderator. Route the user toward inspectable next steps. Say what the ledger can prove. Keep answers under 160 words."
};
var askPersona_createServerFn_handler = createServerRpc({
	id: "c1aeecd732699de99d2098573d71dd95723e0fdaed88559c669cfe086ffc66fd",
	name: "askPersona",
	filename: "src/lib/ai.ts"
}, (opts) => askPersona.__executeServer(opts));
var askPersona = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((value) => input.parse(value)).handler(askPersona_createServerFn_handler, async ({ data }) => {
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return {
		ok: false,
		error: "Live model is not available in this environment."
	};
	const res = await fetch("https://api.x.ai/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model: "grok-4.5",
			max_tokens: 280,
			messages: [{
				role: "system",
				content: SYSTEM[data.persona]
			}, {
				role: "user",
				content: data.prompt
			}]
		})
	});
	if (!res.ok) return {
		ok: false,
		error: `Model error ${res.status}`
	};
	return {
		ok: true,
		text: (await res.json()).choices?.[0]?.message?.content ?? ""
	};
});
//#endregion
export { askPersona_createServerFn_handler };
