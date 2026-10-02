import { expect, test, type Page } from "@playwright/test";
import { randomBytes, randomUUID, createCipheriv, createHmac, createHash } from "node:crypto";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { mkdtemp, cp, mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import { migrate } from "../../scripts/migrate.ts";
import { acceptanceTarget } from "./guard";
import { cleanupOwnedResources, stopOwnedChild } from "./process-cleanup";

// Credentials exist only in child environments/browser memory. Never trace auth bodies/cookies.
const adminUrl = acceptanceTarget();
const run = `quesar_task3_${randomBytes(6).toString("hex")}`;
const names = [run, `${run}_upgrade`, `${run}_failure`, `${run}_restore`, `${run}_concurrent`];
const secret = randomBytes(32).toString("hex");
const key = randomBytes(32);
const password = randomBytes(24).toString("base64url");
const admin = new pg.Pool({ connectionString: adminUrl.href });
const urlFor = (name: string) => {
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  return url.href;
};
const db = new pg.Pool({ connectionString: urlFor(run) });
let child: ChildProcess | undefined;
let origin: string;
let port: number;
let scratch: string;
function receipt(value: string) {
  console.log(`[backend acceptance] ${value}`);
}
async function sql(text: string, values: unknown[] = []) {
  return (await db.query(text, values)).rows;
}
async function stop() {
  if (child) await stopOwnedChild(child);
  child = undefined;
}
async function start() {
  const env = {
    ...process.env,
    NODE_ENV: "development",
    DATABASE_URL: urlFor(run),
    BETTER_AUTH_URL: origin,
    BETTER_AUTH_SECRET: secret,
    APP_ENCRYPTION_KEY: key.toString("base64"),
    VITE_AUTH_ENABLED: "true",
    VITE_STATIC_SITE: "false",
    CRON_SECRET: secret,
  };
  // Explicitly override Vite .env values too: this run must never use remote credentials.
  for (const name of [
    "XAI_API_KEY",
    "CLOUDFLARE_AI_GATEWAY_URL",
    "CLOUDFLARE_AI_GATEWAY_TOKEN",
    "CLOUDFLARE_AI_GATEWAY_ID",
    "LLM_PROVIDER",
    "GOOGLE_SIGNIN_CLIENT_ID",
    "GOOGLE_SIGNIN_CLIENT_SECRET",
    "GOOGLE_OAUTH_CLIENT_ID",
    "GOOGLE_OAUTH_CLIENT_SECRET",
    "APPLE_CLIENT_ID",
    "APPLE_PRIVATE_KEY",
    "TWITTER_CLIENT_ID",
    "TWITTER_CLIENT_SECRET",
    "MICROSOFT_OAUTH_CLIENT_ID",
    "MICROSOFT_OAUTH_CLIENT_SECRET",
    "TURNSTILE_SITE_KEY",
    "TURNSTILE_SECRET",
    "ADMIN_EMAILS",
  ])
    Object.assign(env, { [name]: "" });
  child = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "localhost",
      "--port",
      String(port),
      "--strictPort",
    ],
    { env, stdio: "ignore" },
  );
  for (let i = 0; i < 200; i++) {
    if (child.exitCode !== null) throw new Error("Acceptance app exited before readiness");
    try {
      if ((await fetch(`${origin}/api/auth/ok`, { signal: AbortSignal.timeout(5000) })).ok) return;
    } catch {
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Acceptance app did not become ready");
}
async function auth(page: Page, path: string, data?: unknown) {
  return page.evaluate(
    async ({ path, data }) => {
      const response = await fetch(`/api/auth/${path}`, {
        method: data === undefined ? "GET" : "POST",
        headers: { "content-type": "application/json" },
        body: data === undefined ? undefined : JSON.stringify(data),
      });
      return { status: response.status };
    },
    { path, data },
  );
}
async function call(page: Page, module: string, method: string, data?: unknown): Promise<unknown> {
  return page.evaluate(
    async ({ module, method, data }) => {
      const api = await import(/* @vite-ignore */ `/src/lib/${module}.ts`);
      try {
        return await api[method](data === undefined ? undefined : { data });
      } catch (error) {
        return { thrown: error instanceof Error ? error.message : "unknown" };
      }
    },
    { module, method, data },
  );
}
async function signup(page: Page, email: string) {
  page.on("pageerror", (error) =>
    console.log("[fixture browser error]", error.message.replaceAll(password, "[redacted]")),
  );
  await page.goto(`${origin}/login?next=/profile`);
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Need an account?"),
    );
    return button && Object.keys(button).some((key) => key.startsWith("__reactProps$"));
  });
  await page.getByRole("button", { name: "Need an account? Create one", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Synthetic Acceptance");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByLabel("Display name")).toHaveValue("Synthetic Acceptance");
  const rows = await sql('select id from "user" where email = $1', [email]);
  expect(rows).toHaveLength(1);
  return rows[0].id as string;
}
async function seedAudit(
  userId: string,
  id = randomUUID(),
  sealedOverride?: string,
  expired = false,
) {
  const plaintext = JSON.stringify({
    messages: [{ role: "user", content: "Synthetic audit fixture" }],
    reply: "Fixture only; no provider call.",
  });
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    createHmac("sha256", key).update("quesar:seal").digest(),
    iv,
  );
  cipher.setAAD(Buffer.from(`audit:${id}:${userId}`));
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const sealed =
    sealedOverride ??
    [
      "v1",
      iv.toString("base64url"),
      encrypted.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
    ].join(".");
  await sql(
    "insert into conversation_audits (id,user_id,provider,model,policy_version,sealed,content_digest,expires_at) values ($1,$2,'synthetic-fixture','no-provider','2026-09-22.1',$3,$4,$5)",
    [
      id,
      userId,
      sealed,
      createHash("sha256").update(plaintext).digest("base64url"),
      new Date(Date.now() + (expired ? -60_000 : 86400_000)),
    ],
  );
  return { id, sealed };
}

