export function escapeText(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
}
export function formatArticle(body: string): string {
  const inline=(value:string)=>escapeText(value).replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*\n]+)\*/g,'<em>$1</em>');
  return body.replace(/\r\n?/g,'\n').split(/\n\s*\n/).filter(x=>x.trim()).map(block=>{
    if(/^#{1,3} /.test(block)&&!block.includes('\n'))return '<h2>'+inline(block.replace(/^#{1,3} /,''))+'</h2>';
    if(block.split('\n').every(line=>line.startsWith('> ')))return '<blockquote>'+inline(block.split('\n').map(line=>line.slice(2)).join('\n')).replace(/\n/g,'<br>')+'</blockquote>';
    return '<p>'+inline(block).replace(/\n/g,'<br>')+'</p>';
  }).join('');
}
