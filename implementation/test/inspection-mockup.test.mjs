import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {inspectionRecording,buildInspectionMockup} from '../scripts/inspection-mockup.mjs';
import {projectAcceptedView} from '../api/presentation.mjs';
import {inspectionModel} from '../../design/inspection/0.1-proposal/view.mjs';

test('inspection keeps tasks, concerns and requests separate without changing accepted focus',()=>{
  const recording=inspectionRecording(),s=projectAcceptedView(recording.states.initial),before=structuredClone(s);
  const m=inspectionModel(s);
  assert.deepEqual(m.counts,{work:3,concerns:2,requests:1});
  assert.equal(m.tasks.at(-1).id,'willow');
  assert.equal(m.selected,null);
  const juniper=m.tasks.find(w=>w.id==='juniper');
  assert.equal(juniper.concerns.length,1);assert.equal(juniper.requests.length,1);
  const chosen=inspectionModel(s,juniper.key);
  assert.equal(chosen.details.concerns[0].id,'worry');
  assert.deepEqual(s,before);
});

test('inspection retains unassigned and expired facts and scopes joins by producer',()=>{
  const r=inspectionRecording(),s=projectAcceptedView(r.states.expired);
  s.concerns.push({...s.concerns[0],id:'orphan',producerId:'other',workId:'cedar',lifecycle:'open'});
  s.requests.push({producerId:'other',id:'reply',concernId:'orphan',state:'open',category:'needs-you'});
  const m=inspectionModel(s,'missing');
  assert.equal(m.unknown,true);assert.equal(m.selected,null);
  assert.equal(m.unassignedConcerns[0].id,'orphan');assert.equal(m.unassignedRequests[0].id,'reply');
  assert.ok(m.tasks.every(w=>w.concerns.every(c=>c.producerId===w.producerId)));
  assert.equal(m.counts.concerns,2); // resolved user concern is not counted as open
});

test('recorded mock-up examples originate in actual accepted acknowledgement, closure and expiry',()=>{
  const {states}=inspectionRecording();
  const get=(state,id)=>projectAcceptedView(states[state]).concerns.find(c=>c.id===id);
  assert.equal(get('initial','worry').acknowledged,false);
  assert.equal(get('acknowledged','worry').acknowledged,true);
  assert.equal(get('acknowledged','worry').lifecycle,'open');
  assert.equal(get('resolved','worry').lifecycle,'resolved');
  assert.equal(get('resolved','compatibility').lifecycle,'open');
  assert.equal(projectAcceptedView(states.expired).baseState,'unknown');
});

test('mock-up opens only on demand, restores focus, renders pixels and switches recorded examples', {skip:!process.env.BRIAR_CANVAS_MODULE},async()=>{
  const path=await buildInspectionMockup(),html=await readFile(path,'utf8');
  assert.match(html,/<section id="panel" hidden/);
  assert.doesNotMatch(html,/innerHTML|fetch\(|https?:\/\//);
  assert.doesNotMatch(html,/PRESENTATION_BUNDLE|INSPECTION_MODEL|ACCEPTED_RECORDING/);
  const script=html.match(/<script type="module">([\s\S]*)<\/script>/)[1];
  let focused=null;
  class Element {
    constructor(){this.children=[];this.dataset={};this.attributes={};this.handlers={};this.textContent='';this.hidden=false}
    append(...children){this.children.push(...children)}
    replaceChildren(...children){this.children=[...children]}
    setAttribute(key,value){this.attributes[key]=value}
    addEventListener(key,fn){this.handlers[key]=fn}
    focus(){focused=this}
    click(){this.handlers.click?.()}
  }
  const nodes=Object.fromEntries(['#panel','#face','#close','#status','#counts','#tasks','#detail','#unassigned'].map(id=>[id,new Element()]));
  nodes['#panel'].hidden=true;
  const examples=['initial','acknowledged','resolved','expired'].map(state=>{const e=new Element();e.dataset.state=state;return e});
  const {createCanvas}=createRequire(import.meta.url)(process.env.BRIAR_CANVAS_MODULE),canvas=createCanvas(360,460);canvas.clientWidth=360;
  let tick;const handlers={};
  const context=vm.createContext({document:{querySelector:id=>id==='canvas'?canvas:nodes[id],querySelectorAll:()=>examples,createElement:()=>new Element(),addEventListener:(key,fn)=>{handlers[key]=fn}},
    devicePixelRatio:1,matchMedia:()=>({matches:true}),requestAnimationFrame:fn=>{tick=fn}});
  vm.runInContext(script,context,{timeout:2000});tick(0);tick(1000);
  assert.equal(nodes['#panel'].hidden,true);assert.ok(canvas.toBuffer('image/png').length>1000);
  nodes['#face'].click();assert.equal(nodes['#panel'].hidden,false);assert.equal(focused,nodes['#close']);
  assert.match(nodes['#counts'].textContent,/3 tasks · 2 unresolved concerns · 1 response requests/);
  const row=nodes['#tasks'].children.find(b=>b.children[0].textContent==='Overlay design');row.click();
  assert.equal(focused.dataset.key,JSON.stringify(['demo','juniper']));
  const texts=e=>e.textContent+' '+e.children.map(texts).join(' ');
  assert.match(texts(nodes['#detail']),/Will the panel cover the face/);
  examples[1].click();assert.match(texts(nodes['#detail']),/Acknowledged — this does not resolve/);
  assert.match(nodes['#counts'].textContent,/2 unresolved/);
  examples[2].click();assert.match(texts(nodes['#detail']),/Resolved/);assert.match(nodes['#counts'].textContent,/1 unresolved/);
  examples[3].click();tick(2000);assert.match(nodes['#status'].textContent,/Source unavailable — status unknown/);
  handlers.keydown({key:'Escape'});assert.equal(nodes['#panel'].hidden,true);assert.equal(focused,nodes['#face']);
});
