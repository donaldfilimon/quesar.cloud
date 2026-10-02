import { test, expect, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import pg from "pg";
import { migrate } from "../../scripts/migrate.ts";
import { acceptanceTarget } from "./guard";
import { cleanupOwnedResources, stopOwnedChild } from "./process-cleanup";
// Credentials exist only in child environments/browser memory. Never trace auth bodies/cookies.
const adminUrl = acceptanceTarget();
const run = `quesar_ai_${randomBytes(6).toString("hex")}`;
const names = [run];
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
  console.log(`[AI synthetic acceptance] ${value}`);
}
async function sql(text: string, values: unknown[] = []) {
  return (await db.query(text, values)).rows;
}
async function stop() {
  if (child) await stopOwnedChild(child);
  child = undefined;
}
async function start(provider = true, encryption = true) {
  const env = {
    ...process.env,
    NODE_ENV: "development",
    DATABASE_URL: urlFor(run),
    BETTER_AUTH_URL: origin,
    BETTER_AUTH_SECRET: secret,
    APP_ENCRYPTION_KEY: encryption ? key.toString("base64") : "",
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
  Object.assign(env, {
    XAI_API_KEY: "synthetic-fixture-only",
    LLM_PROVIDER: provider ? "xai" : "gemini",
    QUESAR_AI_FIXTURE_LOG: join(scratch, "provider.jsonl"),
  });
  child = spawn(
    process.execPath,
    [
      "--import",
      "./e2e/backend/ai-provider-fixture.mjs",
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

async function providerCalls() {
  const content = await readFile(join(scratch, "provider.jsonl"), "utf8");
  return content.trim()
    ? content
        .trim()
        .split("\n")
        .map((row) => JSON.parse(row))
    : [];
}
test.beforeAll(async () => {
  scratch = await mkdtemp(join(tmpdir(), "quesar-ai-"));
  await writeFile(join(scratch, "provider.jsonl"), "");
  for (const name of names) await admin.query(`create database "${name}"`);
  const server = createServer();
  server.listen(0, "localhost");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No owned port");
  port = address.port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  origin = `http://localhost:${port}`;
  await migrate(urlFor(run));
});
test.afterAll(async () => {
  await cleanupOwnedResources([
    stop,
    () => db.end(),
    ...names.map((name) => () => admin.query(`drop database if exists "${name}" with (force)`)),
    () => admin.end(),
    () => rm(scratch, { recursive: true, force: true }),
  ]);
  receipt("owned child/database/scratch removed; parent cluster untouched");
});
test("all four AI surfaces enforce consent and sealed audits over real HTTP and durable PostgreSQL", async ({
  browser,
}) => {
  await start();
  const context = await browser.newContext();
  const page = await context.newPage();
  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  // Discover every consumer before account mutation; Vite may reload on first discovery.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(`${origin}/login`, { waitUntil: "networkidle" });
      await page.evaluate(async () => {
        for (const module of [
          "lib/ai",
          "lib/systems",
          "lib/console",
          "lib/profile",
          "lib/auth/client",
          "routes/abbey-bot",
          "routes/dashboard",
          "routes/console",
          "components/apps/workspace-app",
        ]) {
          await import(
            /* @vite-ignore */ `/src/${module}.tsx`.replace(/lib\/(.+)\.tsx$/, "lib/$1.ts")
          );
        }
      });
      await page.waitForLoadState("networkidle");
      break;
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
  const owner = await signup(page, `${run}@example.invalid`);
  const bystander = await signup(other, `${run}-other@example.invalid`);
  await page.waitForLoadState("networkidle");
  receipt("authenticated synthetic owners ready");
  expect(
    await call(page, "ai", "askPersonaFromClient", { prompt: "refuse before consent" }),
  ).toMatchObject({ ok: false, reason: "consent_required" });
  expect(
    await call(page, "systems", "askDesk", { desk: "abbey", prompt: "refuse before consent" }),
  ).toMatchObject({ ok: false, reason: "consent_required" });
  expect(await providerCalls()).toHaveLength(0);
  await page.goto(`${origin}/abbey-bot`);
  await expect(page.getByRole("button", { name: "Send", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Accept AI audit policy" }).click();
  await expect(page.getByRole("button", { name: "Withdraw consent" })).toBeVisible();
  expect(
    await call(other, "ai", "askPersonaFromClient", { prompt: "bystander refused" }),
  ).toMatchObject({ ok: false, reason: "consent_required" });
  expect(
    await sql("select id from conversation_audits where user_id=$1", [bystander]),
  ).toHaveLength(0);

  // Shared policy load failure is visible, leaves input editable, and recovers explicitly.
  await page.route("**/_serverFn/**", async (route) => {
    if (route.request().method() === "GET")
      await route.fulfill({ status: 503, body: "Synthetic policy unavailable" });
    else await route.continue();
  });
  await page.goto(`${origin}/abbey-bot`);
  await expect(
    page.getByRole("alert").filter({ hasText: "AI policy could not be loaded" }),
  ).toBeVisible();
  await page.getByLabel("Ask Abbey, Aviva, or Abi").fill("policy retry draft");
  await expect(page.getByRole("button", { name: "Send", exact: true })).toBeDisabled();
  await page.unroute("**/_serverFn/**");
  await page.getByRole("button", { name: "Retry policy" }).click();
  await expect(page.getByRole("button", { name: "Withdraw consent" })).toBeVisible();
  await expect(page.getByLabel("Ask Abbey, Aviva, or Abi")).toHaveValue("policy retry draft");
  expect(await providerCalls()).toHaveLength(0);

  const surfaces = [
    { route: "/abbey-bot", input: "Ask Abbey, Aviva, or Abi", button: "Send" },
    { route: "/console", input: "Prompt", button: "Generate with audit" },
    { route: "/workspace", input: "Question for Abbey", button: "Ask Abbey" },
    { route: "/console/workspace", input: "Question for Abbey", button: "Ask Abbey" },
    { route: "/dashboard", input: "Ask Abbey", button: "Ask Abbey" },
  ];
  for (const [i, surface] of surfaces.entries()) {
    receipt(`checking ${surface.route}`);
    await page.goto(`${origin}${surface.route}`);
    if (surface.route === "/console")
      await page.getByRole("tab", { name: "Chat", exact: true }).click();
    await expect(page.getByRole("button", { name: "Withdraw consent" })).toBeVisible();
    if (surface.route.includes("workspace")) {
      await expect(page.getByText(/first 800 body characters/)).toBeVisible();
      await page.getByLabel("Document title").fill("Synthetic private title");
      await page.getByLabel("Document body").fill("B".repeat(800) + "EXCLUDED_TRAILING_BODY");
    }
    const input = page.getByLabel(surface.input, { exact: true });
    const submit = page.getByRole("button", { name: surface.button, exact: true });
    const failed = `FIXTURE_PROVIDER_ERROR surface ${i}`;
    await input.fill(failed);
    await submit.click();
    await expect(
      page.getByRole("alert").filter({ hasText: "response could not be generated" }),
    ).toBeVisible();
    await expect(input).toHaveValue(failed);
    await expect(submit).toBeEnabled();
    await input.fill(`FIXTURE_DELAY successful surface ${i}`);
    const before = (await providerCalls()).length;
    await submit.evaluate((element) => {
      (element as HTMLButtonElement).click();
      (element as HTMLButtonElement).click();
    });
    await expect(input).toBeDisabled();
    await expect(
      page.getByText("Synthetic provider reply; local acceptance only.", { exact: true }),
    ).toBeVisible();
    expect((await providerCalls()).length).toBe(before + 1);
    const rows = await sql(
      "select id,sealed,expires_at,policy_version from conversation_audits where user_id=$1 order by created_at desc",
      [owner],
    );
    expect(rows).toHaveLength(i + 1);
    expect(JSON.stringify(rows)).not.toContain("successful surface");
    expect(rows[0].policy_version).toBe("2026-09-22.1");
    const read = await call(page, "console", "readMyAudit", { id: rows[0].id, download: true });
    expect(read).toMatchObject({
      ok: true,
      audit: { content: { reply: "Synthetic provider reply; local acceptance only." } },
    });
    expect(await call(other, "console", "readMyAudit", { id: rows[0].id })).toMatchObject({
      ok: false,
      reason: "not_found",
    });
    if (surface.route.includes("workspace")) {
      const transmitted = (await providerCalls()).at(-1).messages[1].content;
      expect(transmitted).toContain("Synthetic private title");
      expect(transmitted).toContain("B".repeat(800));
      expect(transmitted).not.toContain("EXCLUDED_TRAILING_BODY");
      expect(read).toMatchObject({
        audit: { content: { messages: [{ role: "user", content: transmitted }] } },
      });
    }
  }
  receipt(
    "five reachable routes: shared policy adoption, actual provider failures preserve input, retry creates sealed owner audits; exact workspace disclosure/content verified",
  );
  // Expired policy and withdrawal are authoritative even while a tab retains ready UI.
  await sql("delete from rate_limits where subject=$1", [owner]);
  await sql("update chat_consents set policy_version='old-synthetic' where user_id=$1", [owner]);
  const count = (await providerCalls()).length;
  await page.getByLabel("Ask Abbey", { exact: true }).fill("stale cached policy prompt");
  await page.getByRole("button", { name: "Ask Abbey", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Accept the current" })).toBeVisible();
  await expect(page.getByLabel("Ask Abbey", { exact: true })).toHaveValue(
    "stale cached policy prompt",
  );
  expect(await providerCalls()).toHaveLength(count);
  await page.getByRole("button", { name: "Accept AI audit policy" }).click();
  await expect(page.getByRole("button", { name: "Withdraw consent" })).toBeVisible();
  await page.getByRole("button", { name: "Withdraw consent" }).click();
  await expect(page.getByRole("button", { name: "Accept AI audit policy" })).toBeVisible();
  expect(await call(page, "ai", "askPersonaFromClient", { prompt: "withdrawn" })).toMatchObject({
    ok: false,
    reason: "consent_required",
  });
  expect(await providerCalls()).toHaveLength(count);
  await page.getByRole("button", { name: "Accept AI audit policy" }).click();
  await expect(page.getByRole("button", { name: "Withdraw consent" })).toBeVisible();
  // Storage fault after dispatch must withhold sensitive reply, never become local success.
  await sql(
    "create function ai_insert_fault() returns trigger language plpgsql as $$ begin raise exception 'synthetic-sensitive-SQL'; end $$",
  );
  await sql(
    "create trigger ai_insert_fault before insert on conversation_audits for each row execute function ai_insert_fault()",
  );
  try {
    const result = await call(page, "systems", "askDesk", {
      desk: "abbey",
      prompt: "storage fault",
    });
    expect(result).toMatchObject({ ok: false, reason: "audit_failed" });
    expect(JSON.stringify(result)).not.toMatch(/Synthetic provider reply|synthetic-sensitive-SQL/);
  } finally {
    await sql("drop trigger ai_insert_fault on conversation_audits");
    await sql("drop function ai_insert_fault()");
  }
  expect(
    await call(page, "ai", "askPersonaFromClient", { prompt: "FIXTURE_TIMEOUT" }),
  ).toMatchObject({ ok: false, reason: "provider_error" });
  const existing = await sql("select id from conversation_audits where user_id=$1", [owner]);
  expect(existing).toHaveLength(5);
  for (const row of existing)
    expect(await call(page, "console", "deleteMyAudit", { id: row.id })).toMatchObject({
      ok: true,
    });
  expect(await sql("select id from conversation_audits where user_id=$1", [owner])).toHaveLength(0);
  receipt(
    "stale/withdrawn consent blocked outbound; provider timeout and SQL fault withheld reply; owner export/read/delete and bystander isolation passed",
  );
  // Same persistent account survives app restarts; neither key nor provider is faked as live acceptance.
  await page.goto("about:blank");
  await other.goto("about:blank");
  await stop();
  await start(true, false);
  await page.goto(`${origin}/dashboard`, { waitUntil: "networkidle" });
  await expect(
    page.getByText("Live AI is off because audit encryption is not configured."),
  ).toBeVisible();
  const beforeMissingKey = (await providerCalls()).length;
  expect(await call(page, "ai", "askPersonaFromClient", { prompt: "missing key" })).toMatchObject({
    ok: false,
    reason: "encryption_not_configured",
  });
  expect(
    await call(page, "systems", "askDesk", { desk: "abi", prompt: "missing key" }),
  ).toMatchObject({ ok: false, reason: "encryption_not_configured" });
  expect(await providerCalls()).toHaveLength(beforeMissingKey);
  await page.goto("about:blank");
  await stop();
  await start(false, false);
  await page.goto(`${origin}/dashboard`);
  await page.getByLabel("Ask Abbey", { exact: true }).fill("retrieval");
  await page.getByRole("button", { name: "Ask Abbey", exact: true }).click();
  await expect(page.getByText("Local catalog", { exact: true })).toBeVisible();
  expect(await providerCalls()).toHaveLength(beforeMissingKey);
  expect(await sql("select id from conversation_audits where user_id=$1", [owner])).toHaveLength(0);
  receipt(
    "restart durability, missing-key no-outbound and providerless catalog without audits passed; SYNTHETIC provider only, live acceptance remains blocked",
  );
  await context.close();
  await otherContext.close();
});
