import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import {
  mkdtemp,
  mkdir,
  writeFile,
  rm,
  readFile,
  realpath,
  cp,
  readdir,
  lstat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import { migrate } from "../../scripts/migrate.ts";
import type { CommerceOrder } from "../../src/lib/commerce";
import { acceptanceTarget } from "./guard";
import { cleanupOwnedResources, stopOwnedChild } from "./process-cleanup";

// Real browser transport, Better Auth, disposable Postgres and installed native WDBX.
// Traces/screenshots are disabled: passwords and session cookies stay in memory.
test.describe.configure({ mode: "serial" });
const adminUrl = acceptanceTarget();
const run = `quesar_commerce_${randomBytes(6).toString("hex")}`;
const adminEmail = `${run}-admin@example.invalid`;
const buyerEmail = `${run}-buyer@example.invalid`;
const password = randomBytes(24).toString("base64url");
const secret = randomBytes(32).toString("hex");
const encryptionKey = randomBytes(32).toString("base64");
const binary = "/Users/donaldfilimon/dev/active/wdbx/zig-out/bin/wdbx";
const databaseUrl = new URL(adminUrl);
databaseUrl.pathname = `/${run}`;
const admin = new pg.Pool({ connectionString: adminUrl.href });
let db = new pg.Pool({ connectionString: databaseUrl.href });
let scratch: string, directory: string, configurationRoot: string, origin: string, port: number;
const restoreName = `${run}_restore`;
let child: ChildProcess | undefined;
let buyer: Page, bystander: Page, anonymous: Page, operator: Page;
const contexts: BrowserContext[] = [];
let operatorId: string, buyerId: string;
function receipt(message: string) {
  console.log(`[commerce browser acceptance] ${message}`);
}
async function stop() {
  if (child) await stopOwnedChild(child);
  child = undefined;
}
async function start() {
  const env: Record<string, string | undefined> = {
    ...process.env,
    NODE_ENV: "development",
    DATABASE_URL: databaseUrl.href,
    BETTER_AUTH_URL: origin,
    BETTER_AUTH_SECRET: secret,
    APP_ENCRYPTION_KEY: encryptionKey,
    VITE_AUTH_ENABLED: "true",
    VITE_STATIC_SITE: "false",
    ADMIN_EMAILS: adminEmail,
    WDBX_BINARY: binary,
    WDBX_COMMERCE_DIRECTORY: directory,
    WDBX_COMMERCE_CONFIG: join(configurationRoot, "config.json"),
    WDBX_COMMERCE_HOST_KEY: join(configurationRoot, "host.bin"),
  };
  // Never inherit real provider credentials or external payment configuration.
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
    "STRIPE_PAYMENT_LINK",
    "BILLING_PROVIDER",
  ])
    env[name] = "";
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
  for (let attempt = 0; attempt < 200; attempt++) {
    if (child.exitCode !== null || child.signalCode !== null)
      throw new Error("Owned acceptance app exited before readiness.");
    try {
      if ((await fetch(`${origin}/api/auth/ok`, { signal: AbortSignal.timeout(5000) })).ok) return;
    } catch {
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Owned acceptance app did not become ready.");
}
async function call(page: Page, method: string, data?: unknown): Promise<unknown> {
  return page.evaluate(
    async ({ method, data }) => {
      const module = "commerce";
      const api = await import(/* @vite-ignore */ `/src/lib/${module}.ts`);
      try {
        return await api[method](data === undefined ? undefined : { data });
      } catch (error) {
        return { thrown: error instanceof Error ? error.message : "unknown" };
      }
    },
    { method, data },
  );
}
async function signup(page: Page, email: string) {
  await page.goto(`${origin}/login?next=/profile`);
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Need an account?"),
    );
    return button && Object.keys(button).some((key) => key.startsWith("__reactProps$"));
  });
  await page.getByRole("button", { name: "Need an account? Create one", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Synthetic Commerce Acceptance");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(`${origin}/profile`);
  await expect(page.getByLabel("Display name")).toHaveValue("Synthetic Commerce Acceptance");
  const rows = (await db.query('select id from "user" where email=$1', [email])).rows;
  expect(rows).toHaveLength(1);
  return rows[0].id as string;
}
async function create(page: Page, key = randomUUID()) {
  const order = await call(page, "createPilotOrder", { idempotencyKey: key });
  expect(order).toMatchObject({ status: "awaiting_payment", currency: "USD", amountMinor: 250000 });
  return order as CommerceOrder;
}
test.beforeAll(async ({ browser }) => {
  scratch = await realpath(await mkdtemp(join(tmpdir(), "quesar-commerce-browser-")));
  configurationRoot = scratch;
  directory = join(scratch, "invoices");
  await mkdir(directory, { mode: 0o700 });
  await writeFile(join(configurationRoot, "host.bin"), randomBytes(32), { mode: 0o600 });
  await writeFile(
    join(configurationRoot, "config.json"),
    JSON.stringify({
      schema: "wdbx-typed-host-config-v1",
      namespace: Array(32).fill(1),
      current: {
        policy: Array(32).fill(3),
        consent: Array(32).fill(4),
        valid_from: 0,
        valid_until: 4000000000000,
        grants: [{ principal: Array(32).fill(5), role: "service", writer: Array(16).fill(6) }],
      },
      history: [],
    }),
    { mode: 0o600 },
  );
  receipt(
    `installed native WDBX SHA256 ${createHash("sha256")
      .update(await readFile(binary))
      .digest("hex")}`,
  );
  await admin.query(`create database "${run}"`);
  await migrate(databaseUrl.href);
  const server = createServer();
  server.listen(0, "localhost");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No fixture port.");
  port = address.port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  origin = `http://localhost:${port}`;
  await start();
  for (let i = 0; i < 4; i++) contexts.push(await browser.newContext());
  [buyer, bystander, anonymous, operator] = await Promise.all(contexts.map((c) => c.newPage()));
  // The cold failure destroyed the anonymous execution context after signup
  // first reached /profile; the previous warmup omitted that route and its
  // lazy profile/billing/passkey dependencies. Visit both routes and import the read-only
  // commerce transport before any account or invoice mutation; do not retry
  // failed journey assertions or replay writes.
  for (const route of ["/login", "/profile", "/login"]) {
    await anonymous.goto(`${origin}${route}`, { waitUntil: "networkidle" });
  }
  await call(anonymous, "getCommerceReadiness");
  await anonymous.waitForLoadState("networkidle");
  receipt("non-mutating login/profile/commerce dependency warmup completed before signup");
  buyerId = await signup(buyer, buyerEmail);
  await signup(bystander, `${run}-other@example.invalid`);
  operatorId = await signup(operator, adminEmail);
  receipt("three real browser signup sessions established on disposable identity database");
});
test.afterAll(async () => {
  await cleanupOwnedResources([
    ...contexts.map((context) => () => context.close()),
    stop,
    () => db.end(),
    ...[run, restoreName].map(
      (name) => () => admin.query(`drop database if exists "${name}" with (force)`),
    ),
    () => admin.end(),
    async () => {
      if (scratch) await rm(scratch, { recursive: true, force: true });
    },
  ]);
  receipt("owned app, browser contexts, identity database and native ledger scratch cleaned");
});

test("anonymous browser cannot create or list invoices", async () => {
  expect(await call(anonymous, "getCommerceReadiness")).toEqual({
    configured: true,
    paymentMode: "manual_invoice",
    storage: "wdbx",
  });
  expect(await call(anonymous, "createPilotOrder", { idempotencyKey: randomUUID() })).toMatchObject(
    { thrown: "Unauthorized" },
  );
  expect(await call(anonymous, "listCommerceOrders")).toMatchObject({ thrown: "Unauthorized" });
});
test("HTTP replay creates one native invoice and rejects client-owned money", async () => {
  const key = randomUUID();
  const order = await create(buyer, key);
  expect(await call(buyer, "createPilotOrder", { idempotencyKey: key })).toEqual(order);
  expect(await call(buyer, "listCommerceOrders")).toEqual([order]);
  expect(
    await call(buyer, "createPilotOrder", { idempotencyKey: randomUUID(), amountMinor: 1 }),
  ).toHaveProperty("thrown");
  expect(await call(buyer, "listCommerceOrders")).toEqual([order]);
  const wal = await readFile(join(directory, order.id, "zig-v4.wal"));
  expect(wal.includes(Buffer.from(buyerId))).toBe(false);
  expect(wal.includes(Buffer.from(order.description))).toBe(false);
  receipt("real HTTP invoice create/replay and strict money-field rejection passed");
});
test("bystander cannot list or cancel owner invoice and owner cancellation is replayable", async () => {
  const order = await create(buyer);
  expect(await call(bystander, "listCommerceOrders")).toEqual([]);
  expect(await call(bystander, "cancelCommerceOrder", { orderId: order.id })).toMatchObject({
    thrown: "Invoice unavailable or no longer awaiting payment.",
  });
  const cancelled = await call(buyer, "cancelCommerceOrder", { orderId: order.id });
  expect(cancelled).toMatchObject({ id: order.id, status: "cancelled" });
  expect(await call(buyer, "cancelCommerceOrder", { orderId: order.id })).toEqual(cancelled);
});
test("allowlisted password account cannot settle before verified linked identity", async () => {
  const order = await create(buyer);
  for (const page of [buyer, operator])
    expect(
      await call(page, "adminSettleCommerceOrder", {
        orderId: order.id,
        paymentReference: "synthetic-wire",
      }),
    ).toMatchObject({ thrown: "Administrator access required." });
  // Synthetic trusted OAuth evidence in this owned DB; no real provider credential or OAuth claim.
  const accountId = randomUUID();
  await db.query(
    'insert into account (id,"accountId","providerId","userId","updatedAt") values ($1,$2,\'google\',$3,now())',
    [accountId, `synthetic-${accountId}`, operatorId],
  );
  await db.query("insert into oauth_email_verifications (account_id,email) values ($1,$2)", [
    accountId,
    adminEmail,
  ]);
  const paid = await call(operator, "adminSettleCommerceOrder", {
    orderId: order.id,
    paymentReference: "synthetic-wire",
  });
  expect(paid).toMatchObject({ id: order.id, status: "paid", paidAt: expect.any(String) });
  expect(
    await call(operator, "adminSettleCommerceOrder", {
      orderId: order.id,
      paymentReference: "synthetic-wire",
    }),
  ).toEqual(paid);
  expect(await call(buyer, "cancelCommerceOrder", { orderId: order.id })).toMatchObject({
    thrown: "Invoice unavailable or no longer awaiting payment.",
  });
  receipt(
    "real authorization denies password-only admin; trusted synthetic linked-identity settlement/replay passed",
  );
});
test("browser sessions and complete WDBX invoice state survive backend replacement", async () => {
  const before = await call(buyer, "listCommerceOrders");
  expect(before).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ status: "awaiting_payment" }),
      expect.objectContaining({ status: "cancelled" }),
      expect.objectContaining({ status: "paid" }),
    ]),
  );
  await Promise.all(
    [buyer, bystander, anonymous, operator].map((page) => page.goto("about:blank")),
  );
  await stop();
  await start();
  await buyer.goto(`${origin}/profile`, { waitUntil: "networkidle" });
  await expect(buyer.getByLabel("Display name")).toHaveValue("Synthetic Commerce Acceptance");
  expect(await call(buyer, "listCommerceOrders")).toEqual(before);
  await bystander.goto(`${origin}/profile`, { waitUntil: "networkidle" });
  expect(await call(bystander, "listCommerceOrders")).toEqual([]);
  receipt(
    "owned Vite backend stopped/restarted; durable Better Auth cookie and all native WDBX states match",
  );
});

