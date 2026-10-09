import { test, expect } from "bun:test";
import { JobScope } from "./job";
import { ownHome } from "./ownership";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

test("cancel fences admission and drain retains accepted operations", async () => {
  const scope = new JobScope();
  let release!: () => void;
  const operation = scope.accept(() => new Promise<void>(resolve => { release = resolve; }));
  scope.cancel("cancelled");
  await expect(scope.accept(async () => {})).rejects.toBe("cancelled");
  let drained = false;
  const drain = scope.drain().then(() => { drained = true; });
  await Promise.resolve();
  expect(drained).toBe(false);
  release();
  await operation;
  await drain;
  expect(drained).toBe(true);
});

test("kernel reservation refuses same-home second owner and releases", async () => {
  const home = await mkdtemp(path.join(tmpdir(), "quasar-owner-"));
  const release = ownHome(home);
  try { expect(() => ownHome(home)).toThrow("ownership unavailable"); }
  finally { release(); }
  ownHome(home)();
  await rm(home, { recursive: true });
});

test("home ownership excludes a separate process and recovers after crash", async () => {
  const home = await mkdtemp(path.join(tmpdir(), "quasar-cross-process-"));
  const module = new URL("./ownership.ts", import.meta.url).pathname;
  const child = Bun.spawn([process.execPath, "-e", `import {ownHome} from ${JSON.stringify(module)};ownHome(${JSON.stringify(home)});console.log('ready');setInterval(()=>{},1000);`], { stdout: "pipe", stderr: "ignore" });
  try {
    const reader = child.stdout.getReader();
    const first = await reader.read();
    expect(new TextDecoder().decode(first.value)).toContain("ready");
    expect(() => ownHome(home)).toThrow("ownership unavailable");
    child.kill("SIGKILL");
    await child.exited;
    reader.releaseLock();
    ownHome(home)();
  } finally {
    child.kill();
    await child.exited;
    await rm(home, { recursive: true });
  }
});

test("process crash during generation recovers interrupted durable state and permits retry", async () => {
  const { mkdir, writeFile, readFile } = await import("node:fs/promises");
  const { createServer } = await import("./server");
  const { PreviewManager } = await import("./preview");
  const home = await mkdtemp(path.join(tmpdir(), "quasar-crash-job-"));
  const template = path.join(home, "template");
  await mkdir(template);
  await writeFile(path.join(template, "marker.txt"), "fixture");
  const module = new URL("./server.ts", import.meta.url).pathname;
  const previewModule = new URL("./preview.ts", import.meta.url).pathname;
  const token = "t".repeat(43);
  const child = Bun.spawn([process.execPath, "-e", `import {createServer} from ${JSON.stringify(module)};import {PreviewManager} from ${JSON.stringify(previewModule)};const server=createServer({home:${JSON.stringify(home)},templateDir:${JSON.stringify(template)},preview:new PreviewManager(),scaffoldInstall:false,port:0,pairingToken:${JSON.stringify(token)},makeClient:()=>({}),engine:async()=>{console.log('generating');await new Promise(()=>{});}});await fetch('http://localhost:'+server.port+'/api/sites',{method:'POST',headers:{authorization:'Bearer '+${JSON.stringify(token)}},body:JSON.stringify({name:'Crash job',prompt:'test'})});`], { stdout: "pipe", stderr: "ignore" });
  let server: ReturnType<typeof createServer> | undefined;
  const reader = child.stdout.getReader();
  try {
    expect(new TextDecoder().decode((await reader.read()).value)).toContain("generating");
    child.kill("SIGKILL");
    await child.exited;
    const original = JSON.parse(await readFile(path.join(home, "registry.json"), "utf8"))[0];
    expect(original.status).toBe("generating");
    server = createServer({ home, templateDir: template, preview: new PreviewManager(), scaffoldInstall: false, port: 0, pairingToken: token, makeClient: () => ({} as never), engine: async ({ onEvent }) => onEvent({ type: "done" }) });
    const origin = `http://localhost:${server.port}`;
    await fetch(`${origin}/health`);
    const recovered = JSON.parse(await readFile(path.join(home, "registry.json"), "utf8"))[0];
    expect(recovered.job.outcome).toBe("interrupted");
    expect(recovered.job.id).toBe(original.job.id);
    const response = await fetch(`${origin}/api/sites/${original.id}/edit`, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: JSON.stringify({ prompt: "retry" }) });
    expect(response.status).toBe(202);
    expect((await response.json()).job.id).not.toBe(original.job.id);
  } finally {
    child.kill();
    await child.exited;
    reader.releaseLock();
    try { await server?.shutdown(); }
    finally { await rm(home, { recursive: true, force: true }); }
  }
});

