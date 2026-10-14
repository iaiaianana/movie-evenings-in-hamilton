import { siteHtml } from './site-html';
export function GET() { return new Response(siteHtml,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}}); }
