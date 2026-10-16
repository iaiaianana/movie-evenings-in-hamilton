import {readFileSync,readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import {pbkdf2Sync,randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const pkg=readdirSync('node_modules/.pnpm').find(n=>n.startsWith('miniflare@'));
const {Miniflare}=await import(pathToFileURL(`${process.cwd()}/node_modules/.pnpm/${pkg}/node_modules/miniflare/dist/src/index.js`));
const passwords={admin_ianina:'test-only-ianina-passphrase',admin_sonya:'test-only-sonya-passphrase'},credentials={};
for(const [username,password]of Object.entries(passwords)){const salt=randomBytes(16).toString('hex');credentials[username]={salt,hash:pbkdf2Sync(password,Buffer.from(salt,'hex'),100000,32,'sha256').toString('hex')}}
const root=process.cwd()+'/dist/server',paths=readdirSync(root,{recursive:true}).filter(x=>x.endsWith('.js')||x.endsWith('.mjs'));paths.sort((a,b)=>a==='index.js'?-1:b==='index.js'?1:0);
const modules=paths.map(path=>({type:'ESModule',path:root+'/'+path}));
const mf=new Miniflare({modules,modulesRoot:root,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'isolated-admin-test'},bindings:{ADMIN_CREDENTIALS:JSON.stringify(credentials)},assets:{directory:process.cwd()+'/dist/client',binding:'ASSETS',routerConfig:{has_user_worker:true}},cf:false});
const origin='https://club.test';
const call=(path,data,cookie,extra={})=>mf.dispatchFetch(origin+path,{...(data?{method:'POST',body:JSON.stringify(data)}:{}),headers:{...(data?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{Cookie:cookie}:{}),...extra}});
const get=async(path,cookie)=>{const r=await call(path,null,cookie);assert.equal(r.status,200,await r.clone().text());return r.json()};
try{
 const db=await mf.getD1Database('DB');
 const migrations=readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort();
 for(const file of migrations){if(file.startsWith('0003')){await db.prepare('INSERT INTO contributions (id,kind,film,name,body,created_at) VALUES (?,?,?,?,?,?)').bind('legacy-existing','review','Ida','Original guest','Existing published review','2026-10-01T00:00:00Z').run();}for(const statement of readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint'))if(statement.trim())await db.exec(statement.replace(/\n/g,' '));}
 assert((await get('/api/community')).entries.some(p=>p.id==='legacy-existing'));
 assert.equal((await call('/api/admin/state')).status,401);assert.equal((await call('/api/admin/state',null,'club_admin='+'a'.repeat(64))).status,401);
 assert.equal((await call('/api/admin/action',{action:'initialize'})).status,401);
 assert.equal((await call('/api/admin/login',{username:'admin_ianina',password:'wrong'})).status,401);
 assert.equal((await call('/api/admin/login',{username:'admin_ianina',password:passwords.admin_ianina},null,{Origin:'https://evil.test'})).status,403);
 const cookies={};for(const username of Object.keys(passwords)){const r=await call('/api/admin/login',{username,password:passwords[username]});assert.equal(r.status,200,await r.clone().text());const header=r.headers.get('Set-Cookie');assert(header.includes('HttpOnly'));assert(header.includes('SameSite=Strict'));assert(header.includes('Secure'));cookies[username]=header.split(';')[0];assert.equal((await get('/api/admin/state',cookies[username])).username,username)}
 const cookie=cookies.admin_ianina;let sonya=cookies.admin_sonya;
 assert.equal((await call('/api/admin/export')).status,401);
 assert.equal((await call('/api/admin/action',{action:'initialize'},cookie,{Origin:'https://evil.test'})).status,403);
 let r=await call('/api/admin/action',{action:'initialize'},cookie);assert.equal(r.status,200,await r.clone().text());
 let data=await get('/api/programme');assert.equal(data.films.filter(f=>f.kind==='film'&&f.watched).length,5);assert.equal(data.screenings.length,5);assert.equal(data.films.filter(f=>f.kind==='film'&&!f.watched).length,18);
 assert.equal((await get('/api/next-screening')).film.title,'Persona');
 const review={id:crypto.randomUUID(),kind:'review',film:'Ida',name:'Guest <test>',body:'An <script>unsafe</script> thought',status:'published'};
 r=await call('/api/community',review);assert.equal(r.status,201);assert.equal((await call('/api/community',review)).status,201);assert(!(await get('/api/community')).entries.some(p=>p.id===review.id));
 assert.equal((await call('/api/community',{...review,id:crypto.randomUUID(),film:'Lost Highway'})).status,400);
 assert.equal((await call('/api/admin/action',{action:'moderate',type:'contribution',id:review.id,status:'published'},sonya)).status,200);assert((await get('/api/community')).entries.some(p=>p.id===review.id));
 const article={id:crypto.randomUUID(),title:'An article <script>title</script>',author:'A writer <img>',film:'Ida',body:'# Heading\n\nA **bold** idea and *italics*.\n\n> Quote\n\n<script>alert(1)</script>\n\n'+'Many thoughts. '.repeat(500)};
 assert.equal((await call('/api/articles',article)).status,201);assert.equal((await call('/api/articles',article)).status,201);assert.equal((await get('/api/articles')).articles.length,0);assert.equal((await call('/articles/'+article.id)).status,404);
 assert.equal((await call('/api/admin/action',{action:'moderate',type:'article',id:article.id,status:'published'},cookie)).status,200);
 r=await call('/articles/'+article.id);assert.equal(r.status,200);let html=await r.text();assert(html.includes('<strong>bold</strong>'));assert(html.includes('<em>italics</em>'));assert(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));assert(!html.includes('<script>alert(1)</script>'));assert(html.includes('&lt;img&gt;'));assert.equal((await get('/api/articles')).articles.length,1);
 assert.equal((await call('/api/articles',{...article,id:crypto.randomUUID(),body:'x'.repeat(60001)})).status,400);
 assert.equal((await call('/api/admin/action',{action:'moderate',type:'article',id:article.id,status:'rejected'},sonya)).status,200);assert.equal((await call('/articles/'+article.id)).status,404);
 assert.equal((await call('/api/admin/action',{action:'edit-post',type:'article',id:article.id,name:'Edited author',title:'Edited article',film:'Ida',body:'Edited article body',status:'published'},sonya)).status,200);assert((await get('/api/articles')).articles.some(a=>a.title==='Edited article'));
 const suggestion={id:crypto.randomUUID(),kind:'suggestion',film:'Suggestion',name:'Guest',body:'For later'};assert.equal((await call('/api/community',suggestion)).status,201);assert((await get('/api/community')).entries.some(p=>p.id===suggestion.id));assert.equal((await call('/api/admin/action',{action:'delete-post',type:'contribution',id:suggestion.id},cookie)).status,200);assert(!(await get('/api/community')).entries.some(p=>p.id===suggestion.id));
 const film={action:'save-film',title:'New <script>film</script>',year:'2000',director:'New director',kind:'film',category:'director',note:'An evening',image:'assets/persona.jpg'};
 r=await call('/api/admin/action',film,cookie);assert.equal(r.status,200,await r.clone().text());const newId=(await r.json()).id;data=await get('/api/programme');assert(data.films.some(f=>f.id===newId));
 assert.equal((await call('/api/admin/action',{...film,id:newId,image:'javascript:alert(1)'},cookie)).status,400);
 r=await call('/');assert.equal(r.status,200);html=await r.text();assert(html.includes('cinema-emblem-green.webp'));assert(html.includes('/emblem.js'));assert(!html.includes('New <script>film</script>'));assert(html.includes('\\u003cscript'));const embedded=html.match(/const initialProgramme=(.*?);\n/s)[1];const decoded=vm.runInNewContext('('+embedded+')');assert(decoded.films.some(f=>f.title===film.title));
 assert.equal((await call('/api/next-screening',{film:film.title})).status,200);assert.equal((await get('/api/next-screening')).film.id,newId);
 assert.equal((await call('/api/admin/action',{action:'archive-film',id:newId,archived:true},sonya)).status,200);assert.equal((await call('/api/next-screening',{film:film.title})).status,400);
 assert.equal((await call('/api/next-screening',{film:'Persona'})).status,200);
 assert.equal((await call('/api/admin/action',{action:'save-screening',filmId:'persona',date:'2026-02-30'},cookie)).status,400);
 r=await call('/api/admin/action',{action:'save-screening',filmId:'persona',date:'2026-10-16'},cookie);assert.equal(r.status,200,await r.clone().text());data=await get('/api/programme');assert.equal(data.films.find(f=>f.id==='persona').watched,1);assert.equal(data.screenings.length,6);assert.equal((await get('/api/next-screening')).film,null);assert.equal((await call('/api/next-screening',{film:'Persona'})).status,400);
 assert.equal((await call('/api/next-screening',{film:'Blue Velvet'})).status,200);
 const screening=data.screenings.find(s=>s.film_id==='persona');assert.equal((await call('/api/admin/action',{action:'delete-screening',id:screening.id},sonya)).status,200);assert.equal((await get('/api/programme')).films.find(f=>f.id==='persona').watched,0);
 assert.equal((await call('/api/admin/action',{action:'save-film',id:'ida',title:'Ida (edited)',year:'2013',director:'Paweł Pawlikowski',category:'director',kind:'film',note:'',image:'assets/ida.jpg'},cookie)).status,200);assert((await get('/api/community')).entries.some(p=>p.id===review.id&&p.film==='Ida (edited)'));
 assert.equal((await call('/api/admin/action',{action:'delete-post',type:'article',id:article.id},cookie)).status,200);assert.equal((await get('/api/articles')).articles.length,0);
 const backupResponse=await call('/api/admin/export',null,cookie);assert.equal(backupResponse.status,200);const backup=await backupResponse.json();assert(backup.films.length>0);assert(!backup.admin_sessions);assert(!backup.ADMIN_CREDENTIALS);
 await db.prepare('UPDATE admin_sessions SET expires_at=? WHERE username=?').bind('2000-01-01T00:00:00Z','admin_sonya').run();assert.equal((await call('/api/admin/state',null,sonya)).status,401);const refreshed=await call('/api/admin/login',{username:'admin_sonya',password:passwords.admin_sonya});assert.equal(refreshed.status,200);sonya=refreshed.headers.get('Set-Cookie').split(';')[0];
 assert.equal((await call('/api/admin/logout',{},cookie)).status,200);assert.equal((await call('/api/admin/state',null,cookie)).status,401);
 // Credential rotation revokes existing sessions.
 credentials.admin_sonya.hash='0'.repeat(64);await mf.setOptions({modules,modulesRoot:root,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'isolated-admin-test'},bindings:{ADMIN_CREDENTIALS:JSON.stringify(credentials)},assets:{directory:process.cwd()+'/dist/client',binding:'ASSETS',routerConfig:{has_user_worker:true}},cf:false});assert.equal((await call('/api/admin/state',null,sonya)).status,401);
 for(let i=0;i<21;i++)r=await call('/api/admin/login',{username:'admin_ianina',password:'incorrect'},null,{'CF-Connecting-IP':'198.51.100.2'});assert.equal(r.status,429);
 console.log('Passed: both admins, secure cookies, access controls, CSRF checks, rate limits, session revocation, legacy data, moderation, article safety, suggestion deletion, programme editing, screening management, and public next-film selection.');
}finally{await mf.dispose()}
