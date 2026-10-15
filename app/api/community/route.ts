import { env } from 'cloudflare:workers';
export const dynamic = 'force-dynamic';
import {programme} from '../../../lib/club-data';
const json = (data: unknown, status = 200) => Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET() {
  try {
    const {results} = await env.DB!.prepare('SELECT id, kind, film, name, body, created_at FROM contributions WHERE status=\'published\' ORDER BY created_at DESC LIMIT 1000').all();
    return json({entries:results});
  } catch { return json({error:'Unable to load posts right now. Please try again.'},503); }
}
export async function POST(request: Request) {
  const origin=request.headers.get('origin');
  if(origin && origin !== new URL(request.url).origin) return json({error:'Please post from the cinema club page.'},403);
  if(!request.headers.get('content-type')?.includes('application/json')) return json({error:'Invalid submission.'},415);
  let value: any;
  try { const raw=await request.text();if(raw.length>6000)return json({error:'Submission is too long.'},413);value=JSON.parse(raw); } catch {return json({error:'Invalid submission.'},400);}
  const kind=value?.kind, film=typeof value?.film==='string'?value.film.trim():'', name=typeof value?.name==='string'?value.name.trim():'', body=typeof value?.body==='string'?value.body.trim():'', id=value?.id;
  const data=await programme();const watched=new Set(data.films.filter(f=>f.watched).map(f=>f.title));
  if(value?.website || !['review','suggestion'].includes(kind) || typeof id!=='string' || !/^[0-9a-f-]{36}$/i.test(id) || !name || name.length>80 || !film || film.length>160 || body.length>2000 || (kind==='review' && (!watched.has(film)||!body))) return json({error:'Please enter your name and a valid title or review.'},400);
  try {
    await env.DB!.prepare('INSERT INTO contributions (id,kind,film,name,body,created_at,status) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,kind,film,name,body,new Date().toISOString(),kind==='review'?'pending':'published').run();
    return json({ok:true},201);
  } catch { return json({error:'Your post could not be saved. Please try again.'},503); }
}
