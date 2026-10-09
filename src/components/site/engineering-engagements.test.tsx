import { chromium, type Browser } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { afterAll, beforeAll, expect, it } from "vitest";
import { fileURLToPath } from "node:url";

declare global {
  interface Window {
    requests: {
      key: string;
      resolve: (order: { invoiceNumber: string; status: string }) => void;
      reject: (error: Error) => void;
    }[];
    identity: (id: string | null) => void;
  }
}

let server: ViteDevServer;
let browser: Browser;
let origin: string;
const harness = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {EngineeringEngagements} from '/src/components/site/engineering-engagements.tsx';
window.requests=[];
window.user={id:'A',isDevFallback:false};
window.identity=(id)=>{window.user=id?{id,isDevFallback:false}:null;draw()};
const root=createRoot(document.getElementById('root'));
function draw(){root.render(React.createElement(EngineeringEngagements))}draw();
`;
beforeAll(async () => {
  server = await createServer({
    configFile: false,
    root: process.cwd(),
    server: {
      host: "127.0.0.1",
      port: 0,
      hmr: false,
      watch: { ignored: ["**/notes/**", "**/public/**", "**/docs/**"] },
    },
    resolve: {
      alias: [
        ...["lib/auth/use-current-user", "lib/static-site", "lib/commerce"].map((suffix) => ({
          find: `@/${suffix}`,
          replacement: `\0fixture:@/${suffix}`,
        })),
        { find: "@", replacement: fileURLToPath(new URL("../../", import.meta.url)) },
      ],
    },
    plugins: [
      {
        name: "invoice-lifecycle-fixture",
        enforce: "pre",
        resolveId(id) {
          if (id.startsWith("\0fixture:")) return id;
          if (id === "/fixture.js") return "\0fixture:harness";
          for (const suffix of ["lib/auth/use-current-user", "lib/static-site", "lib/commerce"]) {
            if (id.includes(`/src/${suffix}`)) return `\0fixture:@/${suffix}`;
          }
          if (
            [
              "@tanstack/react-router",
              "@/lib/auth/use-current-user",
              "@/lib/static-site",
              "@/lib/commerce",
            ].includes(id)
          )
            return `\0fixture:${id}`;
        },
        load(id) {
          if (id === "\0fixture:harness") return harness;
          if (id === "\0fixture:@tanstack/react-router")
            return `import React from 'react';export function Link({children,...props}){return React.createElement('a',null,children)}`;
          if (id === "\0fixture:@/lib/auth/use-current-user")
            return `export function useCurrentUserState(){return {user:window.user,isPending:false}}`;
          if (id === "\0fixture:@/lib/static-site") return `export const staticSite=false`;
          if (id === "\0fixture:@/lib/commerce")
            return `export async function getCommerceReadiness(){return {configured:true}};export function createPilotOrder({data}){return new Promise((resolve,reject)=>window.requests.push({key:data.idempotencyKey,resolve,reject}))}`;
        },
        configureServer(s) {
          s.middlewares.use((req, res, next) => {
            if (req.url === "/fixture") {
              res.setHeader("Content-Type", "text/html");
              res.end('<div id="root"></div><script type="module" src="/fixture.js"></script>');
            } else next();
          });
        },
      },
    ],
  });
  await server.listen();
  const address = server.httpServer!.address();
  if (!address || typeof address === "string") throw new Error("Missing fixture port");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ headless: true });
});
afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it.each([null, "B"])(
  "clears completed and late invoices after identity changes to %s",
  async (replacement) => {
    const page = await browser.newPage();
    try {
      page.on("pageerror", (error) => console.error(error));
      page.setDefaultTimeout(5000);
      await page.goto(`${origin}/fixture`);
      await page.getByRole("button", { name: "Request a Pilot invoice" }).click();
      await page.waitForFunction(() => window.requests.length === 1);
      await page.evaluate(() =>
        window.requests[0].resolve({ invoiceNumber: "A-PRIVATE", status: "pending" }),
      );
      await expect.poll(() => page.locator('[role="status"]').textContent()).toContain("A-PRIVATE");
      await page.evaluate((id) => window.identity(id), replacement);
      await expect.poll(() => page.locator('[role="status"]').count()).toBe(0);
      await page.evaluate(() => window.identity("A"));
      await page.getByRole("button", { name: "Request a Pilot invoice" }).click();
      await page.waitForFunction(() => window.requests.length === 2);
      await page.evaluate((id) => window.identity(id), replacement);
      await page.evaluate(() =>
        window.requests[1].resolve({ invoiceNumber: "A-LATE", status: "pending" }),
      );
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      await expect.poll(() => page.locator('[role="status"]').count()).toBe(0);
      expect(await page.locator("body").textContent()).not.toContain("A-LATE");
      if (replacement) {
        await page.getByRole("button", { name: "Request a Pilot invoice" }).click();
        await page.waitForFunction(() => window.requests.length === 3);
        await page.evaluate(() => window.requests[2].reject(new Error("retry")));
        await page.getByRole("alert").waitFor();
        await page.getByRole("button", { name: "Request a Pilot invoice" }).click();
        await page.waitForFunction(() => window.requests.length === 4);
        expect(await page.evaluate(() => window.requests[2].key === window.requests[3].key)).toBe(
          true,
        );
        expect(await page.evaluate(() => window.requests[1].key !== window.requests[2].key)).toBe(
          true,
        );
      }
    } finally {
      await page.close();
    }
  },
);
