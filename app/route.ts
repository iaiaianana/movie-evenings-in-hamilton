import {siteHtml} from './site-html';
import {programme} from '../lib/club-data';
export const dynamic='force-dynamic';
export async function GET(){try{const data=await programme();return new Response(siteHtml.replace('__PROGRAMME_DATA__',JSON.stringify(data).replace(/</g,'\\u003c')),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});}catch{return new Response('The programme is temporarily unavailable. Please refresh to try again.',{status:503,headers:{'Content-Type':'text/plain'}});}}
