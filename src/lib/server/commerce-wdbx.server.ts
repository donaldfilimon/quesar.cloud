import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, rmdir, writeFile } from "node:fs/promises";
import { join, isAbsolute } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
const exec = promisify(execFile);
const bytes = (length: number) => z.array(z.number().int().min(0).max(255)).length(length);
const grant = z
  .object({ principal: bytes(32), role: z.literal("service"), writer: bytes(16) })
  .strict();
const epoch = z
  .object({
    policy: bytes(32),
    consent: bytes(32),
    valid_from: z.number().int().safe(),
    valid_until: z.number().int().safe(),
    grants: z.array(grant).length(1),
  })
  .strict();
const configSchema = z
  .object({
    schema: z.literal("wdbx-typed-host-config-v1"),
    namespace: bytes(32),
    current: epoch,
    history: z.array(epoch),
  })
  .strict();
const inspectionSchema = z.object({
  schema: z.literal("wdbx-typed-inspection-v1"),
  namespace: z.string(),
  frontier: z.array(
    z.object({ writer_id: z.string(), sequence: z.number().int().safe().nonnegative() }),
  ),
  rows: z.array(
    z.object({
      current: z.boolean(),
      conflict_ids: z.array(z.string()),
      mutation: z.object({ kv: z.object({ key: z.string(), value: z.string() }) }),
    }),
  ),
});
export interface WdbxOptions {
  binary: string;
  directory: string;
  config: string;
  hostKey: string;
}
export function wdbxOptions(): WdbxOptions | null {
  const binary = process.env.WDBX_BINARY,
    directory = process.env.WDBX_COMMERCE_DIRECTORY,
    config = process.env.WDBX_COMMERCE_CONFIG,
    hostKey = process.env.WDBX_COMMERCE_HOST_KEY;
  if (![binary, directory, config, hostKey].every((v) => v && isAbsolute(v))) return null;
  return { binary: binary!, directory: directory!, config: config!, hostKey: hostKey! };
}
async function privateDirectory(path: string) {
  const stat = await lstat(path);
  if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0)
    throw new Error("WDBX requires a private dedicated directory.");
}
/** Each invoice has one authoritative encrypted snapshot key in its own synced WDBX ledger.
 * This preserves complete current reads despite CLI inspection's eight-history-row projection. */
