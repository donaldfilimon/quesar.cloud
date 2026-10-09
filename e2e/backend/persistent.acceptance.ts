import { test, expect } from "@playwright/test";
import { randomBytes, randomUUID, createCipheriv, createHmac, createHash } from "node:crypto";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer as netServer } from "node:net";
import { createServer as httpsServer, type Server } from "node:https";
import { request } from "node:http";
import { mkdtemp, readFile, readdir, rm, realpath, readlink, lstat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, isAbsolute, relative, sep } from "node:path";
import pg from "pg";
import { migrate } from "../../scripts/migrate.ts";
import { acceptanceTarget } from "./guard";
import { cleanupOwnedResources, stopOwnedChild } from "./process-cleanup";

// Run build:persistent separately, serially with every Vite acceptance harness.
// Only fresh owned DBs and process handles are ever destroyed. No traces include credentials.
const target = acceptanceTarget();
// Optional controller-frozen compiled output, never a URL or source checkout.
// The existing guarded .output contract remains the default.
const requestedArtifact = process.env.QUESAR_ACCEPTANCE_ARTIFACT_ROOT;
if (
  requestedArtifact !== undefined &&
  (!requestedArtifact.trim() || !isAbsolute(requestedArtifact))
)
  throw new Error(
    "QUESAR_ACCEPTANCE_ARTIFACT_ROOT must be an absolute local compiled-artifact directory.",
  );
