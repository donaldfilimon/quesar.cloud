import { test, expect } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

for (const type of ["done", "error"] as const) {
  test(`real ${type} publication observes the committed registry, not the events HTTP mutex`, async () => {
    const home = await mkdtemp(path.join(tmpdir(), "quasar-publication-"));
    const template = path.join(home, "template");
    let child: ReturnType<typeof Bun.spawn> | undefined;
    const bounded = <T>(promise: Promise<T>): Promise<T> => {
      let timer: ReturnType<typeof setTimeout>;
      return Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Publication fixture deadline exceeded")), 8000); })]).finally(() => clearTimeout(timer!));
    };
    try {
      await mkdir(template);
      await writeFile(path.join(template, "marker.txt"), "fixture");
      const module = (name: string) => JSON.stringify(new URL(`./${name}.ts`, import.meta.url).pathname);
      const script = `
        import {createServer} from ${module("server")};
        import {PreviewManager} from ${module("preview")};
        import {JobEvents} from ${module("events")};
        import {readFileSync,existsSync} from 'node:fs';
        import {writeFile} from 'node:fs/promises';
        const home=${JSON.stringify(home)}, terminalType=${JSON.stringify(type)}, token='t'.repeat(43);
        const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
        const engineGate=deferred(), admitted=deferred(), lockGate=deferred(), locked=deferred(), reported=deferred(), published=deferred();
        const observations=[];
        const original=JobEvents.prototype.emit;
        // Test-only observation in this child: no module replacement, no fake
        // event buffer, no registry/emit production injection. Always forward.
        JobEvents.prototype.emit=function(event){
          let receipt;
          if(event.type==='done'||event.type==='error'){
            try {
              const site=JSON.parse(readFileSync(home+'/registry.json','utf8'))[0];
              receipt={type:event.type,status:site.status,outcome:site.job?.outcome,jobId:site.job?.id,finished:Boolean(site.job?.finishedAt),acceptedWrite:existsSync(home+'/sites/'+site.slug+'/accepted.txt')};
            } catch {receipt={observationFailed:true};}
            observations.push(receipt);
          }
          const result=original.call(this,event);
          if(receipt)published.resolve(receipt);
          return result;
        };
        let server, previewRequest;
        try {
          server=createServer({home,templateDir:${JSON.stringify(template)},preview:new PreviewManager(),scaffoldInstall:false,port:0,pairingToken:token,makeClient:()=>({}),
            allocatePreviewPort:async()=>{locked.resolve();await lockGate.promise;throw new Error('owned fixture releases preview reservation');},
            engine:async({onEvent,scope,siteDir})=>{admitted.resolve();await engineGate.promise;await scope.accept(()=>writeFile(siteDir+'/accepted.txt','accepted fixture write'));onEvent(terminalType==='done'?{type:'done'}:{type:'error',message:'synthetic engine failure'});reported.resolve();}
          });
          const origin='http://localhost:'+server.port, headers={authorization:'Bearer '+token};
          const created=await fetch(origin+'/api/sites',{method:'POST',headers,body:JSON.stringify({name:'Publication fixture',prompt:'test'})});
          const site=await created.json();
          await admitted.promise;
          previewRequest=fetch(origin+'/api/sites/'+site.id+'/preview/start',{method:'POST',headers});
          void previewRequest.catch(()=>{});
          await locked.promise;
          engineGate.resolve();
          await reported.promise;
          // Allow the job completion microtask to attempt finalization. A real
          // premature emit is observed here despite the held registry mutex.
          await new Promise(resolve=>setTimeout(resolve,30));
          const whileLocked={publications:observations.length,status:JSON.parse(readFileSync(home+'/registry.json','utf8'))[0].status};
          lockGate.resolve();
          const terminal=await published.promise;
          const previewStatus=(await previewRequest).status;
          const replay=await (await fetch(origin+'/api/sites/'+site.id+'/events',{headers})).json();
          console.log(JSON.stringify({createStatus:created.status,jobId:site.job.id,whileLocked,terminal,publications:observations.length,previewStatus,replay:replay.events.map(event=>event.type)}));
        } finally {
          engineGate.resolve();lockGate.resolve();
          if(previewRequest)await Promise.allSettled([previewRequest]);
          try {if(server)await server.shutdown();}
          finally {JobEvents.prototype.emit=original;}
        }
      `;
      child = Bun.spawn([process.execPath, "-e", script], { stdout: "pipe", stderr: "pipe" });
      const [output, diagnostic, exit] = await bounded(Promise.all([
        new Response(child.stdout as ReadableStream).text(),
        new Response(child.stderr as ReadableStream).text(),
        child.exited,
      ]));
      expect(exit).toBe(0);
      expect(diagnostic).toBe("");
      const receipt = JSON.parse(output);
      expect(receipt.createStatus).toBe(202);
      expect(receipt.whileLocked).toEqual({ publications: 0, status: "generating" });
      expect(receipt.terminal).toEqual({ type, status: type === "done" ? "idle" : "error", outcome: type, jobId: receipt.jobId, finished: true, acceptedWrite: true });
      expect(receipt.publications).toBe(1);
      expect(receipt.previewStatus).toBe(500);
      expect(receipt.replay).toEqual([type]);
    } finally {
      child?.kill("SIGKILL");
      try { if (child) await bounded(child.exited); }
      finally { await rm(home, { recursive: true, force: true }); }
    }
  }, 12_000);
}