export class WdbxCommerceStore {
  constructor(
    private options: WdbxOptions,
    private invoiceCapacity: number | null = 1000,
  ) {}
  async withAccountLock<T>(userId: string, callback: () => Promise<T>): Promise<T> {
    await this.configuration();
    const directory = join(this.options.directory, ".account-locks");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await privateDirectory(directory);
    const name = createHash("sha256").update(userId).digest("hex");
    return this.withLock(join(directory, name), callback);
  }
  private async withLock<T>(directory: string, callback: () => Promise<T>): Promise<T> {
    let acquired = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      try {
        await mkdir(directory, { mode: 0o700 });
        acquired = true;
        break;
      } catch (error) {
        if (
          typeof error !== "object" ||
          error === null ||
          !("code" in error) ||
          error.code !== "EEXIST"
        )
          throw error;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }
    if (!acquired)
      throw new Error(
        "Invoice admission is busy; retry later. A stopped writer lock requires operator review.",
      );
    try {
      return await callback();
    } finally {
      await rmdir(directory);
    }
  }
  async accountDeleted(userId: string, mark = false): Promise<boolean> {
    const directory = join(this.options.directory, ".account-ledgers");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await privateDirectory(directory);
    const accountStore = new WdbxCommerceStore({ ...this.options, directory }, null);
    const hex = createHash("sha256")
      .update(JSON.stringify(["quesar-commerce-account-v1", userId]))
      .digest("hex");
    const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
    return accountStore.update(
      id,
      (value) => {
        if (value !== null && value !== "account-deleted")
          throw new Error("WDBX account deletion fence is invalid.");
        return {
          value: mark ? "account-deleted" : value,
          result: mark || value === "account-deleted",
        };
      },
      mark,
    );
  }
  private async configuration() {
    await privateDirectory(this.options.directory);
    const config = configSchema.parse(JSON.parse(await readFile(this.options.config, "utf8")));
    const configured = config.current.grants[0];
    if (
      config.history.some((e) =>
        e.grants.some((g) => JSON.stringify(g) !== JSON.stringify(configured)),
      )
    )
      throw new Error("Commerce requires one stable WDBX host writer.");
    return config;
  }
  private async inspect(directory: string) {
    const { stdout } = await exec(
      this.options.binary,
      ["typed", "inspect", directory, this.options.config, this.options.hostKey],
      { timeout: 10000, maxBuffer: 8 * 1024 * 1024 },
    );
    return inspectionSchema.parse(JSON.parse(stdout));
  }
  async ids(): Promise<string[]> {
    await this.configuration();
    const entries = await readdir(this.options.directory, { withFileTypes: true });
    if (
      entries.some(
        (e) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(e.name) &&
          !e.isDirectory(),
      )
    )
      throw new Error("Invalid WDBX invoice directory.");
    const ids = entries
      .filter(
        (e) =>
          e.isDirectory() &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(e.name),
      )
      .map((e) => e.name);
    if (this.invoiceCapacity !== null && ids.length > this.invoiceCapacity)
      throw new Error("Commerce invoice discovery capacity exceeded; operator review required.");
    return ids;
  }
  async update<T>(
    id: string,
    callback: (value: string | null) => { value: string | null; result: T },
    create = false,
  ): Promise<T> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id))
      throw new Error("Invalid invoice identifier.");
    const config = await this.configuration();
    const directory = join(this.options.directory, id);
    if (create)
      await this.withLock(join(this.options.directory, ".creation-lock"), async () => {
        try {
          await lstat(directory);
        } catch (error) {
          if (
            typeof error !== "object" ||
            error === null ||
            !("code" in error) ||
            error.code !== "ENOENT"
          )
            throw error;
          if (this.invoiceCapacity !== null && (await this.ids()).length >= this.invoiceCapacity)
            throw new Error("Commerce invoice capacity reached; contact sales.", { cause: error });
          await mkdir(directory, { mode: 0o700 });
        }
      });
    else {
      try {
        await lstat(directory);
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "ENOENT"
        )
          return callback(null).result;
        throw error;
      }
    }
    await privateDirectory(directory);
    const writer = config.current.grants[0].writer;
    const writerHex = Buffer.from(writer).toString("hex");
    let lastError: unknown;
    for (let attempt = 0; attempt < 8; attempt++) {
      let stage: "inspect" | "commit" = "inspect";
      try {
        const snapshot = await this.inspect(directory);
        if (
          snapshot.namespace !== Buffer.from(config.namespace).toString("hex") ||
          snapshot.frontier.some((h) => h.writer_id !== writerHex)
        )
          throw new Error("WDBX commerce namespace or writer mismatch.");
        const current = snapshot.rows.filter((r) => r.current);
        if (
          current.length > 1 ||
          current.some((r) => r.conflict_ids.length !== 1 || r.mutation.kv.key !== "invoice")
        )
          throw new Error("WDBX invoice conflict requires operator resolution.");
        const previous = current[0]?.mutation.kv.value ?? null;
        const change = callback(previous);
        if (change.value === previous) return change.result;
        if (change.value === null || Buffer.byteLength(change.value) > 8192)
          throw new Error("WDBX invoice payload capacity exceeded.");
        const temporary = await mkdtemp(join(this.options.directory, ".request-"));
        try {
          const auth = {
            schema: "wdbx-typed-host-authorization-v1",
            authorization: {
              allowed: true,
              writer_allowed: true,
              principal: config.current.grants[0].principal,
              role: "service",
              namespace: config.namespace,
              policy: config.current.policy,
              consent: config.current.consent,
            },
          };
          const transaction = {
            schema: "wdbx-typed-transaction-input-v1",
            transaction: {
              writer,
              sequence: (snapshot.frontier[0]?.sequence ?? 0) + 1,
              nonce: Array.from(randomBytes(32)),
              observed: snapshot.frontier.map((h) => ({
                writer: Array.from(Buffer.from(h.writer_id, "hex")),
                sequence: h.sequence,
              })),
              mutations: [{ kv: { key: "invoice", value: change.value } }],
            },
          };
          await writeFile(join(temporary, "auth.json"), JSON.stringify(auth), { mode: 0o600 });
          await writeFile(join(temporary, "transaction.json"), JSON.stringify(transaction), {
            mode: 0o600,
          });
          stage = "commit";
          await exec(
            this.options.binary,
            [
              "typed",
              "commit",
              directory,
              this.options.config,
              this.options.hostKey,
              join(temporary, "auth.json"),
              join(temporary, "transaction.json"),
            ],
            { timeout: 10000, maxBuffer: 1024 * 1024 },
          );
          return change.result;
        } finally {
          await rm(temporary, { recursive: true, force: true });
        }
      } catch (error) {
        // Reopen/reinspect after any uncertain publication; callback must recognize its stable operation.
        const stderr =
          typeof error === "object" && error !== null && "stderr" in error
            ? String(error.stderr)
            : "";
        if (stage !== "commit" && !/WriterBusy|WouldBlock/.test(stderr)) {
          if (stderr)
            throw new Error("WDBX invoice ledger unavailable; operator review required.", {
              cause: error,
            });
          throw error;
        }
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
      }
    }
    // Do not include native command/config/key paths or payloads in user-visible errors.
    void lastError;
    throw new Error(
      "WDBX invoice operation could not be confirmed; retry the same request identifier.",
    );
  }
}
