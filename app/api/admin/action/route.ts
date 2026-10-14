import {env} from 'cloudflare:workers';
import {currentAdmin,sameOrigin,json,readJson} from '../../../../lib/admin-auth';
import {initializeProgramme,validImage,validDate} from '../../../../lib/club-data';
const text=(v:unknown,max:number,required=false)=>{if(typeof v!=='string'||v.trim().length>max||(required&&!v.trim()))throw Error('Invalid or missing field.');return v.trim()};
export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:'Invalid origin.'},403);
 if(!await currentAdmin(request))return json({error:'Please sign in.'},401);
 try{
 const value=await readJson(request),action=value?.action;
 if(action==='initialize'){await initializeProgramme();return json({ok:true});}
 if(['moderate','edit-post','delete-post'].includes(action)){
  const table=value.type==='article'?'articles':value.type==='contribution'?'contributions':null;if(!table)throw Error('Invalid content type.');const id=text(value.id,100,true);
  const existing=await env.DB!.prepare('SELECT * FROM '+table+' WHERE id=?').bind(id).first();if(!existing)return json({error:'This submission no longer exists.'},404);
  if(action==='delete-post'){await env.DB!.prepare('DELETE FROM '+table+' WHERE id=?').bind(id).run();return json({ok:true});}
  if(!['pending','published','rejected'].includes(value.status))throw Error('Invalid publication status.');
  if(action==='moderate'){await env.DB!.prepare('UPDATE '+table+' SET status=? WHERE id=?').bind(value.status,id).run();return json({ok:true});}
  const name=text(value.name,80,true),body=text(value.body,table==='articles'?60000:2000,table==='articles'||existing.kind==='review'),film=text(value.film,160,table==='contributions');
  if(table==='articles'){const title=text(value.title,180,true);await env.DB!.prepare('UPDATE articles SET author=?,body=?,film=?,title=?,status=? WHERE id=?').bind(name,body,film,title,value.status,id).run();}
  else await env.DB!.prepare('UPDATE contributions SET name=?,body=?,film=?,status=? WHERE id=?').bind(name,body,film,value.status,id).run();return json({ok:true});
 }
 if(['save-film','archive-film','save-screening','delete-screening'].includes(action)){const count=await env.DB!.prepare('SELECT COUNT(*) AS n FROM films').first<{n:number}>();if(!count?.n)throw Error('Initialize the programme first.');}
 if(action==='save-film'){
  const id=value.id?text(value.id,100,true):crypto.randomUUID(),title=text(value.title,160,true),year=text(value.year,20,true),director=text(value.director,160,true),note=text(value.note||'',2000),image=text(value.image||'',2000);
  if(!['film','series'].includes(value.kind)||!['director','nz'].includes(value.category)||!validImage(image))throw Error('Choose a valid kind, section, and image URL.');
  const existing=await env.DB!.prepare('SELECT title FROM films WHERE id=?').bind(id).first<{title:string}>();
  const statements=[env.DB!.prepare('INSERT INTO films (id,title,year,director,category,kind,note,image,watched,archived) VALUES (?,?,?,?,?,?,?,?,0,0) ON CONFLICT(id) DO UPDATE SET title=excluded.title,year=excluded.year,director=excluded.director,category=excluded.category,kind=excluded.kind,note=excluded.note,image=excluded.image').bind(id,title,year,director,value.category,value.kind,note,image)];
  if(existing&&existing.title!==title){statements.push(env.DB!.prepare('UPDATE contributions SET film=? WHERE film=?').bind(title,existing.title),env.DB!.prepare('UPDATE articles SET film=? WHERE film=?').bind(title,existing.title),env.DB!.prepare('UPDATE screening_selection SET film=? WHERE film=?').bind(title,existing.title));}
  await env.DB!.batch(statements);return json({ok:true,id});
 }
 if(action==='archive-film'){
  const id=text(value.id,100,true);await env.DB!.prepare('UPDATE films SET archived=? WHERE id=?').bind(value.archived===false?0:1,id).run();return json({ok:true});
 }
 if(action==='save-screening'){
  const filmId=text(value.filmId,100,true),date=text(value.date,10,true),id=value.id?text(value.id,100,true):crypto.randomUUID();if(!validDate(date))throw Error('Use a valid screening date.');
  const film=await env.DB!.prepare('SELECT title FROM films WHERE id=?').bind(filmId).first<{title:string}>();if(!film)throw Error('Select a film in the programme.');
  const old=await env.DB!.prepare('SELECT film_id FROM screenings WHERE id=?').bind(id).first<{film_id:string}>();
  const statements=[env.DB!.prepare('INSERT INTO screenings (id,film_id,date) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET film_id=excluded.film_id,date=excluded.date').bind(id,filmId,date),env.DB!.prepare('UPDATE films SET watched=1 WHERE id=?').bind(filmId),env.DB!.prepare('DELETE FROM screening_selection WHERE key=? AND film IN (?,?)').bind('next',filmId,film.title)];
  if(old&&old.film_id!==filmId)statements.push(env.DB!.prepare('UPDATE films SET watched=CASE WHEN EXISTS(SELECT 1 FROM screenings WHERE film_id=?) THEN 1 ELSE 0 END WHERE id=?').bind(old.film_id,old.film_id));
  await env.DB!.batch(statements);return json({ok:true});
 }
 if(action==='delete-screening'){
  const id=text(value.id,100,true),old=await env.DB!.prepare('SELECT film_id FROM screenings WHERE id=?').bind(id).first<{film_id:string}>();if(!old)return json({error:'Screening not found.'},404);
  await env.DB!.batch([env.DB!.prepare('DELETE FROM screenings WHERE id=?').bind(id),env.DB!.prepare('UPDATE films SET watched=CASE WHEN EXISTS(SELECT 1 FROM screenings WHERE film_id=?) THEN 1 ELSE 0 END WHERE id=?').bind(old.film_id,old.film_id)]);return json({ok:true});
 }
 return json({error:'Unknown admin action.'},400);
 }catch(error){return json({error:error instanceof Error&& !error.message.includes('D1_')?error.message:'Unable to save. Check for a duplicate film title and try again.'},400);}
}
