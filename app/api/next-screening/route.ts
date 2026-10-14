import {env} from 'cloudflare:workers';
import {unwatched} from '../../../lib/programme';
export const dynamic='force-dynamic';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
  try{const selected=await env.DB!.prepare('SELECT film FROM screening_selection WHERE key=?').bind('next').first<{film:string}>();return json({film:unwatched.find(f=>f.title===selected?.film)||unwatched.find(f=>f.title==='Persona')});}catch{return json({error:'Unable to load the next screening. Please refresh to try again.'},503);}
}
export async function POST(request:Request){
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Please choose from the cinema club page.'},403);
  if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'Invalid selection.'},415);
  let value:any;try{const raw=await request.text();if(raw.length>1000)return json({error:'Invalid selection.'},413);value=JSON.parse(raw);}catch{return json({error:'Invalid selection.'},400);}
  const film=unwatched.find(f=>f.title===value?.film);if(!film)return json({error:'Choose an unwatched title from the programme.'},400);
  try{await env.DB!.prepare('INSERT INTO screening_selection (key,film,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET film=excluded.film,updated_at=excluded.updated_at').bind('next',film.title,new Date().toISOString()).run();return json({film});}catch{return json({error:'The next screening could not be saved. Please try again.'},503);}
}
