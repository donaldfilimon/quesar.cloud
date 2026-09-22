import { r as createServerFn } from "./ssr.mjs";
import { Ft as string, Mt as object, jt as number } from "../_libs/@better-auth/core+[...].mjs";
import { r as getSql } from "./db-bUYj_LAA.mjs";
import { t as authMiddleware } from "./middleware-BW_6yhHV.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/workspace-BEILH4Er.js
var noteInput = object({
	nodeId: string().min(1).max(64),
	body: string().trim().min(1).max(2e3)
});
var listNotes_createServerFn_handler = createServerRpc({
	id: "cb7732b0105413784828c5e7a2458499721e084d47ddd68980d5cc45cf83139f",
	name: "listNotes",
	filename: "src/lib/workspace.ts"
}, (opts) => listNotes.__executeServer(opts));
var listNotes = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(listNotes_createServerFn_handler, async ({ context }) => {
	return (await getSql())`
      select id, node_id, body, created_at
      from field_notes
      where user_id = ${context.userId}
      order by created_at desc
    `;
});
var addNote_createServerFn_handler = createServerRpc({
	id: "f9561df5a84d55cc853f86597472714c1b86c3e3e3e25e24d82a898f0bdfbfd5",
	name: "addNote",
	filename: "src/lib/workspace.ts"
}, (opts) => addNote.__executeServer(opts));
var addNote = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => noteInput.parse(input)).handler(addNote_createServerFn_handler, async ({ context, data }) => {
	await (await getSql())`
      insert into field_notes (user_id, node_id, body)
      values (${context.userId}, ${data.nodeId}, ${data.body})
    `;
});
var deleteNote_createServerFn_handler = createServerRpc({
	id: "e2750a16b73a9f7b5412957e9c23dba3f04c632cc4238d2fd3b60fd411008776",
	name: "deleteNote",
	filename: "src/lib/workspace.ts"
}, (opts) => deleteNote.__executeServer(opts));
var deleteNote = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => number().int().positive().parse(id)).handler(deleteNote_createServerFn_handler, async ({ context, data: id }) => {
	await (await getSql())`
      delete from field_notes
      where id = ${id} and user_id = ${context.userId}
    `;
});
//#endregion
export { addNote_createServerFn_handler, deleteNote_createServerFn_handler, listNotes_createServerFn_handler };
