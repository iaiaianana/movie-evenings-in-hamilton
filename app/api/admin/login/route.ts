import {env} from 'cloudflare:workers';
import {admins,credentials,digest,passwordHash,constantEqual,sameOrigin,sessionCookie,json,readJson,hex} from '../../../../lib/admin-auth';
export async function POST(request:Request){
  if(!sameOrigin(request))return json({error:'Use the admin login page.'},403);
  let value:any;try{value=await readJson(request,2000)}catch{return json({error:'Invalid login request.'},400)}
  let config;try{config=credentials()}catch{return json({error:'Admin accounts are not configured yet. Run the private account setup.'},503)}
  const username=typeof value?.username==='string'?value.username.trim():'',password=typeof value?.password==='string'?value.password:'';
  if(password.length>256||!password)return json({error:'Invalid username or password.'},401);
  const secretKey=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.ADMIN_CREDENTIALS),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const ip=request.headers.get('cf-connecting-ip')||'local';const ipKey=hex(await crypto.subtle.sign('HMAC',secretKey,new TextEncoder().encode(ip)));
  const now=Date.now(),expires=now+15*60*1000;
  const keys=['ip:'+ipKey,'name:'+username.slice(0,80)];
  for(const key of keys){await env.DB!.prepare('INSERT INTO login_attempts (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END,expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END').bind(key,expires,now,now).run();const rate=await env.DB!.prepare('SELECT count FROM login_attempts WHERE key=?').bind(key).first<{count:number}>();if((rate?.count||0)>20)return json({error:'Too many login attempts. Try again in 15 minutes.'},429,{'Retry-After':'900'});}
  const selected=config[username]||config.admin_ianina;const computed=await passwordHash(password,selected.salt);
  if(!admins.includes(username)||!constantEqual(computed,selected.hash))return json({error:'Invalid username or password.'},401);
  const token=hex(crypto.getRandomValues(new Uint8Array(32)));const duration=8*60*60;
  await env.DB!.batch([env.DB!.prepare('DELETE FROM admin_sessions WHERE expires_at<=?').bind(new Date().toISOString()),env.DB!.prepare('DELETE FROM login_attempts WHERE expires_at<=?').bind(now),env.DB!.prepare('INSERT INTO admin_sessions (token_hash,username,expires_at,credential_version) VALUES (?,?,?,?)').bind(await digest(token),username,new Date(now+duration*1000).toISOString(),await digest(JSON.stringify(selected)))]);
  return json({username},200,{'Set-Cookie':sessionCookie(request,token,duration)});
}
