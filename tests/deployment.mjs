import {readFileSync,readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const pkg=readdirSync('node_modules/.pnpm').find(n=>n.startsWith('miniflare@'));
const {Miniflare}=await import(pathToFileURL(`${process.cwd()}/node_modules/.pnpm/${pkg}/node_modules/miniflare/dist/src/index.js`));
const root=process.cwd()+'/dist/server';const paths=readdirSync(root,{recursive:true}).filter(x=>x.endsWith('.js')||x.endsWith('.mjs'));paths.sort((a,b)=>a==='index.js'?-1:b==='index.js'?1:0);const modules=paths.map(x=>({type:'ESModule',path:root+'/'+x}));
const mf=new Miniflare({modules,modulesRoot:root,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'test-deployment'},assets:{directory:process.cwd()+'/dist/client',binding:'ASSETS',routerConfig:{has_user_worker:true}},cf:false});
try{
const db=await mf.getD1Database('DB');for(const file of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())await db.exec(readFileSync('drizzle/'+file,'utf8').replace(/\n/g,' '));
let response=await mf.dispatchFetch('http://club.test/');assert.equal(response.status,200);const html=await response.text();assert(html.includes('👁Suggest a movie👁'));assert(html.includes('Lost Highway'));assert(html.includes('/api/community'));assert(!html.includes('copy it, and send'));
response=await mf.dispatchFetch('http://club.test/assets/lost-highway.jpg');assert.equal(response.status,200);
response=await mf.dispatchFetch('http://club.test/api/community',{method:'POST',headers:{'Content-Type':'application/json','Origin':'http://club.test'},body:JSON.stringify({id:crypto.randomUUID(),kind:'review',film:'Ida',name:'Runtime test',body:'Saved across requests'})});assert.equal(response.status,201,await response.text());
response=await mf.dispatchFetch('http://club.test/api/community');assert.equal(response.status,200);const data=await response.json();assert.equal(data.entries[0].body,'Saved across requests');console.log('Passed: built home page, asset routing, public POST, and persistent GET.');
response=await mf.dispatchFetch('http://club.test/articles');assert.equal(response.status,200);assert((await response.text()).includes('Publish article'));
const article={id:crypto.randomUUID(),title:'A long review <script>title</script>',film:'Ida',author:'A writer <img>',body:'# A heading\n\nA **bold** idea with *italics*.\n\n> A quotation\n\n<script>alert(1)</script>\n\n'+('Thoughts on cinema. '.repeat(400))};
const postArticle=async(value,origin='http://club.test')=>mf.dispatchFetch('http://club.test/api/articles',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(value)});
response=await postArticle(article);assert.equal(response.status,201,await response.text());assert.equal((await postArticle(article)).status,201);
response=await mf.dispatchFetch('http://club.test/api/articles');let listing=await response.json();assert.equal(listing.articles.length,1);assert.equal(listing.articles[0].id,article.id);assert.equal(listing.articles[0].excerpt.length,260);
response=await mf.dispatchFetch('http://club.test/articles/'+article.id);assert.equal(response.status,200);const reading=await response.text();assert(reading.includes('<strong>bold</strong>'));assert(reading.includes('<em>italics</em>'));assert(reading.includes('<h2>A heading</h2>'));assert(reading.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));assert(!reading.includes('<script>alert(1)</script>'));assert(reading.includes('&lt;img&gt;'));
assert.equal((await mf.dispatchFetch('http://club.test/articles/'+crypto.randomUUID())).status,404);
assert.equal((await postArticle({...article,id:crypto.randomUUID(),body:'x'.repeat(60001)})).status,400);
assert.equal((await postArticle({...article,id:crypto.randomUUID(),title:''})).status,400);
assert.equal((await postArticle({...article,id:crypto.randomUUID()},'https://other.test')).status,403);
console.log('Passed: long articles, list excerpts, shareable reading pages, formatting, HTML escaping, duplicate prevention, limits, and 404s.');
response=await mf.dispatchFetch('http://club.test/api/next-screening');assert.equal(response.status,200);let next=await response.json();assert.equal(next.film.title,'Persona');
const choose=async(film,origin='http://club.test')=>mf.dispatchFetch('http://club.test/api/next-screening',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({film})});
response=await choose('Cold War');assert.equal(response.status,200);next=await response.json();assert.equal(next.film.title,'Cold War');assert.equal(next.film.director,'Paweł Pawlikowski');
response=await mf.dispatchFetch('http://club.test/api/next-screening');assert.equal((await response.json()).film.title,'Cold War');
assert.equal((await choose('Ida')).status,400);assert.equal((await choose('A nonexistent title')).status,400);assert.equal((await choose('Blue Velvet','https://other.test')).status,403);
response=await mf.dispatchFetch('http://club.test/');let screeningHtml=await response.text();assert(screeningHtml.includes('screening-pair'));assert(screeningHtml.includes('id="next-title">Persona'));assert(screeningHtml.includes('Set as next'));
console.log('Passed: default Persona, shared next-screening updates, persistence, title eligibility, and two-cover markup.');

}finally{await mf.dispose()}
