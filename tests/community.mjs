import { readFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import ts from 'typescript';
const pkg=readdirSync('node_modules/.pnpm').find(n=>n.startsWith('miniflare@'));
const {Miniflare}=await import(pathToFileURL(`${process.cwd()}/node_modules/.pnpm/${pkg}/node_modules/miniflare/dist/src/index.js`));
const source=readFileSync('app/api/community/route.ts','utf8').replace("import { env } from 'cloudflare:workers';",'let env;').replaceAll('export ', '');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const script=compiled+`\nexport default {async fetch(request, bindings) {env=bindings;return request.method==='POST'?POST(request):GET()}};`;
const mf=new Miniflare({modules:true,script,compatibilityDate:'2026-05-15',d1Databases:{DB:'test-community'},cf:false});
try {
 const db=await mf.getD1Database('DB');const migration=readdirSync('drizzle').find(x=>x.endsWith('.sql'));await db.exec(readFileSync('drizzle/'+migration,'utf8').replace(/\n/g,' '));
 const post=async(value,origin='http://club.test')=>mf.dispatchFetch('http://club.test/api/community',{method:'POST',headers:{'Content-Type':'application/json','Origin':origin},body:JSON.stringify(value)});
 const review={id:crypto.randomUUID(),kind:'review',film:'Ida',name:'Guest <test>',body:'A thoughtful film <script>alert(1)</script>'};
 assert.equal((await post(review)).status,201);assert.equal((await post(review)).status,201);
 const suggestion={id:crypto.randomUUID(),kind:'suggestion',film:'A future film',name:'Guest',body:'For next week'};assert.equal((await post(suggestion)).status,201);
 assert.equal((await post({...review,id:crypto.randomUUID(),film:'Lost Highway'})).status,400);
 assert.equal((await post({...review,id:crypto.randomUUID(),name:''})).status,400);
 assert.equal((await post({...review,id:crypto.randomUUID(),body:'x'.repeat(2001)})).status,400);
 assert.equal((await post({...review,id:crypto.randomUUID()},'https://other.test')).status,403);
 const response=await mf.dispatchFetch('http://club.test/api/community');assert.equal(response.status,200);const data=await response.json();assert.equal(data.entries.length,2);assert(data.entries.some(x=>x.body===review.body));
 console.log('Passed: shared persistence, reviews, suggestions, retry deduplication, validation, and origin check.');
} finally {await mf.dispose()}
