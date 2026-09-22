import { r as createServerFn } from "./ssr.mjs";
import { Ft as string, Mt as object, wt as _enum } from "../_libs/@better-auth/core+[...].mjs";
import { t as authMiddleware } from "./middleware-BW_6yhHV.mjs";
import { t as createSsrRpc } from "./createSsrRpc-B2Izd0c7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ai-CHYRVXyR.js
var input = object({
	prompt: string().trim().min(1).max(1200),
	persona: _enum([
		"abbey",
		"aviva",
		"abi"
	]).default("abi")
});
var askPersona = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((value) => input.parse(value)).handler(createSsrRpc("c1aeecd732699de99d2098573d71dd95723e0fdaed88559c669cfe086ffc66fd"));
//#endregion
export { askPersona as t };
