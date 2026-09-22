import { r as createServerFn } from "./ssr.mjs";
import { Ft as string, Mt as object, jt as number } from "../_libs/@better-auth/core+[...].mjs";
import { t as authMiddleware } from "./middleware-BW_6yhHV.mjs";
import { t as createSsrRpc } from "./createSsrRpc-B2Izd0c7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/workspace-DKdTGnIa.js
var noteInput = object({
	nodeId: string().min(1).max(64),
	body: string().trim().min(1).max(2e3)
});
var listNotes = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("cb7732b0105413784828c5e7a2458499721e084d47ddd68980d5cc45cf83139f"));
var addNote = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => noteInput.parse(input)).handler(createSsrRpc("f9561df5a84d55cc853f86597472714c1b86c3e3e3e25e24d82a898f0bdfbfd5"));
var deleteNote = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => number().int().positive().parse(id)).handler(createSsrRpc("e2750a16b73a9f7b5412957e9c23dba3f04c632cc4238d2fd3b60fd411008776"));
//#endregion
export { deleteNote as n, listNotes as r, addNote as t };
