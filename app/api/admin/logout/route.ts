import {env} from 'cloudflare:workers';
import {sameOrigin,sessionCookie,digest,json} from '../../../../lib/admin-auth';
export async function POST(request:Request){if(!sameOrigin(request))return json({error:'Invalid origin.'},403);const token=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('club_admin='))?.slice(11);if(token&&/^[a-f0-9]{64}$/.test(token))await env.DB!.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(await digest(token)).run();return json({ok:true},200,{'Set-Cookie':sessionCookie(request,'',0)});}
