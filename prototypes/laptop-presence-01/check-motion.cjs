// Offline canvas/DOM-model checks, not real-browser acceptance.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas}=require(process.env.BRIAR_CANVAS_MODULE||'@napi-rs/canvas');
const html=fs.readFileSync(require('node:path').join(__dirname,'index.html'),'utf8');
function boot(view){
 const nodes=new Map(),frames=new Map();let count=0;
 function el(id){
  if(!nodes.has(id))nodes.set(id,{hidden:id==='#explanation',checked:false,value:'quiet',style:{},events:{},attrs:{},focus(){this.focused=true;},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,f){this.events[k]=f;}});
  return nodes.get(id);
 }
 const canvas=createCanvas(720,920);canvas.style={};
 const doc={hidden:false,defaultView:view,body:{classList:{add(){}}},events:{},querySelector:id=>id==='#face'?canvas:el(id),addEventListener(k,f){this.events[k]=f;}};
 const pref={matches:false,addEventListener(k,f){this.change=f;}};
 const context=vm.createContext({document:doc,URL,matchMedia:()=>pref,performance:{now:()=>0},requestAnimationFrame:f=>{frames.set(++count,f);return count;},cancelAnimationFrame:id=>frames.delete(id)});
 vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
 return {el,canvas,doc,pref,context,frames};
}
const {el,canvas,doc,pref,context,frames}=boot();
const run=s=>vm.runInContext(s,context);
// Pointer/keyboard movement and viewport containment, without a real browser.
const handle=el('#dragHandle'),widget=el('#presence');
doc.defaultView={innerWidth:800,innerHeight:600};
widget.getBoundingClientRect=()=>({left:parseFloat(widget.style.left)||100,top:parseFloat(widget.style.top)||100,width:180,height:320});
handle.setPointerCapture=()=>{};handle.hasPointerCapture=()=>true;handle.releasePointerCapture=()=>{};
const pointer={button:0,pointerId:1,clientX:110,clientY:110,preventDefault(){}};
handle.events.pointerdown(pointer);handle.events.pointermove({...pointer,clientX:210,clientY:160});
assert.equal(widget.style.left,'200px');assert.equal(widget.style.top,'150px');
handle.events.pointerup(pointer);
handle.events.keydown({key:'ArrowRight',shiftKey:false,preventDefault(){}});assert.equal(widget.style.left,'210px');
run('placePresence(9999,-100)');assert.equal(widget.style.left,'620px');assert.equal(widget.style.top,'0px');
handle.events.pointermove({...pointer,clientX:300});assert.equal(widget.style.left,'620px','Pointer release ends dragging');
const image=t=>{run(`time=${t};render()`);return canvas.toBuffer('image/png');};
assert.equal(frames.size,1);
assert.doesNotMatch(html,/ctx\.(ellipse|clip)\(/,'No oval enclosure or clipping mask');
assert.ok(run('Math.abs(wander(1-1e-5,7)-wander(1+1e-5,7))<1e-6'),'Random paths are continuous at waypoints');
assert.ok(run(`(()=>{const c=clouds[0],a=points[0],b=points[1];const delta=p=>{const p0=particlePosition(p,c,0,1,0),p1=particlePosition(p,c,3,1,0);return p1.map((v,i)=>v-p0[i]);};const da=delta(a),db=delta(b);return Math.hypot(da[0]-db[0],da[1]-db[1])>1e-5;})()`),'Individual lights move independently within a cluster');
// At the actual 180px widget width, each cluster must travel visibly, not
// merely produce different high-resolution pixels. Canvas units scale by 0.5.
const spans=run(`clouds.map((_,group)=>{const poses=Array.from({length:49},(_,i)=>layout(group,i/4,0));const xs=poses.map(p=>p[0]*60),ys=poses.map(p=>p[1]*82.5);return Math.hypot(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));})`);
assert.ok(spans.every(span=>span>8),'Every cluster travels over 8 displayed pixels across 12 seconds');
// Drift remains visible after the first gathering and well beyond one minute.
for(const t of [15,35,65,125])assert.ok(!image(t).equals(image(t+2)),`Motion at ${t}s`);
const schedule=run(`(()=>{const seen=[];let lastStart=-1;for(let t=130;t<240;t+=.5){faceBlend(t);if(gathering.start!==lastStart){seen.push({...gathering});lastStart=gathering.start;}}return seen;})()`);
assert.ok(schedule.length>=4,'Repeated gatherings');
assert.ok(new Set(schedule.map(x=>x.duration)).size>1,'Varied duration');
assert.ok(new Set(schedule.map(x=>x.strength)).size>1,'Varied strength');
assert.notEqual(run('JSON.stringify(motion)'),vm.runInContext('JSON.stringify(motion)',boot().context),'New opening varies drift');
el('#faceButton').events.click();assert.equal(el('#explanation').hidden,false);
doc.events.keydown({key:'Escape'});assert.equal(el('#explanation').hidden,true);assert.ok(el('#faceButton').focused);
for(const state of ['quiet','attending','working','concern','urgent','waiting','unknown']){
 el('#expression').value=state;el('#expression').events.change();
 assert.equal(frames.size,['waiting','unknown'].includes(state)?0:1);
 if(['waiting','unknown'].includes(state))assert.ok(image(250).equals(image(255)),`${state} remains still`);
}
el('#expression').value='quiet';el('#expression').events.change();
el('#still').checked=true;el('#still').events.change();assert.equal(frames.size,0);assert.ok(image(260).equals(image(265)));
el('#still').checked=false;el('#still').events.change();
doc.hidden=true;doc.events.visibilitychange();assert.equal(frames.size,0);
doc.hidden=false;doc.events.visibilitychange();assert.equal(frames.size,1);
// Simulate three minutes of animation callbacks without expensive rasterisation.
run('render=()=>{};time=0;last=0;');
for(let now=80;now<=180000;now+=80){const [id,fn]=frames.entries().next().value;frames.delete(id);fn(now);assert.equal(frames.size,1);}
assert.ok(run('time')>179,'Animation advances continuously');
run('time=0;last=0;drawn=-Infinity;');
for(let now=1000;now<=10000;now+=1000){const [id,fn]=frames.entries().next().value;frames.delete(id);fn(now);}
assert.equal(run('time'),10,'Throttled callbacks must follow real elapsed time');
assert.match(el('#motionInfo').textContent,/Motion running · 10s/);
pref.change({matches:true});assert.equal(frames.size,0);
assert.match(el('#motionInfo').textContent,/paused · reduced motion/);
el('#restartMotion').events.click();assert.equal(frames.size,1);assert.equal(el('#still').checked,false);
run('render=()=>{throw new Error("test renderer failure")};');
{const [id,fn]=frames.entries().next().value;frames.delete(id);fn(11000);}
assert.equal(frames.size,0);assert.match(el('#motionInfo').textContent,/Motion error: test renderer failure/);
let opened;
const separate=boot({location:{href:'file:///preview/index.html',hash:''},addEventListener(){},open(...args){opened=args;}});
separate.el('#smallWindow').events.click();
assert.deepEqual(opened,['file:///preview/index.html#floating','_blank','popup=yes,width=260,height=460,noopener']);
assert.doesNotMatch(html,/\b(fetch|WebSocket|EventSource|getUserMedia|localStorage)\b|<script[^>]+src=|https?:\/\//);
console.log(`PASS: cluster travel at 180px widget width: ${Math.min(...spans).toFixed(1)}–${Math.max(...spans).toFixed(1)}px across 12s; continuous drift beyond two minutes; varied gatherings; three-minute frame loop; throttled frames; pause/error/restart controls; static modes; no live-data APIs. Offline checks only.`);