test.beforeAll(async () => {
  scratch = await mkdtemp(join(tmpdir(), "quesar-backend-"));
  for (const name of names) await admin.query(`create database "${name}"`);
  const server = createServer();
  server.listen(0, "localhost");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No fixture port");
  port = address.port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  origin = `http://localhost:${port}`;
});
test.afterAll(async () => {
  await cleanupOwnedResources([
    stop,
    () => db.end(),
    ...names.map((name) => () => admin.query(`drop database if exists "${name}" with (force)`)),
    () => admin.end(),
    async () => {
      if (scratch) await rm(scratch, { recursive: true, force: true });
    },
  ]);
  if (scratch) expect(existsSync(scratch)).toBe(false);
  receipt("owned app, pools, databases and scratch cleanup completed");
});

test("disposable Postgres and real browser durable account/workflow acceptance", async ({
  browser,
}) => {
  await migrate(urlFor(run));
  await migrate(urlFor(run));
  const children = [0, 1].map(() =>
    spawn(process.execPath, ["scripts/migrate.ts"], {
      env: { ...process.env, DATABASE_URL: urlFor(names[4]) },
      stdio: "ignore",
    }),
  );
  expect(
    await Promise.all(children.map(async (process) => (await once(process, "exit"))[0])),
  ).toEqual([0, 0]);
  expect(await sql("select name from _migrations")).toHaveLength(8);
  const concurrent = new pg.Pool({ connectionString: urlFor(names[4]) });
  expect((await concurrent.query("select name from _migrations")).rows).toHaveLength(8);
  await concurrent.end();
  receipt(
    "fresh + repeat + two fresh concurrent migrators: eight unique migrations, concurrent exits 0/0",
  );
  const earlier = join(scratch, "earlier");
  await mkdir(earlier);
  for (const name of ["0001_auth.sql", "0002_field_notes.sql"])
    await cp(join("migrations", name), join(earlier, name));
  await migrate(urlFor(names[1]), earlier);
  const upgrade = new pg.Pool({ connectionString: urlFor(names[1]) });
  await upgrade.query(
    "insert into field_notes (user_id,node_id,body) values ('synthetic-upgrade','quesar','preserved fixture')",
  );
  await migrate(urlFor(names[1]));
  expect((await upgrade.query("select body from field_notes")).rows).toEqual([
    { body: "preserved fixture" },
  ]);
  await upgrade.end();
  const failing = join(scratch, "failure");
  await mkdir(failing);
  await writeFile(
    join(failing, "0001_fixture.sql"),
    "create table rollback_probe (id int); select missing_fixture_function();",
  );
  await expect(migrate(urlFor(names[2]), failing)).rejects.toThrow();
  const failure = new pg.Pool({ connectionString: urlFor(names[2]) });
  expect(
    (await failure.query("select to_regclass('rollback_probe') as relation")).rows[0].relation,
  ).toBeNull();
  expect((await failure.query("select * from _migrations")).rows).toHaveLength(0);
  await writeFile(join(failing, "0001_fixture.sql"), "create table rollback_probe (id int);");
  await mkdir(join(failing, "auth"));
  await writeFile(join(failing, "auth", "0002_nested.sql"), "select missing_fixture_function();");
  await migrate(urlFor(names[2]), failing);
  expect((await failure.query("select * from _migrations")).rows).toHaveLength(1);
  await failure.end();
  receipt(
    "seeded earlier-schema upgrade + failed migration rollback/recovery + nested exclusion passed",
  );
  await start();
  const a = await browser.newContext();
  const b = await browser.newContext();
  const anon = await browser.newContext();
  const page = await a.newPage();
  const other = await b.newPage();
  const anonymous = await anon.newPage();
  // Warm dev-only dependency discovery before mutating account journeys. Vite
  // may reload the page when a previously unseen module is optimized.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await anonymous.goto(`${origin}/contact`, { waitUntil: "networkidle" });
      await anonymous.evaluate(async () => {
        for (const module of ["workspace", "console", "inquiries", "profile", "auth/client"]) {
          await import(/* @vite-ignore */ `/src/lib/${module}.ts`);
        }
      });
      await anonymous.waitForLoadState("networkidle");
      break;
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
  const email = `${run}@example.invalid`;
  const otherEmail = `${run}-other@example.invalid`;
  const owner = await signup(page, email);
  const virtual = await a.newCDPSession(page);
  await virtual.send("WebAuthn.enable");
  await virtual.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  await page.getByRole("button", { name: "Add a passkey" }).click();
  await expect(page.getByText("Quesar passkey", { exact: false }).first()).toBeVisible();
  expect(await sql('select id from passkey where "userId"=$1', [owner])).toHaveLength(1);
  await auth(page, "sign-out", {});
  await page.goto(`${origin}/login?next=/profile`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Sign in with a passkey" }).click();
  await expect(page).toHaveURL(/\/profile$/);
  receipt(
    "Chromium virtual WebAuthn registration and sign-in passed (no physical authenticator claim)",
  );
  const bystander = await signup(other, otherEmail);
  await anonymous.goto(`${origin}/login`);
  expect(
    (await auth(anonymous, "sign-up/email", { email, password, name: "Duplicate fixture" })).status,
  ).toBe(422);
  expect(
    (await auth(anonymous, "sign-in/email", { email, password: "incorrect-synthetic-password" }))
      .status,
  ).toBe(401);
  expect(await call(anonymous, "workspace", "listNotes")).toMatchObject({ thrown: "Unauthorized" });
  await page.getByLabel("Display name").fill("Updated synthetic name");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByText("Display name updated.")).toBeVisible();
  for (const name of ["x".repeat(81), "   "])
    expect((await auth(page, "update-user", { name })).status).toBe(400);
  expect((await auth(page, "update-user", { name: "😀".repeat(80) })).status).toBe(200);
  await call(page, "workspace", "addNote", { nodeId: "quesar", body: "owner persistent note" });
  await call(other, "workspace", "addNote", {
    nodeId: "quesar",
    body: "bystander persistent note",
  });
  const notes = await sql("select id,user_id from field_notes");
  const note = notes.find((r) => r.user_id === owner);
  expect(note).toBeTruthy();
  await call(other, "workspace", "deleteNote", note!.id);
  expect(await call(page, "workspace", "listNotes")).toMatchObject([
    { body: "owner persistent note" },
  ]);
  expect(await call(other, "workspace", "listNotes")).toMatchObject([
    { body: "bystander persistent note" },
  ]);
  receipt(
    "browser signup/profile, direct duplicate/wrong-password/name bounds, protected notes isolation passed",
  );
  // Server functions are called through their actual browser HTTP transport.
  expect(
    await call(page, "console", "acceptConsent", { policyVersion: "stale-fixture" }),
  ).toMatchObject({ ok: false, reason: "stale_policy" });
  await page.goto(`${origin}/console`);
  await page.getByRole("tab", { name: "Chat", exact: true }).click();
  await page.getByRole("button", { name: "Accept AI audit policy" }).click();
  await expect(page.getByRole("button", { name: "Withdraw consent" })).toBeVisible();
  expect(await call(other, "console", "getConsoleStatus")).toMatchObject({
    consent: { accepted: false },
  });
  expect(
    await call(page, "console", "sendChat", {
      messages: [{ role: "user", content: "Synthetic no-provider probe" }],
    }),
  ).toMatchObject({ ok: false, reason: "llm_not_configured" });
  expect(await sql("select id from conversation_audits")).toHaveLength(0);
  await page.getByRole("button", { name: "Withdraw consent" }).click();
  expect(await call(page, "console", "getConsoleStatus")).toMatchObject({
    consent: { accepted: false },
  });
  await call(page, "console", "acceptConsent", { policyVersion: "2026-09-22.1" });
  // Browser forms submit real anonymous and authenticated inquiries.
  for (const [p, mail] of [
    [anonymous, `${run}-anon@example.invalid`],
    [page, email],
    [other, otherEmail],
  ] as const) {
    await p.goto(`${origin}/contact`, { waitUntil: "networkidle" });
    await p.waitForFunction(() => {
      const input = document.querySelector("#contact-name");
      return input && Object.keys(input).some((key) => key.startsWith("__reactProps$"));
    });
    await p.getByLabel("Name", { exact: true }).fill("Synthetic Contact");
    await p.getByLabel("Email", { exact: true }).fill(mail);
    if (p === anonymous) {
      await p.getByLabel("Message", { exact: true }).fill("short");
      await p.getByRole("button", { name: "Send inquiry" }).click();
      await expect(p.getByLabel("Message", { exact: true })).toHaveValue("short");
      expect(await sql("select id from inquiries where email=$1", [mail])).toHaveLength(0);
    }
    await p.getByLabel("Message", { exact: true }).fill("Synthetic durable contact inquiry.");
    await p.getByRole("button", { name: "Send inquiry" }).click();
    await expect(p.getByText(/Inquiry accepted by the site/i).first()).toBeVisible();
  }
  expect(await sql("select user_id from inquiries where email = $1", [email])).toEqual([
    { user_id: owner },
  ]);
  expect(
    await sql("select user_id from inquiries where email = $1", [`${run}-anon@example.invalid`]),
  ).toEqual([{ user_id: null }]);
  expect(await call(page, "console", "adminInquiries", { page: 1 })).toMatchObject({ ok: false });
  await sql("delete from rate_limits where bucket = 'inquiry'");
  const input = {
    name: "Synthetic Contact",
    email: `${run}-limit@example.invalid`,
    company: "Fixture",
    topic: "Services",
    message: "Synthetic limit inquiry",
    turnstileToken: "",
  };
  expect(
    await call(anonymous, "inquiries", "sendInquiry", { ...input, message: "short" }),
  ).toMatchObject({ ok: false, code: "invalid" });
  await sql("delete from rate_limits where bucket = 'inquiry'");
  for (let i = 0; i < 5; i++)
    expect(await call(anonymous, "inquiries", "sendInquiry", input)).toEqual({ ok: true });
  expect(await call(anonymous, "inquiries", "sendInquiry", input)).toMatchObject({
    ok: false,
    code: "rate_limited",
  });
  receipt(
    "browser consent/withdraw + real no-provider refusal + contact attribution, invalid/rate refusal passed",
  );
  await call(other, "console", "acceptConsent", { policyVersion: "2026-09-22.1" });
  const audit = await seedAudit(owner);
  const survivor = await seedAudit(bystander);
  expect(await call(page, "console", "listMyAudits")).toMatchObject([{ id: audit.id }]);
  expect(await call(other, "console", "readMyAudit", { id: audit.id })).toMatchObject({
    ok: false,
    reason: "not_found",
  });
  expect(await call(page, "console", "readMyAudit", { id: audit.id })).toMatchObject({
    ok: true,
    audit: { content: { reply: "Fixture only; no provider call." } },
  });
  expect(
    await call(page, "console", "readMyAudit", { id: audit.id, download: true }),
  ).toMatchObject({ ok: true });
  const transplant = await seedAudit(bystander, randomUUID(), audit.sealed);
  expect(await call(other, "console", "readMyAudit", { id: transplant.id })).toMatchObject({
    ok: false,
    reason: "undecryptable",
  });
  const expired = await seedAudit(owner, randomUUID(), undefined, true);
  expect(await call(page, "console", "readMyAudit", { id: expired.id })).toMatchObject({
    ok: false,
    reason: "not_found",
  });
  const expiration = await fetch(`${origin}/api/cron/audits-expire`, {
    headers: { authorization: `Bearer ${secret}` },
  });
  expect(expiration.status).toBe(200);
  expect(await sql("select id from conversation_audits where id=$1", [expired.id])).toHaveLength(0);
  expect(await call(other, "console", "deleteMyAudit", { id: audit.id })).toMatchObject({
    ok: false,
  });
  expect(await call(other, "console", "deleteMyAudit", { id: transplant.id })).toMatchObject({
    ok: true,
  });
  const outcomes = await sql("select distinct action,outcome from audit_access_events");
  for (const value of [
    { action: "read", outcome: "requested" },
    { action: "read", outcome: "succeeded" },
    { action: "read", outcome: "failed" },
    { action: "export", outcome: "succeeded" },
    { action: "expire", outcome: "succeeded" },
  ])
    expect(outcomes).toContainEqual(value);
  receipt(
    "synthetic sealed audits: owner list/read/export/delete, transplant/expiry refusal and access receipts passed",
  );
  // Existing cookies must not authorize native or app writes after DB expiry/revocation.
  await auth(page, "get-session");
  await sql('update session set "expiresAt" = now() - interval \'1 minute\' where "userId"=$1', [
    owner,
  ]);
  expect(
    await call(page, "workspace", "addNote", {
      nodeId: "quesar",
      body: "must be refused after expiry",
    }),
  ).toMatchObject({ thrown: "Unauthorized" });
  expect((await auth(page, "sign-in/email", { email, password })).status).toBe(200);
  await auth(page, "get-session");
  const revokedCookies = await a.cookies(origin);
  await sql('delete from session where "userId"=$1', [owner]);
  expect(
    (await auth(page, "update-user", { name: "Must refuse revoked browser session" })).status,
  ).toBe(401);
  await a.addCookies(revokedCookies);
  const [virtualKey] = await sql('select id from passkey where "userId"=$1', [owner]);
  expect((await auth(page, "passkey/delete-passkey", { id: virtualKey.id })).status).toBe(401);
  expect(await sql("select id from passkey where id=$1", [virtualKey.id])).toHaveLength(1);
  expect(await call(page, "workspace", "listNotes")).toMatchObject({ thrown: "Unauthorized" });
  expect((await auth(page, "sign-in/email", { email, password })).status).toBe(200);
  await auth(page, "sign-out", {});
  expect(await call(page, "workspace", "listNotes")).toMatchObject({ thrown: "Unauthorized" });
  expect((await auth(page, "sign-in/email", { email, password })).status).toBe(200);
  // Disconnect development HMR before restarting, keeping the browser cookies.
  await Promise.all([page, other, anonymous].map((p) => p.goto("about:blank")));
  await stop();
  await start();
  await page.goto(`${origin}/contact`, { waitUntil: "networkidle" });
  await other.goto(`${origin}/contact`, { waitUntil: "networkidle" });
  expect(await call(page, "workspace", "listNotes")).toMatchObject([
    { body: "owner persistent note" },
  ]);
  expect(await call(page, "console", "getConsoleStatus")).toMatchObject({
    consent: { accepted: true },
  });
  expect(await call(page, "console", "readMyAudit", { id: audit.id })).toMatchObject({ ok: true });
  expect(await sql("select user_id from inquiries where email=$1", [email])).toEqual([
    { user_id: owner },
  ]);
  receipt(
    "expiry + revocation/native profile refusal, signout/relogin + app restart with stable keys passed",
  );
  // Seeded backup before deletion, into another owned DB; compare every public table as sorted row JSON.
  const dump = join(scratch, "seeded.dump");
  expect(
    spawnSync("/opt/homebrew/opt/postgresql@17/bin/pg_dump", ["-Fc", "-f", dump, urlFor(run)], {
      stdio: "ignore",
    }).status,
  ).toBe(0);
  expect(
    spawnSync(
      "/opt/homebrew/opt/postgresql@17/bin/pg_restore",
      ["--exit-on-error", "-d", urlFor(names[3]), dump],
      { stdio: "ignore" },
    ).status,
  ).toBe(0);
  const restored = new pg.Pool({ connectionString: urlFor(names[3]) });
  const tables = await sql(
    "select tablename from pg_tables where schemaname='public' order by tablename",
  );
  for (const { tablename } of tables) {
    const query = `select row_to_json(t)::text as row from "${tablename}" t order by row_to_json(t)::text`;
    const expected = await sql(query);
    const actual = (await restored.query(query)).rows;
    // Compare all data without putting session tokens/password hashes in an
    // assertion diff if restore ever regresses.
    expect(actual.length).toBe(expected.length);
    const hash = (rows: unknown) => createHash("sha256").update(JSON.stringify(rows)).digest("hex");
    expect(hash(actual)).toBe(hash(expected));
  }
  await restored.end();
  receipt(`seeded pg_dump/pg_restore exits 0/0; all ${tables.length} public tables match`);
  await sql(
    "insert into rate_limits (bucket,subject,window_start,count) values ('fixture',$1,now(),1)",
    [owner],
  );
  await page.goto(`${origin}/profile`);
  await page.getByLabel("Type your email to confirm").fill(email);
  await page.locator("#delete-password").fill("incorrect-synthetic-password");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(page.getByRole("alert")).toContainText("That password is not correct");
  expect(await sql('select id from "user" where id=$1', [owner])).toHaveLength(1);
  // Reproduce a late database failure through the actual deletion endpoint.
  await sql(
    "create function acceptance_purge_fault() returns trigger language plpgsql as $$ begin raise exception 'synthetic purge fault'; end $$",
  );
  await sql(
    "create trigger acceptance_purge_fault before delete on field_notes for each row execute function acceptance_purge_fault()",
  );
  expect((await auth(page, "delete-user", { password })).status).toBe(500);
  expect(await sql("select id from conversation_audits where id=$1", [audit.id])).toHaveLength(1);
  expect(await sql("select user_id from inquiries where email=$1", [email])).toEqual([
    { user_id: owner },
  ]);
  expect(await sql("select user_id from chat_consents where user_id=$1", [owner])).toHaveLength(1);
  await sql("drop trigger acceptance_purge_fault on field_notes");
  await sql("drop function acceptance_purge_fault()");
  receipt(
    "real Postgres late purge failure preserved local audit/consent/inquiry rows before retry",
  );
  await page.locator("#delete-password").fill(password);
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(page).toHaveURL(`${origin}/`);
  for (const table of ["user", "session", "account", "passkey"])
    expect(
      (
        await sql(
          `select count(*)::int as n from "${table}" where "${table === "user" ? "id" : "userId"}"=$1`,
          [owner],
        )
      )[0].n,
    ).toBe(0);
  for (const table of [
    "field_notes",
    "chat_consents",
    "conversation_audits",
    "workspace_connections",
  ])
    expect(await sql(`select * from ${table} where user_id=$1`, [owner])).toHaveLength(0);
  expect(
    await sql("select * from audit_access_events where actor_user_id=$1", [owner]),
  ).toHaveLength(0);
  expect(await sql("select * from rate_limits where subject=$1", [owner])).toHaveLength(0);
  expect(await sql("select user_id from inquiries where email=$1", [email])).toEqual([
    { user_id: null },
  ]);
  expect(await call(other, "workspace", "listNotes")).toMatchObject([
    { body: "bystander persistent note" },
  ]);
  expect(await call(other, "console", "readMyAudit", { id: survivor.id })).toMatchObject({
    ok: true,
  });
  expect(await call(other, "console", "getConsoleStatus")).toMatchObject({
    consent: { accepted: true },
  });
  expect(await sql("select user_id from inquiries where email=$1", [otherEmail])).toEqual([
    { user_id: bystander },
  ]);
  receipt(
    "browser wrong-password then successful deletion: own auth/app purge, inquiry unlink, bystander preserved",
  );
  await a.close();
  await b.close();
  await anon.close();
  // Exercise the reviewed teardown failure path against the actual owned app:
  // afterAll must still remove databases/dump after exit was already delivered.
  if (!child) throw new Error("Owned app is missing before teardown qualification.");
  const appExit = once(child, "exit");
  // Vite handles SIGTERM with a normal exit(143); SIGKILL establishes the
  // already signal-exited state that triggered the reviewed cleanup failure.
  child.kill("SIGKILL");
  await appExit;
  expect(child.exitCode).toBeNull();
  expect(child.signalCode).toBe("SIGKILL");
  receipt("owned app signal exit completed before teardown");
});
