import { randomBytes, randomUUID, createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
  readdir,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { CommerceRepository, requireDurableCommerce } from "./commerce.server";
import { WdbxCommerceStore } from "./commerce-wdbx.server";
vi.mock("./admin.server", () => ({
  adminDecisionFor: vi.fn(async (id: string) => ({ admin: id === "verified-admin" })),
}));
const binary =
  process.env.WDBX_TEST_BINARY ?? "/Users/donaldfilimon/dev/active/wdbx/zig-out/bin/wdbx";
let base: string, directory: string, store: WdbxCommerceStore, repo: CommerceRepository;
let options: { binary: string; directory: string; config: string; hostKey: string };
beforeAll(async () => {
  base = await realpath(await mkdtemp(join(tmpdir(), "quesar-commerce-wdbx-")));
  directory = join(base, "invoices");
  await mkdir(directory, { mode: 0o700 });
  const config = join(base, "config.json"),
    hostKey = join(base, "host.bin");
  await writeFile(hostKey, randomBytes(32), { mode: 0o600 });
  await writeFile(
    config,
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
  vi.stubEnv("APP_ENCRYPTION_KEY", randomBytes(32).toString("base64"));
  options = { binary, directory, config, hostKey };
  store = new WdbxCommerceStore(options);
  repo = new CommerceRepository(store);
  console.info(
    `WDBX executable SHA256 ${createHash("sha256")
      .update(await readFile(binary))
      .digest("hex")}`,
  );
}, 30000);
afterAll(async () => {
  vi.unstubAllEnvs();
  if (base) await rm(base, { recursive: true, force: true });
});
describe("first-party WDBX invoicing", () => {
  it("deduplicates competing native writer requests and fixes server-owned money", async () => {
    const buyer = randomUUID(),
      key = randomUUID();
    const orders = await Promise.all(Array.from({ length: 4 }, () => repo.create(buyer, key)));
    expect(new Set(orders.map((o) => o.id)).size).toBe(1);
    expect(orders[0]).toMatchObject({
      currency: "USD",
      amountMinor: 250000,
      product: "pilot",
      status: "awaiting_payment",
      paidAt: null,
    });
    expect((await repo.create(randomUUID(), key)).id).not.toBe(orders[0].id);
    expect(await repo.list(randomUUID())).toEqual([]);
    await expect(repo.create(buyer, "bad-key")).rejects.toThrow();
    const wal = await readFile(join(directory, orders[0].id, "zig-v4.wal"));
    expect(wal.includes(Buffer.from(buyer))).toBe(false);
    expect(wal.includes(Buffer.from("Pilot engineering"))).toBe(false);
    // Fresh adapter is a new native process/store open: authority survives instance replacement.
    expect((await new CommerceRepository(store).list(buyer))[0].id).toBe(orders[0].id);
  }, 30000);
  it("denies other buyers and unverified admins, preserves exactly one terminal transition", async () => {
    const buyer = randomUUID(),
      order = await repo.create(buyer, randomUUID());
    await expect(repo.cancel(randomUUID(), order.id)).rejects.toThrow("unavailable");
    await expect(repo.settle(buyer, order.id, "wire-confirmation")).rejects.toThrow(
      "Administrator",
    );
    await expect(repo.settle("verified-admin", order.id, "\n")).rejects.toThrow("reference");
    const results = await Promise.allSettled([
      repo.settle("verified-admin", order.id, "wire-confirmation"),
      repo.settle("verified-admin", order.id, "other-confirmation"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await repo.list(buyer))[0]).toMatchObject({ status: "paid" });
    await expect(repo.cancel(buyer, order.id)).rejects.toThrow("unavailable");
    const cancelled = await repo.create(buyer, randomUUID());
    await repo.cancel(buyer, cancelled.id);
    await expect(repo.settle("verified-admin", cancelled.id, "wire-confirmation")).rejects.toThrow(
      "unavailable",
    );
  }, 30000);
  it("retains durable business facts while removing current buyer and actor association", async () => {
    const buyer = randomUUID(),
      order = await repo.create(buyer, randomUUID());
    await repo.cancel(buyer, order.id);
    expect(await repo.unlinkAccount(buyer)).toBe(1);
    expect(await repo.list(buyer)).toEqual([]);
    expect(await repo.unlinkAccount(buyer)).toBe(0);
    expect((await readdir(directory)).includes(order.id)).toBe(true);
  }, 30000);
  it("recovers a committed invoice after native output acknowledgement is lost", async () => {
    const shim = join(base, "ack-loss.cjs"),
      marker = join(base, "ack-loss.marker");
    await writeFile(
      shim,
      `#!/usr/bin/env node\nconst {spawnSync}=require('node:child_process'); const fs=require('node:fs');const r=spawnSync(${JSON.stringify(binary)},process.argv.slice(2));if(process.argv[3]==='commit' && r.status===0 && !fs.existsSync(${JSON.stringify(marker)})){fs.writeFileSync(${JSON.stringify(marker)},'lost');process.exit(1);}process.stdout.write(r.stdout);process.stderr.write(r.stderr);process.exit(r.status??1);`,
      { mode: 0o700 },
    );
    const recovering = new CommerceRepository(new WdbxCommerceStore({ ...options, binary: shim }));
    const buyer = randomUUID(),
      key = randomUUID();
    const first = await recovering.create(buyer, key);
    expect((await recovering.create(buyer, key)).id).toBe(first.id);
    expect(await repo.list(buyer)).toHaveLength(1);
  }, 30000);
  it("rejects unsafe invoice discovery and does not create missing invoices during cancellation", async () => {
    const missing = randomUUID();
    await expect(repo.cancel(randomUUID(), missing)).rejects.toThrow("unavailable");
    expect((await readdir(directory)).includes(missing)).toBe(false);
    const bad = join(directory, randomUUID());
    await symlink(base, bad);
    try {
      await expect(store.ids()).rejects.toThrow("Invalid WDBX invoice directory");
    } finally {
      await rm(bad);
    }
  });
  it("fences account deletion against concurrent and later invoice creation", async () => {
    const buyer = randomUUID();
    await repo.create(buyer, randomUUID());
    await Promise.allSettled([repo.create(buyer, randomUUID()), repo.unlinkAccount(buyer)]);
    expect(await repo.list(buyer)).toEqual([]);
    await expect(repo.create(buyer, randomUUID())).rejects.toThrow("account unavailable");
  }, 30000);
  it("rejects invoice 1001 before publication while discovery at capacity remains available", async () => {
    const synthetic: string[] = [];
    const count = (await store.ids()).length;
    try {
      for (let n = count; n < 1000; n++) {
        const id = randomUUID();
        synthetic.push(id);
        await mkdir(join(directory, id), { mode: 0o700 });
      }
      expect(await store.ids()).toHaveLength(1000);
      await expect(repo.create(randomUUID(), randomUUID())).rejects.toThrow("capacity reached");
      expect(await store.ids()).toHaveLength(1000);
    } finally {
      await Promise.all(
        synthetic.map((id) => rm(join(directory, id), { recursive: true, force: true })),
      );
    }
  }, 30000);
  it("refuses unconfigured durable ledger", () => {
    expect(requireDurableCommerce).toThrow("WDBX");
  });
});
