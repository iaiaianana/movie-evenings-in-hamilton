import {env} from 'cloudflare:workers';
import initial from './initial-programme.json';
export type Film=typeof initial.films[number];
export async function programme(){
 const {results}=await env.DB!.prepare('SELECT * FROM films ORDER BY director,title').all<Film>();
 if(!results.length){const initialized=await env.DB!.prepare('SELECT COUNT(*) AS n FROM screenings').first<{n:number}>();if(!initialized?.n)return {films:initial.films,screenings:initial.screenings,initialized:false};}
 const screenings=await env.DB!.prepare('SELECT * FROM screenings ORDER BY date DESC,id DESC').all<{id:string;film_id:string;date:string}>();return {films:results,screenings:screenings.results,initialized:true};
}
export async function initializeProgramme(){
 const count=await env.DB!.prepare('SELECT COUNT(*) AS n FROM films').first<{n:number}>();if(count?.n)throw Error('The programme is already initialized.');
 const statements=initial.films.map(f=>env.DB!.prepare('INSERT INTO films (id,title,year,director,category,kind,note,image,watched,archived) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(f.id,f.title,f.year,f.director,f.category,f.kind,f.note,f.image,f.watched,f.archived));
 statements.push(...initial.screenings.map(s=>env.DB!.prepare('INSERT OR IGNORE INTO screenings (id,film_id,date) VALUES (?,?,?)').bind(s.id,s.film_id,s.date)));
 statements.push(...initial.legacyReviews.map(r=>env.DB!.prepare('INSERT OR IGNORE INTO contributions (id,kind,film,name,body,created_at,status) VALUES (?,?,?,?,?,?,?)').bind(r.id,r.kind,r.film,r.name,r.body,r.created_at,r.status)));
 await env.DB!.batch(statements);
}
export const validImage=(value:string)=>value===''||/^\/?assets\/[a-zA-Z0-9._-]+$/.test(value)||(/^https:\/\//.test(value)&&!/[\s<>"']/.test(value));
export const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
