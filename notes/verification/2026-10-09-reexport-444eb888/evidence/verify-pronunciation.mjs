import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {filmCollection} from '/Users/donaldfilimon/dev/active/quesar.cloud/src/lib/mlai/categories/film-collection.ts';
import {PERSONAS} from '/Users/donaldfilimon/dev/active/quesar.cloud/src/cinematic/film/tokens.ts';
import {pronounce} from '/Users/donaldfilimon/dev/active/quesar.cloud/src/cinematic/film/pronunciation.ts';
const hash=s=>createHash('sha256').update(s).digest('hex');
const results=[];
for(const film of filmCollection){
 const timing=JSON.parse(await readFile(`public/media/films/${film.id}.timing.json`));
 for(const cue of timing.measurements){const persona=PERSONAS[cue.narrator];
 if(cue.textHash!==hash(cue.text)||cue.spokenHash!==hash(pronounce(cue.text))||cue.voice!==persona.voice||cue.speed!==persona.prosody.speed||Math.abs(cue.seconds-cue.samples/24000)>1e-9)throw Error(`Receipt drift ${cue.id}`);}
 results.push({id:film.id,cues:timing.measurements.length,textAndPronouncedHashesMatch:true,voicesAndSpeedsMatch:true});
}
await writeFile('notes/verification/2026-10-09-reexport-444eb888/evidence/pronunciation-receipts.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
