// Offline logic/DOM-model checks only. Not real-browser or human acceptance.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const ids=new Map();
const document={activeElement:null,getElementById:id=>ids.get(id),createElement:tag=>new Element(tag)};
class Element{
  constructor(tag){this.tagName=tag;this.textContent='';this.children=[];this.dataset={};this.style={};this.attributes={};this.events={};this.scrollTop=0;this.disabled=false;}
  set id(value){this._id=value;ids.set(value,this);}get id(){return this._id;}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];}
  setAttribute(k,v){this.attributes[k]=v;}
  addEventListener(k,fn){this.events[k]=fn;}
  focus(){document.activeElement=this;}
}
for(const match of html.matchAll(/id="([^"]+)"/g)){const e=new Element('fixture');e.id=match[1];}
const listeners={};const location={hash:''};
const window={addEventListener:(type,fn)=>listeners[type]=fn};
const context=vm.createContext({document,window,location,URLSearchParams,console});
vm.runInContext(script,context,{filename:'index.html'});
const run=code=>vm.runInContext(code,context);
const initialOrder=ids.get('lights').children.map(e=>e.dataset.task).join(',');
assert.equal(run('focused'),'orchard');assert.equal(run('inspected'),'beacon');
assert.equal(run('counts().urgent'),1);assert.equal(run('counts().concern'),2);assert.equal(run('counts().stale'),1);
run("inspect('cedar',true)");assert.equal(run('focused'),'orchard');assert.equal(ids.get('detailName').textContent,'Cedar');assert.equal(document.activeElement,ids.get('detailName'));
ids.get('focus').events.click();assert.equal(run('focused'),'cedar');assert.equal(ids.get('face').src,'assets/urgent.png');
ids.get('ack').events.click();assert.equal(run("task('cedar').acknowledged"),true);assert.equal(run('counts().urgent'),1,'Acknowledgement must not clear urgency');
run("inspect('mesa');focusWork()");assert.equal(ids.get('face').src,'assets/disconnected.png');assert.match(ids.get('focusState').textContent,/unknown.*stale/);
run("inspect('beacon')");ids.get('ack').events.click();assert.equal(run('counts().concern'),2);assert.match(ids.get('notice').textContent,/unresolved/);
run("inspect('harbor');focusWork()");assert.match(ids.get('focusState').textContent,/Waiting.*Someone else/);assert.equal(run("task('beacon').severity"),'concern');
assert.equal(ids.get('lights').children.map(e=>e.dataset.task).join(','),initialOrder,'Peripheral slots must remain stable');
ids.get('stress').events.click();assert.equal(run('work.length'),30);assert.equal(run('counts().urgent'),2);assert.match(ids.get('more').textContent,/1 urgent/);
ids.get('more').events.click();assert.equal(run('inspected'),'sample-24');assert.equal(run('focused'),'harbor');assert.match(ids.get('reason').textContent,/overflow/);
location.hash='#inspect=sample-24&focus=cedar&items=30';listeners.hashchange();assert.equal(run('focused'),'cedar');assert.equal(run('inspected'),'sample-24');
location.hash='#inspect=not-a-task&focus=javascript%3Aalert(1)';listeners.hashchange();assert.equal(run('focused'),'cedar');assert.equal(run('inspected'),'sample-24');
ids.get('reset').events.click();assert.equal(run('work.length'),6);assert.equal(run('focused'),'orchard');assert.equal(run('inspected'),'beacon');assert.equal(run("task('beacon').acknowledged"),false);
assert.equal(ids.get('lights').children.map(e=>e.dataset.task).join(','),initialOrder);
for(const name of ['face','concern','urgent','disconnected'])assert.ok(fs.statSync(path.join(__dirname,'assets',name+'.png')).size>0);
assert.equal(/\b(?:fetch|WebSocket|EventSource|getUserMedia|setInterval|localStorage|sessionStorage)\b/.test(script),false,'No network, sensing, polling or storage API');
assert.equal(/<[^>]+(?:src|href)=["']https?:\/\//.test(html),false,'No remote resources');
assert.equal(/\.innerHTML\s*=/.test(script),false,'Use text nodes, not interpolated task HTML');
console.log('PASS: separate inspect/focus, persistent concerns and urgency, acknowledge != resolve, stale state, next actor, stable slots, 30-item overflow, local deep links, invalid IDs, reset, assets and no network/storage/polling.');
console.log('Offline model only: browser layout, keyboard/screen-reader behaviour and intuitive recognition remain unverified.');
