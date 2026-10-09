import type { RunnerReceipt } from "./evidence-types.ts";
// Serial fixture ownership after concurrent HEAD advancement. All providers are synthetic.
import { spawnSync } from "node:child_process";
import { openSync, closeSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const root = "notes/verification/2026-10-09-finishing/evidence";
const env = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  USER: process.env.USER,
  PGUSER: process.env.USER,
  QUESAR_BACKEND_ACCEPTANCE: "1",
  QUESAR_ACCEPTANCE_ADMIN_URL: "postgresql://127.0.0.1:55471/postgres",
};
const cases: [string, string[], NodeJS.ProcessEnv?][] = [
  [
    "persistent-acceptance",
    ["-c", "e2e/backend/persistent.config.ts"],
    {
      QUESAR_ACCEPTANCE_ARTIFACT_ROOT: resolve(
        ".superpowers/sdd/2026-10-09-finish-approved-delivery/implementer-current-persistent-artifact",
      ),
    },
  ],
  ["durable", ["-c", "e2e/backend/playwright.config.ts"]],
  ["consent", ["-c", "e2e/backend/ai-consent.config.ts"]],
  ["commerce", ["-c", "e2e/backend/commerce.config.ts"]],
  [
    "film",
    [
      "-c",
      "e2e/film/playwright.config.ts",
      "--project=capture",
      "--output=test-results/implementer-current-film",
    ],
  ],
  [
    "film-guard",
    [
      "-c",
      "e2e/film/playwright.config.ts",
      "--project=capture-disabled",
      "--output=test-results/implementer-current-film-guard",
    ],
    { FILM_CAPTURE_BUILD: "0" },
  ],
];
const receipts: RunnerReceipt[] = [];
for (const [name, args, extra = {}] of cases) {
  const path = `${root}/implementer-current-${name}.log`;
  const log = openSync(path, "wx");
  const started = new Date().toISOString();
  let result;
  try {
    result = spawnSync(
      process.execPath,
      ["node_modules/@playwright/test/cli.js", "test", ...args],
      { env: { ...env, ...extra }, stdio: ["ignore", log, log], timeout: 360000 },
    );
  } finally {
    closeSync(log);
  }
  receipts.push({
    name,
    path,
    started,
    ended: new Date().toISOString(),
    exit: result.status,
    signal: result.signal,
    error: (result.error as NodeJS.ErrnoException | undefined)?.code,
  });
  writeFileSync(
    `${root}/implementer-current-runner-receipts.json`,
    JSON.stringify(receipts, null, 2) + "\n",
  );
  console.log(`${name} exit=${result.status}`);
  if (result.status !== 0) process.exit(1);
}