let artifactRoot: string;
let artifactHash: string;
async function hashArtifact(root: string): Promise<string> {
  const hash = createHash("sha256");
  async function walk(path: string) {
    for (const entry of (await readdir(join(root, path), { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const name = join(path, entry.name);
      if (entry.isSymbolicLink()) {
        const destination = relative(root, await realpath(join(root, name)));
        if (destination === ".." || destination.startsWith(`..${sep}`) || isAbsolute(destination))
          throw new Error("Compiled artifact symlinks must remain inside its frozen root.");
        hash.update(JSON.stringify(["link", name, await readlink(join(root, name))]));
      } else if (entry.isDirectory()) {
        hash.update(JSON.stringify(["directory", name]));
        await walk(name);
      } else if (entry.isFile()) {
        const content = await readFile(join(root, name));
        hash.update(JSON.stringify(["file", name, content.length]));
        hash.update(content);
      } else throw new Error("Compiled artifact contains an unsupported filesystem entry.");
    }
  }
  await walk("");
  return hash.digest("hex");
}

const name = `quesar_artifact_${randomBytes(6).toString("hex")}`;
const names = [name, `${name}_restore`];
const admin = new pg.Pool({ connectionString: target.href });
const urlFor = (database: string) => {
  const url = new URL(target);
  url.pathname = `/${database}`;
  return url.href;
};
const db = new pg.Pool({ connectionString: urlFor(name) });
const key = randomBytes(32);
const secret = randomBytes(32).toString("hex");
const password = randomBytes(24).toString("base64url");
let scratch: string;
let databaseRole: string;
let port: number;
let origin: string;
let proxy: Server | undefined;
let child: ChildProcess | undefined;
let diagnostic = "";
const receipt = (message: string) => console.log(`[persistent acceptance] ${message}`);
async function freePort() {
  const server = netServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No owned port");
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return address.port;
}
async function stop() {
  if (child) await stopOwnedChild(child);
  child = undefined;
}
async function start(settings: Record<string, string> = {}) {
  await stop();
  // Runtime allowlist, deliberately no inherited credentials or NODE_ENV.
  diagnostic = "";
  let output = "";
  let spawnFailed = false;
  child = spawn(process.execPath, [join(artifactRoot, "server/index.mjs")], {
    cwd: requestedArtifact === undefined ? undefined : artifactRoot,
    env: {
      PATH: process.env.PATH,
      HOST: "127.0.0.1",
      PORT: String(port),
      ...settings,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.once("error", () => {
    spawnFailed = true;
  });
  child.stdout?.on("data", (chunk: Buffer) => {
    output = (output + chunk.toString()).slice(-4000);
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    diagnostic = (diagnostic + chunk.toString()).slice(-4000);
    for (const value of [password, secret, key.toString("base64")])
      diagnostic = diagnostic.replaceAll(value, "[redacted]");
  });
  for (let attempt = 0; attempt < 120; attempt++) {
    if (spawnFailed || child.exitCode !== null || child.signalCode !== null)
      throw new Error("Owned persistent artifact exited before readiness");
    if (/EADDRINUSE|EACCES/.test(diagnostic))
      throw new Error("Owned persistent artifact could not bind its listener");
    // Observed from this artifact: "➜ Listening on: http://127.0.0.1:<port>/".
    // No HTTP response can establish ownership before this owned child receipt.
    if (!output.includes(`Listening on: http://127.0.0.1:${port}/`)) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      continue;
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/readiness`, {
        signal: AbortSignal.timeout(1000),
      });
      if (child.exitCode !== null || child.signalCode !== null)
        throw new Error("Owned persistent artifact exited during readiness");
      if ([200, 503].includes(response.status)) return response;
    } catch {
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Persistent artifact did not bind owned loopback port");
}
const settings = () => ({
  DATABASE_URL: urlFor(name),
  PGUSER: databaseRole,
  BETTER_AUTH_SECRET: secret,
  BETTER_AUTH_URL: origin,
  APP_ENCRYPTION_KEY: key.toString("base64"),
  VITE_AUTH_ENABLED: "true",
});
async function seedAudit(userId: string, model: string, transplanted?: string) {
  const id = randomUUID();
  const content = JSON.stringify({
    messages: [{ role: "user", content: "Synthetic artifact" }],
    reply: "Persistent artifact decrypted fixture",
  });
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    createHmac("sha256", key).update("quesar:seal").digest(),
    iv,
  );
  cipher.setAAD(Buffer.from(`audit:${id}:${userId}`));
  const ciphertext = Buffer.concat([cipher.update(content), cipher.final()]);
  const sealed =
    transplanted ??
    [
      "v1",
      iv.toString("base64url"),
      ciphertext.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
    ].join(".");
  expect(sealed.includes("Persistent artifact decrypted fixture")).toBe(false);
  await db.query(
    "insert into conversation_audits (id,user_id,provider,model,policy_version,sealed,content_digest,expires_at) values ($1,$2,'fixture',$3,'2026-09-22.1',$4,$5,now()+interval '1 day')",
    [id, userId, model, sealed, createHash("sha256").update(content).digest("base64url")],
  );
  return { id, sealed };
}

test.beforeAll(async () => {
  artifactRoot = await realpath(requestedArtifact ?? resolve(".output"));
  if (
    !(await lstat(join(artifactRoot, "server/index.mjs"))).isFile() ||
    !(await lstat(join(artifactRoot, "public"))).isDirectory()
  )
    throw new Error(
      "Compiled artifact requires server/index.mjs and its public resource directory.",
    );
  artifactHash = await hashArtifact(artifactRoot);
  receipt(`compiled artifact root ${artifactRoot}; full-tree SHA256 ${artifactHash}`);
  scratch = await mkdtemp(join(tmpdir(), "quesar-artifact-"));
  databaseRole = (await admin.query("select current_user as role")).rows[0].role;
  for (const database of names) await admin.query(`create database "${database}"`);
  port = await freePort();
  const tlsPort = await freePort();
  origin = `https://127.0.0.1:${tlsPort}`;
  const cert = join(scratch, "cert.pem");
  const privateKey = join(scratch, "key.pem");
  expect(
    spawnSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-days",
        "1",
        "-subj",
        "/CN=127.0.0.1",
        "-addext",
        "subjectAltName=IP:127.0.0.1",
        "-keyout",
        privateKey,
        "-out",
        cert,
      ],
      { stdio: "ignore" },
    ).status,
  ).toBe(0);
  proxy = httpsServer(
    { key: await readFile(privateKey), cert: await readFile(cert) },
    (incoming, outgoing) => {
      // Preserve HTTPS Host/Origin and secure cookie semantics through private proxy.
      const upstream = request(
        {
          hostname: "127.0.0.1",
          port,
          path: incoming.url,
          method: incoming.method,
          headers: { ...incoming.headers, "x-forwarded-proto": "https" },
        },
        (response) => {
          outgoing.writeHead(response.statusCode ?? 502, response.headers);
          response.pipe(outgoing);
        },
      );
      upstream.on("error", () => {
        if (!outgoing.headersSent) outgoing.writeHead(502);
        outgoing.end();
      });
      incoming.pipe(upstream);
    },
  );
  proxy.listen(tlsPort, "127.0.0.1");
  await once(proxy, "listening");
});
test.afterAll(async () => {
  await cleanupOwnedResources([
    stop,
    async () => {
      if (artifactHash) {
        expect(await hashArtifact(artifactRoot)).toBe(artifactHash);
        receipt(`compiled artifact full-tree SHA256 unchanged ${artifactHash}`);
      }
    },
    async () => {
      if (proxy) {
        proxy.closeAllConnections();
        await new Promise<void>((resolve, reject) =>
          proxy!.close((error) => (error ? reject(error) : resolve())),
        );
      }
    },
    () => db.end(),
    ...names.map(
      (database) => () => admin.query(`drop database if exists "${database}" with (force)`),
    ),
    () => admin.end(),
    async () => {
      if (scratch) await rm(scratch, { recursive: true, force: true });
    },
  ]);
  receipt(
    "owned Node process, TLS proxy/cert, pools, two databases and seeded dump removed; parent PG untouched",
  );
});

test("persistent Node artifact: fail closed, migrations, secure sessions, isolation, restart and seeded restore", async ({
  browser,
}) => {
  let response = await start();
  expect(response.status).toBe(503);
  expect((await response.json()).reasons.sort()).toEqual([
    "auth_origin_invalid",
    "database_unavailable",
    "session_secret_invalid",
  ]);
  expect((await fetch(`http://127.0.0.1:${port}/api/auth/ok`)).status).toBe(503);
  receipt("missing required config refused with NODE_ENV absent, readiness/auth both 503");
  const disconnected = netServer((socket) => socket.destroy());
  disconnected.listen(0, "127.0.0.1");
  await once(disconnected, "listening");
  const address = disconnected.address();
  if (!address || typeof address === "string") throw new Error("No owned disconnected probe port");
  const unavailable = new URL(urlFor(name));
  unavailable.port = String(address.port);
  const unreachable = new pg.Pool({
    connectionString: unavailable.href,
    connectionTimeoutMillis: 1000,
  });
  try {
    response = await start({ ...settings(), DATABASE_URL: unavailable.href });
    expect(response.status).toBe(200);
    // A held non-Postgres listener refuses every socket; no unrelated process
    // can acquire this port during the configuration/connectivity probe.
    await expect(unreachable.query("select 1")).rejects.toThrow();
    const disconnectedAuth = await fetch(`http://127.0.0.1:${port}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
        host: new URL(origin).host,
        "x-forwarded-proto": "https",
      },
      body: JSON.stringify({
        email: `${name}-disconnected@example.invalid`,
        password,
        name: "Synthetic disconnected",
      }),
      signal: AbortSignal.timeout(15000),
    });
    expect(disconnectedAuth.status).toBe(500);
  } finally {
    await cleanupOwnedResources([
      stop,
      () => unreachable.end(),
      () =>
        new Promise<void>((resolve, reject) =>
          disconnected.close((error) => (error ? reject(error) : resolve())),
        ),
    ]);
  }
  expect(
    (await db.query("select count(*)::int as n from pg_tables where schemaname='public'")).rows[0]
      .n,
  ).toBe(0);
  await start(settings());
  expect(
    (await db.query("select count(*)::int as n from pg_tables where schemaname='public'")).rows[0]
      .n,
  ).toBe(0);
  await migrate(urlFor(name));
  await migrate(urlFor(name));
  const expected = (await readdir("migrations", { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => ({ name: entry.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  expect((await db.query("select name from _migrations order by name")).rows).toEqual(expected);
  receipt(
    `config/connectivity separated; Node startup did not migrate; explicit/repeat migration exact ${expected.length} root filenames`,
  );
  const owner = await browser.newContext({ ignoreHTTPSErrors: true });
  const other = await browser.newContext({ ignoreHTTPSErrors: true });
  for (const context of [owner, other]) {
    await context.route("**/*", (route) =>
      new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
    );
  }
  try {
    const ids: string[] = [];
    for (const [context, suffix] of [
      [owner, "owner"],
      [other, "other"],
    ] as const) {
      const signup = await context.request.post(`${origin}/api/auth/sign-up/email`, {
        headers: { origin },
        data: { email: `${name}-${suffix}@example.invalid`, password, name: `Synthetic ${suffix}` },
      });
      if (signup.status() !== 200) console.log("[persistent diagnostic]", diagnostic);
      expect(signup.status()).toBe(200);
      const cookies = await context.cookies();
      expect(
        cookies.some(
          (cookie) =>
            cookie.name === "__Host-quesar.session_token" && cookie.secure && cookie.httpOnly,
        ),
      ).toBe(true);
      ids.push(
        (
          await db.query('select id from "user" where email=$1', [
            `${name}-${suffix}@example.invalid`,
          ])
        ).rows[0].id,
      );
    }
    const page = await owner.newPage();
    const bystander = await other.newPage();
    for (const [id, body] of [
      [ids[0], "artifact owner note"],
      [ids[1], "artifact other note"],
    ])
      await db.query("insert into field_notes (user_id,node_id,body) values ($1,'quesar',$2)", [
        id,
        body,
      ]);
    const audit = await seedAudit(ids[0], "owner-only");
    const transplant = await seedAudit(ids[1], "transplanted", audit.sealed);
    for (const [active, own, absent] of [
      [page, "artifact owner note", "artifact other note"],
      [bystander, "artifact other note", "artifact owner note"],
    ] as const) {
      await active.goto(`${origin}/console`);
      await expect(active.getByText(own, { exact: true })).toBeVisible();
      await expect(active.getByText(absent, { exact: true })).toHaveCount(0);
      await active.getByRole("tab", { name: "My audits", exact: true }).click();
      await expect(active.getByRole("button", { name: "View audit", exact: true })).toHaveCount(1);
      await active.getByRole("button", { name: "View audit", exact: true }).click();
    }
    await expect(
      page.getByText("Persistent artifact decrypted fixture", { exact: true }),
    ).toBeVisible();
    await expect(bystander.getByRole("alert")).toContainText("could not be decrypted");
    // Replay the compiled read transport with a known foreign ID. The account
    // scope must refuse it even when the caller bypasses the inventory UI.
    const outgoing = bystander.waitForRequest(
      (request) =>
        request.method() === "POST" && Boolean(request.postData()?.includes(transplant.id)),
    );
    await bystander.getByRole("button", { name: "View audit", exact: true }).click();
    const transport = await outgoing;
    const foreignResponse = await bystander.evaluate(
      async ({ url, body, contentType }) => {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "content-type": contentType,
            "x-tsr-serverFn": "true",
            accept: "application/json",
          },
          body,
        });
        return { status: response.status, refused: (await response.text()).includes("not_found") };
      },
      {
        url: transport.url(),
        body: transport.postData()!.replaceAll(transplant.id, audit.id),
        contentType: transport.headers()["content-type"],
      },
    );
    expect(foreignResponse).toEqual({ status: 200, refused: true });

    await expect(bystander.getByText("fixture · owner-only", { exact: true })).toHaveCount(0);
    receipt(
      "compiled HTTPS Console: secure auth cookies; seeded notes/audit account isolation; owner decrypt, known foreign read and transplanted ciphertext refusal",
    );
    await Promise.all([page, bystander].map((active) => active.goto("about:blank")));
    await stop();
    await start(settings());
    await page.goto(`${origin}/profile`);
    await expect(page.getByLabel("Display name")).toHaveValue("Synthetic owner");
    await page.goto(`${origin}/console`);
    await expect(page.getByText("artifact owner note", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "My audits", exact: true }).click();
    await page.getByRole("button", { name: "View audit", exact: true }).click();
    await expect(
      page.getByText("Persistent artifact decrypted fixture", { exact: true }),
    ).toBeVisible();
    await Promise.all([page, bystander].map((active) => active.goto("about:blank")));
    await stop();
    const dump = join(scratch, "seeded.dump");
    expect(
      spawnSync("/opt/homebrew/opt/postgresql@17/bin/pg_dump", ["-Fc", "-f", dump, urlFor(name)], {
        stdio: "ignore",
      }).status,
    ).toBe(0);
    expect(
      spawnSync(
        "/opt/homebrew/opt/postgresql@17/bin/pg_restore",
        ["--exit-on-error", "-d", urlFor(names[1]), dump],
        { stdio: "ignore" },
      ).status,
    ).toBe(0);
    const restored = new pg.Pool({ connectionString: urlFor(names[1]) });
    let tables = 0;
    try {
      const rows = (
        await db.query(
          "select tablename from pg_tables where schemaname='public' order by tablename",
        )
      ).rows;
      tables = rows.length;
      for (const { tablename } of rows) {
        const query = `select row_to_json(t)::text as row from "${tablename}" t order by row_to_json(t)::text`;
        const hash = (value: unknown) =>
          createHash("sha256").update(JSON.stringify(value)).digest("hex");
        expect(hash((await restored.query(query)).rows)).toBe(hash((await db.query(query)).rows));
      }
    } finally {
      await restored.end();
    }
    await start({ ...settings(), DATABASE_URL: urlFor(names[1]) });
    await page.goto(`${origin}/profile`);
    await expect(page.getByLabel("Display name")).toHaveValue("Synthetic owner");
    await page.goto(`${origin}/console`);
    await expect(page.getByText("artifact owner note", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "My audits", exact: true }).click();
    await page.getByRole("button", { name: "View audit", exact: true }).click();
    await expect(
      page.getByText("Persistent artifact decrypted fixture", { exact: true }),
    ).toBeVisible();
    receipt(
      `Node restart preserved session/note/decryption; seeded pg_dump/restore exits 0/0, ${tables} public table hashes equal; restored Node artifact accepted same secure session and decrypted audit`,
    );
  } finally {
    await owner.close();
    await other.close();
  }
});
