// Offline design checks and still rendering. Not browser/device acceptance.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {createCanvas}=require(process.env.BRIAR_CANVAS_MODULE||'@napi-rs/canvas');
const html=fs.readFileSync(path.join(__dirname,'motion-study.html'),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const elements=new Map();
function element(id){
  if(!elements.has(id))elements.set(id,{value:0,textContent:'',checked:false,disabled:false,dataset:{},attributes:{},events:{},setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,fn){this.events[k]=fn;}});
  return elements.get(id);
}
const canvas=createCanvas(1100,1100);
canvas.setAttribute=(key,value)=>element('#face').setAttribute(key,value);
const chapterTimes=[...html.matchAll(/class="chapter" data-time="([\d.]+)"/g)].map(m=>Number(m[1]));
const chapters=chapterTimes.map(t=>{const e=element('chapter-'+t);e.dataset.time=String(t);return e;});
const frames=new Map();let frameId=0;
const document={hidden:false,events:{},querySelector:id=>id==='#face'?canvas:element(id),querySelectorAll:()=>chapters,addEventListener(k,fn){this.events[k]=fn;}};
const pref={matches:false,addEventListener(){}};
const context=vm.createContext({document,matchMedia:()=>pref,performance:{now:()=>0},requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id),console});
vm.runInContext(source,context,{filename:'motion-study.html'});
assert.equal(frames.size,0,'Study must start still');
function choose(i){chapters[i].events.click();}
const images=[];
for(const [i,state] of [[2,'Abstract face'],[4,'Holding a concern'],[8,'Urgent'],[9,'Disconnected']]){
  choose(i);assert.match(element('#state').textContent,new RegExp(state));
  assert.equal(chapters.filter(b=>b.attributes['aria-pressed']==='true').length,1);
  assert.equal(frames.size,0,'Chapter selection must stay still');
  images.push({label:state,buffer:canvas.toBuffer('image/png')});
}
element('#reduced').checked=true;element('#reduced').events.change();
assert.equal(element('#play').disabled,true);element('#play').events.click();assert.equal(frames.size,0);
element('#reduced').checked=false;element('#reduced').events.change();
element('#restart').events.click();assert.equal(Number(element('#timeline').value),0);
element('#play').events.click();assert.equal(frames.size,1,'Playback schedules a frame');
document.hidden=true;document.events.visibilitychange();assert.equal(frames.size,0,'Hidden study must pause');
document.hidden=false;
element('#timeline').value=51.99;element('#timeline').events.input();
element('#play').events.click();
const [id,callback]=frames.entries().next().value;frames.delete(id);callback(100);
assert.equal(Number(element('#timeline').value),52);assert.equal(frames.size,0,'Playback must stop, not loop');
assert.equal(element('#play').textContent,'Play study');
const requiredLabels=['Available','Attending','Abstract face','Focused work','Holding a concern','Waiting for a choice','Correction / rethink','Resolution','Urgent','Disconnected','Rest'];
requiredLabels.forEach((label,i)=>{choose(i);assert.ok(element('#state').textContent.startsWith(label),label);});
vm.runInContext('elapsed=44;paint()',context);const offline44=canvas.toBuffer('image/png');
vm.runInContext('elapsed=46;paint()',context);assert.ok(offline44.equals(canvas.toBuffer('image/png')),'Disconnected light must remain still');
if(process.argv.includes('--preview')){
  const sharp=require(process.env.BRIAR_SHARP_MODULE||'sharp');
  (async()=>{
    const cards=await Promise.all(images.map(async(im,i)=>({input:await sharp(im.buffer).resize(400,400).png().toBuffer(),left:20+i*420,top:95})));
    const labelSvg=Buffer.from(`<svg width="1700" height="560" xmlns="http://www.w3.org/2000/svg"><rect width="1700" height="560" fill="#07101a"/><g fill="#cfe7fc" font-family="DejaVu Sans" font-size="21"><text x="35" y="43">Briar / motion study 03 v2 — still frames, all events simulated</text>${images.map((im,i)=>`<text x="${35+i*420}" y="535">${im.label}</text>`).join('')}</g></svg>`);
    await sharp(labelSvg).composite(cards).png().toFile(path.join(__dirname,'preview.png'));
    console.log('Saved four offline-rendered still frames.');
  })().catch(error=>{console.error(error);process.exitCode=1;});
}
console.log('PASS: initial still, all 11 chapter labels/selection, reduced motion, timeline, restart, hidden pause, end-of-study stop and pixel-identical disconnected stillness.');
console.log('These are offline checks; real-browser layout, playback and accessibility remain unverified.');
