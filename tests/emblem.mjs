import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const timers=new Map(),frames=new Map(),listeners={};let seq=0,now=0,Component;
class Node {constructor(){this.style={};this.attrs={};this.nodes={};this.children=[];}setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]}querySelector(k){return this.nodes[k]??=new Node()}append(node){this.children.push(node)}remove(){this.removed=true}}
const motion={matches:false,addEventListener(k,fn){this.listener=fn},removeEventListener(){this.listener=null}};
const document={hidden:false,createElementNS:()=>new Node(),addEventListener(k,fn){listeners[k]=fn},removeEventListener(k){delete listeners[k]}};
const customElements={get:()=>null,define(name,c){Component=c}};
let random=0;const math=Object.create(Math);math.random=()=>{random=(random+.23)%1;return random};
vm.runInNewContext(readFileSync('public/emblem.js','utf8'),{window:{customElements,matchMedia:()=>motion},customElements,HTMLElement:Node,document,performance:{now:()=>now},Math:math,setTimeout(fn,delay){const id=++seq;timers.set(id,{fn,delay});return id},clearTimeout:id=>timers.delete(id),requestAnimationFrame(fn){const id=++seq;frames.set(id,fn);return id},cancelAnimationFrame:id=>frames.delete(id)});
const component=new Component();component.querySelector('img').setAttribute('src','/assets/cinema-emblem-green.webp');component.connectedCallback();
assert.equal(timers.size,3);const delays=[...timers.values()].map(t=>t.delay);assert(delays.every(d=>d>=12000&&d<=18000));assert.equal(new Set(delays).size,3);
const [id,timer]=[...timers][0];timers.delete(id);timer.fn();assert.equal(frames.size,1);
const advance=time=>{now=time;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(time))};advance(90);
const svg=component.children[0],eye=svg.children[0];assert.equal(eye.style.visibility,'visible');assert(eye.querySelector('.eye-copy').attrs.transform.includes('scale(1 0.001)'));advance(180);assert.equal(eye.style.visibility,'hidden');assert.equal(timers.size,3);
motion.matches=true;motion.listener();assert.equal(timers.size,0);assert.equal(frames.size,0);assert(svg.children.every(g=>g.style.visibility==='hidden'));
motion.matches=false;motion.listener();assert.equal(timers.size,3);document.hidden=true;listeners.visibilitychange();assert.equal(timers.size,0);document.hidden=false;listeners.visibilitychange();assert.equal(timers.size,3);
component.disconnectedCallback();assert.equal(timers.size,0);assert(svg.removed);assert.equal(motion.listener,null);assert.equal(Object.keys(listeners).length,0);
console.log('Passed: independent random blink delays, blink completion, reduced motion, hidden tabs and cleanup.');