test("quiescent paired PostgreSQL and complete native WDBX backup restores sessions and invoice isolation", async () => {
  const bystanderOrder = await create(bystander);
  const buyerBefore = (await call(buyer, "listCommerceOrders")) as CommerceOrder[];
  const bystanderBefore = await call(bystander, "listCommerceOrders");
  expect(bystanderBefore).toEqual([bystanderOrder]);
  const paid = buyerBefore.find((order) => order.status === "paid");
  const awaiting = buyerBefore.find((order) => order.status === "awaiting_payment");
  expect(paid).toBeTruthy();
  expect(awaiting).toBeTruthy();
  // Disconnect all browser/HMR clients and stop the only owned application
  // writer before taking this coordinated local pair snapshot.
  await Promise.all(
    [buyer, bystander, anonymous, operator].map((page) => page.goto("about:blank")),
  );
  await stop();
  const backup = join(scratch, "backup");
  const restoredNative = join(scratch, "restored");
  await mkdir(backup, { mode: 0o700 });
  await cp(directory, join(backup, "invoices"), { recursive: true, preserveTimestamps: true });
  for (const filename of ["config.json", "host.bin"])
    await cp(join(configurationRoot, filename), join(backup, filename), {
      preserveTimestamps: true,
    });
  const dump = join(backup, "identity.dump");
  expect(
    spawnSync(
      "/opt/homebrew/opt/postgresql@17/bin/pg_dump",
      ["-Fc", "-f", dump, databaseUrl.href],
      { stdio: "ignore" },
    ).status,
  ).toBe(0);
  await admin.query(`create database "${restoreName}"`);
  const restoredUrl = new URL(databaseUrl);
  restoredUrl.pathname = `/${restoreName}`;
  expect(
    spawnSync(
      "/opt/homebrew/opt/postgresql@17/bin/pg_restore",
      ["--exit-on-error", "-d", restoredUrl.href, dump],
      { stdio: "ignore" },
    ).status,
  ).toBe(0);
  await mkdir(restoredNative, { mode: 0o700 });
  await cp(join(backup, "invoices"), join(restoredNative, "invoices"), {
    recursive: true,
    preserveTimestamps: true,
  });
  for (const filename of ["config.json", "host.bin"])
    await cp(join(backup, filename), join(restoredNative, filename), { preserveTimestamps: true });
  // Verify the complete native tree, including account ledgers and private
  // permission modes. Assertions expose only hashes, never host key bytes.
  async function inventory(root: string, path = ""): Promise<unknown[]> {
    const entries = await readdir(join(root, path), { withFileTypes: true });
    const rows: unknown[] = [];
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const relative = join(path, entry.name);
      const stat = await lstat(join(root, relative));
      expect(stat.isSymbolicLink()).toBe(false);
      rows.push({
        path: relative,
        mode: stat.mode & 0o777,
        hash: stat.isFile()
          ? createHash("sha256")
              .update(await readFile(join(root, relative)))
              .digest("hex")
          : null,
      });
      if (stat.isDirectory()) rows.push(...(await inventory(root, relative)));
    }
    return rows;
  }
  expect((await lstat(join(restoredNative, "invoices"))).mode & 0o777).toBe(
    (await lstat(directory)).mode & 0o777,
  );
  expect(await inventory(join(restoredNative, "invoices"))).toEqual(await inventory(directory));
  for (const filename of ["config.json", "host.bin"]) {
    const original = join(configurationRoot, filename);
    const restored = join(restoredNative, filename);
    expect((await lstat(restored)).mode & 0o777).toBe((await lstat(original)).mode & 0o777);
    expect(
      createHash("sha256")
        .update(await readFile(restored))
        .digest("hex"),
    ).toBe(
      createHash("sha256")
        .update(await readFile(original))
        .digest("hex"),
    );
  }
  const restoredPool = new pg.Pool({ connectionString: restoredUrl.href });
  let tables: number;
  try {
    const publicTables = (
      await db.query("select tablename from pg_tables where schemaname='public' order by tablename")
    ).rows;
    tables = publicTables.length;
    for (const { tablename } of publicTables) {
      const query = `select row_to_json(t)::text as row from "${tablename}" t order by row_to_json(t)::text`;
      const hash = (rows: unknown) =>
        createHash("sha256").update(JSON.stringify(rows)).digest("hex");
      expect(hash((await restoredPool.query(query)).rows)).toBe(hash((await db.query(query)).rows));
    }
  } finally {
    await restoredPool.end();
  }
  await db.end();
  databaseUrl.pathname = `/${restoreName}`;
  db = new pg.Pool({ connectionString: databaseUrl.href });
  configurationRoot = restoredNative;
  directory = join(restoredNative, "invoices");
  await start();
  for (const [page, id] of [
    [buyer, buyerId],
    [operator, operatorId],
  ] as const) {
    await page.goto(`${origin}/profile`, { waitUntil: "networkidle" });
    await expect(page.getByLabel("Display name")).toHaveValue("Synthetic Commerce Acceptance");
    const sessionUser = await page.evaluate(async () => {
      const response = await fetch("/api/auth/get-session");
      return response.ok ? (await response.json()).user?.id : null;
    });
    expect(sessionUser).toBe(id);
  }
  await bystander.goto(`${origin}/profile`, { waitUntil: "networkidle" });
  expect(await call(buyer, "listCommerceOrders")).toEqual(buyerBefore);
  expect(await call(bystander, "listCommerceOrders")).toEqual(bystanderBefore);
  expect(await call(bystander, "cancelCommerceOrder", { orderId: awaiting!.id })).toMatchObject({
    thrown: "Invoice unavailable or no longer awaiting payment.",
  });
  expect(await call(buyer, "listCommerceOrders")).toEqual(buyerBefore);
  const cancelled = await call(buyer, "cancelCommerceOrder", { orderId: awaiting!.id });
  expect(cancelled).toMatchObject({ id: awaiting!.id, status: "cancelled" });
  expect(await call(buyer, "listCommerceOrders")).toEqual(
    buyerBefore.map((order) => (order.id === awaiting!.id ? cancelled : order)),
  );
  expect(await call(bystander, "listCommerceOrders")).toEqual(bystanderBefore);
  // Same synthetic operator identity/grant and idempotent settled receipt
  // survive the paired restore; no new payment or funds movement occurs.
  expect(
    await call(operator, "adminSettleCommerceOrder", {
      orderId: paid!.id,
      paymentReference: "synthetic-wire",
    }),
  ).toEqual(paid);
  receipt(
    `quiescent paired backup: pg_dump/pg_restore exits 0/0, ${tables} PostgreSQL table hashes match, complete native tree/config/key/modes preserved; restored actual app accepts owner/operator sessions and identical restored native invoice states, foreign awaiting-invoice refusal with unchanged owner inventory and owner cancellation positive control; original pair retained`,
  );
});

