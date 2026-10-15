import {env} from 'cloudflare:workers';
import {currentAdmin,json,sameOrigin,readJson} from '../../../../lib/admin-auth';
export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:'Invalid origin.'},403);
 if(!await currentAdmin(request))return json({error:'Please sign in.'},401);
 if(!env.TMDB_READ_TOKEN)return json({error:'Film lookup needs a one-time TMDB connection. You can still paste an image URL or save without a cover.'},503);
 try{
  const value=await readJson(request);
  if(value.id!==undefined){
   if(!Number.isSafeInteger(value.id)||value.id<=0||!['film','series'].includes(value.kind))return json({error:'Choose a valid film or series.'},400);
   const kind=value.kind==='series'?'tv':'movie';
   const response=await fetch('https://api.themoviedb.org/3/'+kind+'/'+value.id+'?language=en-US'+(kind==='movie'?'&append_to_response=credits':''),{headers:{Authorization:'Bearer '+env.TMDB_READ_TOKEN,accept:'application/json'},signal:AbortSignal.timeout(10000)});
   if(!response.ok)return json({error:'Unable to load this film. Your form has not changed. Try again or enter details manually.'},502);
   const film=await response.json() as {title?:string;name?:string;release_date?:string;first_air_date?:string;backdrop_path?:string;poster_path?:string;created_by?:Array<{name:string}>;credits?:{crew?:Array<{job:string;name:string}>}};
   const names=kind==='movie'?film.credits?.crew?.filter(p=>p.job==='Director').map(p=>p.name):film.created_by?.map(p=>p.name);
   const path=film.backdrop_path||film.poster_path;
   return json({film:{title:(film.title||film.name||'').slice(0,160),year:(film.release_date||film.first_air_date||'').slice(0,4),director:[...new Set((names||[]).filter(n=>typeof n==='string'&&n.trim()))].join(', ').slice(0,160),kind:value.kind,image:path&&/^\/[a-zA-Z0-9._-]+$/.test(path)?'https://image.tmdb.org/t/p/'+(film.backdrop_path?'w780':'w500')+path:''}});
  }
  const title=typeof value.title==='string'?value.title.trim():'';
  if(!title||title.length>160||!['film','series'].includes(value.kind))return json({error:'Enter a title and select Film or Series first.'},400);
  const kind=value.kind==='series'?'tv':'movie',params=new URLSearchParams({query:title,language:'en-US',include_adult:'false',page:'1'});
  if(/^\d{4}$/.test(String(value.year||'')))params.set(kind==='movie'?'primary_release_year':'first_air_date_year',String(value.year));
  const response=await fetch('https://api.themoviedb.org/3/search/'+kind+'?'+params,{headers:{Authorization:'Bearer '+env.TMDB_READ_TOKEN,accept:'application/json'},signal:AbortSignal.timeout(10000)});
  if(!response.ok)return json({error:response.status===401?'The TMDB connection needs updating. Manual image URLs still work.':'Cover search is unavailable right now. Please try again later.'},502);
  const data=await response.json() as {results?:Array<{id:number;title?:string;name?:string;release_date?:string;first_air_date?:string;backdrop_path?:string;poster_path?:string;adult?:boolean}>};
  const results=(data.results||[]).filter(f=>!f.adult).slice(0,12).flatMap(f=>{
   const path=f.backdrop_path||f.poster_path;if(path&&!/^\/[a-zA-Z0-9._-]+$/.test(path))return [];
   return [{id:f.id,title:f.title||f.name||'',year:(f.release_date||f.first_air_date||'').slice(0,4),image:path?'https://image.tmdb.org/t/p/'+(f.backdrop_path?'w780':'w500')+path:'',format:f.backdrop_path?'Still':f.poster_path?'Poster':'No cover',source:'https://www.themoviedb.org/'+kind+'/'+f.id}];
  });
  return json({results});
 }catch{return json({error:'Unable to find covers right now. Try again, paste an image URL, or save without a cover.'},502)}
}
