import {env} from 'cloudflare:workers';
import {currentAdmin,json} from '../../../../lib/admin-auth';
import {programme} from '../../../../lib/club-data';
export async function GET(request:Request){try{const username=await currentAdmin(request);if(!username)return json({error:'Please sign in.'},401);const data=await programme();const [posts,articles]=await Promise.all([env.DB!.prepare('SELECT * FROM contributions ORDER BY created_at DESC LIMIT 1000').all(),env.DB!.prepare('SELECT * FROM articles ORDER BY created_at DESC LIMIT 200').all()]);return json({username,...data,posts:posts.results,articles:articles.results});}catch{return json({error:'Unable to load the admin dashboard.'},503)}}
