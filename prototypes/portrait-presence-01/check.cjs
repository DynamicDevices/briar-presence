'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function harness(reduced=false){
  const nodes=new Map(),events=new Map(),frames=new Map();let serial=0;
  function node(){return {textContent:'',value:'ready',disabled:false,children:[],style:{},attributes:{},listeners:{},setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,f){this.listeners[k]=f;},replaceChildren(){this.children=[];},append(p){this.children.push(p);}};}
  const gradient={addColorStop(){}};
  const ctx=new Proxy({createRadialGradient(){return gradient;}},{get(t,k){return k in t?t[k]:()=>{};}});
  const canvas=node();canvas.getContext=()=>ctx;
  nodes.set('canvas',canvas);nodes.set('select',node());
  for(const name of ['title','summary','freshness','concern','play','pause','detail','ack','resolve','motion'])nodes.set('[data-bp="'+name+'"]',node());
  const root={querySelector(s){assert(nodes.has(s),'unknown selector '+s);return nodes.get(s);}};
  const media={matches:reduced,addEventListener(){}};
  const document={hidden:false,getElementById(id){assert.equal(id,'briar-portrait-study');return root;},createElement:node,addEventListener(k,f){events.set(k,f);}};
  vm.runInNewContext(script,{window:{addEventListener(){}},document,matchMedia:()=>media,performance:{now:()=>0},structuredClone,requestAnimationFrame(f){frames.set(++serial,f);return serial;},cancelAnimationFrame(id){frames.delete(id);}});
  function el(name){return nodes.get('[data-bp="'+name+'"]');}
  function scene(value){nodes.get('select').value=value;nodes.get('select').listeners.change();assert.equal(root.briarStudy.getState().scene,value);}
  function click(name){const e=el(name);assert(!e.disabled,name+' disabled');e.listeners.click();}
  function frame(time){const [id,fn]=frames.entries().next().value;frames.delete(id);fn(time);}
  return {root,el,scene,click,frame,frames,document,events,canvas};
}
const h=harness();
assert.equal(h.frames.size,0,'starts still');
for(const s of Object.keys(h.root.briarStudy.scenes))h.scene(s);
h.scene('concern');h.click('ack');
assert(h.root.briarStudy.getState().concern.ack);
for(const s of ['stale','unknown','ready','work']){h.scene(s);assert(h.root.briarStudy.getState().concern,'concern retained in '+s);}
h.scene('unknown');assert.match(h.el('freshness').textContent,/expired/);assert.match(h.canvas.attributes['aria-label'],/All activity unknown/);
h.click('resolve');assert.equal(h.root.briarStudy.getState().concern,null);
h.scene('concern');h.click('resolve');assert.equal(h.el('title').textContent,'Concern resolved in demo');
h.click('play');assert.equal(h.frames.size,1);
for(const t of [3000,6000,9000,12000,15000,18000])h.frame(t);
assert.equal(h.frames.size,0,'finite playback');assert.equal(h.root.briarStudy.getState().scene,'unknown');assert(h.root.briarStudy.getState().concern);
h.click('play');h.document.hidden=true;h.events.get('visibilitychange')();assert.equal(h.frames.size,0,'hidden playback stops');
const r=harness(true);assert(r.el('play').disabled,'reduced motion disables playback');assert.equal(r.frames.size,0);r.scene('attending');
assert(!/\b(fetch|XMLHttpRequest|WebSocket|EventSource|setInterval|setTimeout)\s*\(/.test(script),'no networking or polling');
assert(!/navigator\.(serial|usb|mediaDevices)/.test(script),'no hardware or microphone access');
assert.equal(h.root.briarStudy.reduce({scene:'ready',concern:null},{type:'scene',scene:'bad'}).scene,'ready');
console.log('PASS: seven scenes; controls; persistent concerns; acknowledgement vs resolution; expiry; finite playback; hidden/reduced motion; no networking, polling or hardware APIs. DOM/Canvas stubs only; browser appearance not verified.');
