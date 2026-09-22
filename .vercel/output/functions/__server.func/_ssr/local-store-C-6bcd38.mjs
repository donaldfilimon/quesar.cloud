//#region node_modules/.nitro/vite/services/ssr/assets/local-store-C-6bcd38.js
function readStore(key, fallback) {
	if (typeof window === "undefined") return fallback;
	try {
		const raw = window.localStorage.getItem(key);
		if (!raw) return fallback;
		return JSON.parse(raw);
	} catch {
		return fallback;
	}
}
function writeStore(key, value) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(key, JSON.stringify(value));
}
//#endregion
export { writeStore as n, readStore as t };
