import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {createPresence,STATES} from '../core/presence.mjs';
import {drawCanvas} from '../renderers/canvas.mjs';
const seed=0x5eed1234;
const input=(time,state='quiet',reducedMotion=false)=>({time,state,reducedMotion});
test('seeded scene is repeatable, serialisable and independent of platform APIs',()=>{
 const a=createPresence(seed),b=createPresence(seed);
 assert.deepEqual(a.sample(input(7)),b.sample(input(7)));
 const first=a.sample(input(7));a.sample(input(200));assert.deepEqual(a.sample(input(7)),first,'Seeking backward must replay the same scene');
 assert.notDeepEqual(first.lights,createPresence(seed+1).sample(input(7)).lights);
 assert.deepEqual(JSON.parse(JSON.stringify(first)),first);
 assert.doesNotMatch(fs.readFileSync(new URL('../core/presence.mjs',import.meta.url),'utf8'),/\b(document|window|fetch|process|require|Math\.random)\b|^import /m);
});
test('movement continues, individual lights wander and face gatherings recur',()=>{
 const model=createPresence(seed);
 for(const t of [15,35,65,125,245])assert.notDeepEqual(model.sample(input(t)).lights,model.sample(input(t+2)).lights);
 const a=model.sample(input(0)),b=model.sample(input(3));
 const dx=i=>b.lights[i].x-a.lights[i].x;
 assert.notEqual(dx(0),dx(1));
 const widths=[];for(let t=0;t<90;t+=.5)widths.push(model.sample(input(t)).glows[0].ry);
 assert.ok(Math.max(...widths)>Math.min(...widths)*2,'Face gathering changes cluster geometry');
});
test('waiting, unknown and reduced motion are static; concern stays local',()=>{
 const model=createPresence(seed);
 for(const state of STATES){
  const a=model.sample(input(10,state,true)),b=model.sample(input(20,state,true));
  assert.deepEqual(a.lights,b.lights);assert.deepEqual(a.glows,b.glows);
 }
 for(const state of ['waiting','unknown'])assert.deepEqual(model.sample(input(10,state)).lights,model.sample(input(20,state)).lights);
 const concern=model.sample(input(0,'concern')).glows;
 assert.deepEqual(concern.map((c,i)=>c.color[0]>c.color[2]?i:null).filter(i=>i!==null),[5,7]);
 assert.ok(model.sample(input(0,'urgent')).glows.every(c=>c.color[0]>c.color[2]));
 assert.ok(model.sample(input(0,'unknown')).lights.every(p=>p.opacity<=.25));
});
test('invalid inputs are rejected at the public boundary',()=>{
 assert.throws(()=>createPresence(-1),TypeError);assert.throws(()=>createPresence(NaN),TypeError);
 for(const value of [{time:-1,state:'quiet',reducedMotion:false},{time:NaN,state:'quiet',reducedMotion:false},{time:0,state:'healthy',reducedMotion:false},{time:0,state:'quiet'}])assert.throws(()=>createPresence(seed).sample(value),TypeError);
});
test('desktop contrast adds a soft local dark backing without an enclosing frame',{skip:!process.env.BRIAR_CANVAS_MODULE},()=>{
 const {createCanvas}=createRequire(import.meta.url)(process.env.BRIAR_CANVAS_MODULE);
 const canvas=createCanvas(360,460),ctx=canvas.getContext('2d');
 drawCanvas(ctx,createPresence(seed).sample(input(3)),{contrast:true});
 const rgba=ctx.getImageData(0,0,360,460).data;let dark=0,soft=0;
 for(let i=0;i<rgba.length;i+=4){if(rgba[i+3]>160&&rgba[i]<30&&rgba[i+1]<40&&rgba[i+2]<60)dark++;if(rgba[i+3]>0&&rgba[i+3]<50)soft++;}
 assert.ok(dark>1000,'Local shade provides substantial contrast against a light desktop');
 assert.ok(soft>1000,'Shade edges fade rather than form an opaque card');
 assert.equal(rgba[3],0);assert.equal(rgba.at(-1),0,'Window corners remain transparent');
});
test('small desktop light treatment increases visible point coverage without changing the scene',{skip:!process.env.BRIAR_CANVAS_MODULE},()=>{
 const {createCanvas}=createRequire(import.meta.url)(process.env.BRIAR_CANVAS_MODULE);
 const scene=createPresence(seed).sample(input(3)),baseline=createCanvas(225,288),clear=createCanvas(225,288);
 drawCanvas(baseline.getContext('2d'),scene);drawCanvas(clear.getContext('2d'),scene,{pointScale:1.6,lightGain:1.2});
 const count=canvas=>{const data=canvas.getContext('2d').getImageData(0,0,225,288).data;let visible=0;for(let i=3;i<data.length;i+=4)if(data[i]>100)visible++;return visible;};
 assert.ok(count(clear)>count(baseline)*1.5,'More light pixels remain visible at native small size');
 assert.throws(()=>drawCanvas(clear.getContext('2d'),scene,{pointScale:NaN}),TypeError);
});
test('extracted renderer preserves the accepted prototype pixels',{skip:!process.env.BRIAR_CANVAS_MODULE},t=>{
 const {createCanvas}=createRequire(import.meta.url)(process.env.BRIAR_CANVAS_MODULE);
 const html=fs.readFileSync(new URL('../../prototypes/laptop-presence-01/index.html',import.meta.url),'utf8');
 const source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 let worstMean=0,worstFraction=0;
 for(const state of STATES)for(const time of [0,7,17,65]){
  const original=createCanvas(720,920);original.style={};const target=createCanvas(720,920);
  const nodes=new Map();const element=id=>{if(!nodes.has(id))nodes.set(id,{checked:false,style:{},value:'quiet',setAttribute(){},addEventListener(){}});return nodes.get(id);};
  const math=Object.create(Math);math.random=()=>seed/4294967296;
  const context=vm.createContext({Math:math,document:{hidden:false,querySelector:id=>id==='#face'?original:element(id),addEventListener(){}},matchMedia:()=>({matches:false,addEventListener(){}}),performance:{now:()=>0},requestAnimationFrame:()=>1,cancelAnimationFrame(){}});
  vm.runInContext(source,context);vm.runInContext(`state=${JSON.stringify(state)};time=${time};render()`,context);
  drawCanvas(target.getContext('2d'),createPresence(seed).sample(input(time,state)));
  const a=original.getContext('2d').getImageData(0,0,720,920).data,b=target.getContext('2d').getImageData(0,0,720,920).data;
  let sum=0,changed=0;for(let i=0;i<a.length;i++){sum+=Math.abs(a[i]-b[i]);if(a[i]!==b[i])changed++;}
  const mean=sum/a.length,fraction=changed/a.length;worstMean=Math.max(worstMean,mean);worstFraction=Math.max(worstFraction,fraction);
  assert.ok(mean<.02&&fraction<.01,`${state}@${time}: mean ${mean}, changed fraction ${fraction}`);
 }
 t.diagnostic(`28 reference frames: maximum mean channel error ${worstMean.toFixed(6)}/255; maximum changed channels ${(100*worstFraction).toFixed(4)}%. Offline canvas evidence only.`);
});
