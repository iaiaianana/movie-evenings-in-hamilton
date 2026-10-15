import {env} from 'cloudflare:workers';
const encode=new TextEncoder();
export const admins=['admin_ianina','admin_sonya'];
export function credentials():Record<string,{salt:string;hash:string}>{
  try{const value=JSON.parse(env.ADMIN_CREDENTIALS||'{}');if(!admins.every(name=>/^[a-f0-9]{32}$/.test(value[name]?.salt)&&/^[a-f0-9]{64}$/.test(value[name]?.hash)))throw Error();return value;}catch{throw new Error('Admin accounts have not been configured.');}
}
export function hex(bytes:ArrayBuffer|Uint8Array){return Array.from(new Uint8Array(bytes instanceof Uint8Array?bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength):bytes)).map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function digest(value:string){return hex(await crypto.subtle.digest('SHA-256',encode.encode(value)));}
export async function passwordHash(password:string,salt:string){const key=await crypto.subtle.importKey('raw',encode.encode(password),'PBKDF2',false,['deriveBits']);const bytes=Uint8Array.from(salt.match(/../g)!.map(x=>parseInt(x,16)));return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:bytes,iterations:100000},key,256));}
export function constantEqual(a:string,b:string){let difference=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)difference|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return difference===0;}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');return origin===new URL(request.url).origin;}
export function sessionCookie(request:Request,token:string,maxAge:number){return 'club_admin='+token+'; HttpOnly; SameSite=Strict; Path=/; Max-Age='+maxAge+(new URL(request.url).protocol==='https:'?'; Secure':'');}
export async function currentAdmin(request:Request){
  const token=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('club_admin='))?.slice(11);if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
  const session=await env.DB!.prepare('SELECT username,expires_at,credential_version FROM admin_sessions WHERE token_hash=?').bind(await digest(token)).first<{username:string;expires_at:string;credential_version:string}>();
  if(!session||session.expires_at<=new Date().toISOString()||!admins.includes(session.username))return null;
  let config;try{config=credentials()}catch{return null;}
  return constantEqual(session.credential_version,await digest(JSON.stringify(config[session.username])))?session.username:null;
}
export function json(value:unknown,status=200,headers:Record<string,string>={}){return Response.json(value,{status,headers:{'Cache-Control':'no-store',...headers}});}
export async function readJson(request:Request,max=400000){if(!request.headers.get('content-type')?.includes('application/json'))throw Error('Use JSON.');const text=await request.text();if(text.length>max)throw Error('Submission is too long.');return JSON.parse(text);}
