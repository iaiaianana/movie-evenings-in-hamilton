import {env} from 'cloudflare:workers';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
  try{const {results}=await env.DB!.prepare('SELECT id,title,film,author,substr(body,1,260) AS excerpt,created_at FROM articles ORDER BY created_at DESC LIMIT 200').all();return json({articles:results});}
  catch{return json({error:'Articles could not be loaded. Please try again.'},503);}
}
export async function POST(request:Request){
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Please publish from the club site.'},403);
  if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'Invalid submission.'},415);
  let value:any;try{const raw=await request.text();if(raw.length>400000)return json({error:'Article is too long.'},413);value=JSON.parse(raw);}catch{return json({error:'Invalid submission.'},400);}
  const read=(key:string)=>typeof value?.[key]==='string'?value[key].trim():'';
  const id=read('id'),title=read('title'),author=read('author'),film=read('film'),body=read('body');
  if(value?.website||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||!title||title.length>180||!author||author.length>80||film.length>160||!body||body.length>60000)return json({error:'Enter a title, your name, and an article of up to 60,000 characters.'},400);
  try{await env.DB!.prepare('INSERT INTO articles (id,title,film,author,body,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,title,film,author,body,new Date().toISOString()).run();return json({id,url:'/articles/'+id},201);}catch{return json({error:'Your article could not be saved. Your draft is still here; please try again.'},503);}
}
