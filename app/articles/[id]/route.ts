import {env} from 'cloudflare:workers';
import {articleShell} from '../../../lib/article-shell';
import {escapeText,formatArticle} from '../../../lib/article-format';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){
  const {id}=await context.params;
  if(!/^[0-9a-f-]{36}$/i.test(id))return missing();
  try{
    const article=await env.DB!.prepare('SELECT id,title,film,author,body,created_at FROM articles WHERE id=? AND status=\'published\'').bind(id).first<{id:string;title:string;film:string;author:string;body:string;created_at:string}>();
    if(!article)return missing();
    const words=article.body.trim().split(/\s+/).length,minutes=Math.max(1,Math.ceil(words/220));
    const date=new Date(article.created_at).toLocaleDateString('en-NZ',{day:'numeric',month:'long',year:'numeric'});
    const content=`<article class="article-reading"><a class="back-link" href="/articles">← All articles</a><div class="eyebrow" style="margin-top:35px">${escapeText(article.film||'Cinema & company')}</div><h1>${escapeText(article.title)}</h1><div class="article-meta">By ${escapeText(article.author)} · ${escapeText(date)} · ${minutes} min read</div><div class="article-body">${formatArticle(article.body)}</div></article>`;
    return new Response(articleShell(article.title+' — Hamilton Cinema Club',content),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}});
  }catch{return new Response(articleShell('Articles unavailable','<section><h2>Unable to load this article.</h2><p>Please refresh to try again.</p><a href="/articles">All articles</a></section>'),{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}});}
}
function missing(){return new Response(articleShell('Article not found','<section><h2>Article not found.</h2><a href="/articles">← All articles</a></section>'),{status:404,headers:{'Content-Type':'text/html; charset=utf-8'}});}