test("real account deletion unlinks invoice history and replacement account cannot inherit it", async () => {
  const priorBystanderOrders = (await call(bystander, "listCommerceOrders")) as CommerceOrder[];
  const survivingOrder = await create(bystander);
  const previousOrders = (await call(buyer, "listCommerceOrders")) as CommerceOrder[];
  const status = await buyer.evaluate(async (password) => {
    const response = await fetch("/api/auth/delete-user", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    return response.status;
  }, password);
  expect(status).toBe(200);
  expect((await db.query('select id from "user" where id=$1', [buyerId])).rows).toHaveLength(0);
  expect(await call(buyer, "listCommerceOrders")).toMatchObject({ thrown: "Unauthorized" });
  const replacementId = await signup(buyer, buyerEmail);
  expect(replacementId).not.toBe(buyerId);
  expect(await call(buyer, "listCommerceOrders")).toEqual([]);
  const survivingOrders = await call(bystander, "listCommerceOrders");
  expect(survivingOrders).toHaveLength(priorBystanderOrders.length + 1);
  expect(survivingOrders).toEqual(
    expect.arrayContaining([...priorBystanderOrders, survivingOrder]),
  );
  // Business receipts remain in native ledgers even after identity association is removed.
  for (const order of previousOrders)
    expect((await readFile(join(directory, order.id, "zig-v4.wal"))).length).toBeGreaterThan(0);
  receipt(
    "actual Better Auth deletion removed buyer; fresh same-email identity sees no old invoices; bystander survives",
  );
});
