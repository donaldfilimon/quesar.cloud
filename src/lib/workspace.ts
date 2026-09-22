import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { architectureNodes } from "@/lib/content";
import { getSql } from "@/lib/db";

const nodeIds = new Set(architectureNodes.map((node) => node.id));

const noteInput = z.object({
  nodeId: z.string().refine((id) => nodeIds.has(id), "Choose an architecture node."),
  body: z.string().trim().min(1, "Write a note.").max(2000),
});

export const listNotes = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<{
      id: number;
      node_id: string;
      body: string;
      created_at: string;
    }>`
      select id, node_id, body, created_at
      from field_notes
      where user_id = ${context.userId}
      order by created_at desc
    `;
  });

export const addNote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => noteInput.parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into field_notes (user_id, node_id, body)
      values (${context.userId}, ${data.nodeId}, ${data.body})
    `;
  });

export const deleteNote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => z.number().int().positive().parse(id))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`
      delete from field_notes
      where id = ${id} and user_id = ${context.userId}
    `;
  });
