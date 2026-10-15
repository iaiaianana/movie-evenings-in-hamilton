import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const initial=JSON.parse(readFileSync('lib/initial-programme.json','utf8'));
const nodes={};const node=id=>nodes[id]??={value:id==='#status'?'all':'',innerHTML:'',textContent:'',hidden:false,addEventListener(){}};
const context=vm.createContext({console,Date,Map,Set,JSON,String,document:{hidden:false,querySelector:node,querySelectorAll:()=>[]},localStorage:{getItem:()=>'',setItem(){}},crypto:globalThis.crypto,setInterval(){},fetch:async url=>({ok:true,json:async()=>url.includes('next-screening')?{film:initial.films.find(f=>f.id==='persona')}:{entries:[]}})});
let code=readFileSync('site.html','utf8').split('<script>')[1].split('</script>')[0].replace('__PROGRAMME_DATA__',JSON.stringify(initial));vm.runInContext(code,context);await new Promise(resolve=>setImmediate(resolve));
assert.equal(node('#filmCount').textContent,'18');assert.equal(node('#watchedCount').textContent,'05');assert.equal(node('#last-title').textContent,'Hour of the Wolf');assert(node('#films').innerHTML.includes('data-next-film="Persona" disabled'));assert(!node('#films').innerHTML.includes('data-next-film="Ida"'));
vm.runInContext(`films.push({id:'unsafe',title:'<img src=x onerror=alert(1)>',director:'<script>evil</script>',year:'2000',category:'director',kind:'film',image:'',note:'<b>note</b>',watched:0,archived:0});render();`,context);
assert(!node('#films').innerHTML.includes('<script>evil</script>'));assert(node('#films').innerHTML.includes('&lt;script&gt;evil&lt;/script&gt;'));assert(node('#films').innerHTML.includes('&lt;b&gt;note&lt;/b&gt;'));
vm.runInContext(`films.find(f=>f.id==='persona').watched=1;screenings.push({id:'new',film_id:'persona',date:'2026-10-16'});render();renderDiary();`,context);assert.equal(node('#last-title').textContent,'Persona');assert.equal(node('#watchedCount').textContent,'06');assert.equal(node('#filmCount').textContent,'18'); // one extra unwatched test entry offsets Persona
vm.runInContext(`rememberGroup({target:{dataset:{group:'Ingmar Bergman'},open:false}});render();`,context);
assert.match(node('#films').innerHTML, /data-group="Ingmar Bergman" ><summary>/);
assert.match(node('#films').innerHTML, /class="group-count">2 of 5 watched/);
vm.runInContext(`rememberGroup({target:{dataset:{group:'Ingmar Bergman'},open:true}});render();`,context);
assert.match(node('#films').innerHTML, /data-group="Ingmar Bergman" open><summary>/);
console.log('Passed: public counters, next buttons, updated diary/last cover, and escaped programme rendering.');