test("terminal persistence permission failure publishes no done, retains ownership, and recovers after restart", async () => {
  const { mkdir, writeFile, readFile, chmod } = await import("node:fs/promises");
  const { createServer } = await import("./server");
  const { PreviewManager } = await import("./preview");
  const home = await mkdtemp(path.join(tmpdir(), "quasar-terminal-fault-"));
  const template = path.join(home, "template");
  const token = "t".repeat(43);
  let child: ReturnType<typeof Bun.spawn> | undefined;
  let retry: ReturnType<typeof createServer> | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const bounded = <T>(promise: Promise<T>, label: string): Promise<T> => {
    let timer: ReturnType<typeof setTimeout>;
    return Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`Timeout: ${label}`)), 4000); })]).finally(() => clearTimeout(timer!));
  };
  try {
    await mkdir(template);
    await writeFile(path.join(template, "marker.txt"), "fixture");
    const serverModule = new URL("./server.ts", import.meta.url).pathname;
    const previewModule = new URL("./preview.ts", import.meta.url).pathname;
    const ownershipModule = new URL("./ownership.ts", import.meta.url).pathname;
    const script = `
      import {createServer} from ${JSON.stringify(serverModule)};
      import {PreviewManager} from ${JSON.stringify(previewModule)};
      import {ownHome} from ${JSON.stringify(ownershipModule)};
      import {chmod,readFile} from 'node:fs/promises';
      const home=${JSON.stringify(home)}, token=${JSON.stringify(token)};
      let release, admitted, failed;
      const held=new Promise(resolve=>release=resolve), entered=new Promise(resolve=>admitted=resolve), failure=new Promise(resolve=>failed=resolve);
      const originalError=console.error;
      console.error=(message)=>{originalError(message);if(message==='quasar: terminal persistence failed; site remains fenced until restart')failed();};
      let server;
      try {
        server=createServer({home,templateDir:${JSON.stringify(template)},preview:new PreviewManager(),scaffoldInstall:false,port:0,pairingToken:token,makeClient:()=>({}),engine:async({onEvent})=>{admitted();await held;onEvent({type:'done'});}});
        const origin='http://localhost:'+server.port, headers={authorization:'Bearer '+token};
        const site=await (await fetch(origin+'/api/sites',{method:'POST',headers,body:JSON.stringify({name:'Durability fault',prompt:'test'})})).json();
        await entered;
        await chmod(home,0o500);
        release();
        await Promise.race([failure,new Promise((_,reject)=>setTimeout(()=>reject(new Error('missing persistence diagnostic')),3000))]);
        const persisted=JSON.parse(await readFile(home+'/registry.json','utf8'))[0];
        const events=await (await fetch(origin+'/api/sites/'+site.id+'/events', {headers})).json();
        const edit=await fetch(origin+'/api/sites/'+site.id+'/edit',{method:'POST',headers,body:JSON.stringify({prompt:'retry'})});
        await chmod(home,0o700);
        let shutdownRejected=false;try{await server.shutdown();}catch{shutdownRejected=true;}
        let ownershipRetained=false;try{ownHome(home)();}catch{ownershipRetained=true;}
        console.log(JSON.stringify({persisted,events,editStatus:edit.status,shutdownRejected,ownershipRetained}));
        setInterval(()=>{},1000);
      } catch(error) { console.error('fixture failed'); process.exitCode=1; }
      finally {release();await chmod(home,0o700);}
    `;
    child = Bun.spawn([process.execPath, "-e", script], { stdout: "pipe", stderr: "pipe" });
    reader = (child.stdout as ReadableStream<Uint8Array>).getReader();
    const first = await bounded(reader.read(), "child fault receipt");
    const receipt = JSON.parse(new TextDecoder().decode(first.value));
    expect(receipt.persisted.status).toBe("generating");
    expect(receipt.events.events.some((event: { type: string }) => event.type === "done")).toBe(false);
    expect(receipt.editStatus).toBe(409);
    expect(receipt.shutdownRejected).toBe(true);
    expect(receipt.ownershipRetained).toBe(true);
    child.kill("SIGKILL");
    await bounded(child.exited, "fault child exit");
    const diagnostic = await bounded(new Response(child.stderr as ReadableStream).text(), "failure diagnostic");
    expect(diagnostic.trim()).toBe("quasar: terminal persistence failed; site remains fenced until restart");
    retry = createServer({ home, templateDir: template, preview: new PreviewManager(), scaffoldInstall: false, port: 0, pairingToken: token, makeClient: () => ({} as never), engine: async ({ onEvent }) => onEvent({ type: "done" }) });
    const origin = `http://localhost:${retry.port}`;
    await bounded(fetch(`${origin}/health`), "restart recovery");
    const recovered = JSON.parse(await readFile(path.join(home, "registry.json"), "utf8"))[0];
    expect(recovered.job.outcome).toBe("interrupted");
    const response = await bounded(fetch(`${origin}/api/sites/${recovered.id}/edit`, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: JSON.stringify({ prompt: "retry" }) }), "retry admission");
    expect(response.status).toBe(202);
    expect((await response.json()).job.id).not.toBe(receipt.persisted.job.id);
  } finally {
    try { await chmod(home, 0o700); }
    finally {
      child?.kill("SIGKILL");
      try { if (child) await bounded(child.exited, "cleanup child exit"); }
      finally {
        reader?.releaseLock();
        try { if (retry) await bounded(retry.shutdown(), "retry shutdown"); }
        finally { await rm(home, { recursive: true, force: true }); }
      }
    }
  }
}, 15_000);
