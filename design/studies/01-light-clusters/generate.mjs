// Original static concept art. This is not a live face renderer or harness client.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const out = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const svgOnly = process.argv.includes('--svg-only');
const sharp = svgOnly ? null : require(process.env.BRIAR_SHARP_MODULE || 'sharp');
const directions = [
  { key:'a', name:'Cloudlets', sub:'Soft luminous pockets. Intimate, diffuse, deep.', count:100, spread:1.25, radius:.58, haze:.54 },
  { key:'b', name:'Constellations', sub:'Distinct groups. Individual lights. Deliberate dark gaps.', count:66, spread:.78, radius:.78, haze:.2 },
  { key:'c', name:'Granular light', sub:'Fine, dense fragments. Irregular clouds of light.', count:190, spread:1.1, radius:.30, haze:.31 }
];
const states = [
  { title:'Attending', subtitle:'Gathering towards the conversation', note:'Shared focus, without fixed eyes or a mouth.' },
  { title:'Focused work', subtitle:'Several groups become more coherent', note:'Purposeful formation, not a progress indicator.' },
  { title:'Holding a concern', subtitle:'A local amber change within blue', note:'Something to examine together, not an alarm.' }
];
const palettes = ['#4799ee','#64baff','#90d6ff','#c5eeff','#e9f9ff'];
const amber = ['#b66a24','#eea449','#ffd28b','#fff0c5'];
function rng(seed) {
  let n=seed>>>0;
  return ()=>{ n=(Math.imul(n,1664525)+1013904223)>>>0; return (n+.5)/4294967296; };
}
function gaussian(r) { return Math.sqrt(-2*Math.log(r()))*Math.cos(2*Math.PI*r()); }
const num=x=>x.toFixed(2);
function circle(x,y,r,fill,opacity=1) {
  return `<circle cx="${num(x)}" cy="${num(y)}" r="${num(r)}" fill="${fill}" opacity="${num(opacity)}"/>`;
}
function definitions() {
  return `<defs>
  <radialGradient id="bg"><stop stop-color="#12283b"/><stop offset="1" stop-color="#050a12"/></radialGradient>
  <linearGradient id="card" x2=".85" y2="1"><stop stop-color="#101e2d"/><stop offset="1" stop-color="#080f19"/></linearGradient>
  <linearGradient id="rim" x2=".8" y2="1"><stop stop-color="#526679"/><stop offset=".28" stop-color="#1a2a3a"/><stop offset=".65" stop-color="#0a111c"/><stop offset="1" stop-color="#334a60"/></linearGradient>
  <radialGradient id="glass" cx=".4" cy=".3" r=".8"><stop stop-color="#0c1d2c"/><stop offset=".7" stop-color="#020812"/><stop offset="1" stop-color="#01040a"/></radialGradient>
  <radialGradient id="blue"><stop stop-color="#54b5ff" stop-opacity=".8"/><stop offset=".4" stop-color="#267dbe" stop-opacity=".3"/><stop offset="1" stop-color="#1474a9" stop-opacity="0"/></radialGradient>
  <radialGradient id="amber"><stop stop-color="#ffd48a" stop-opacity=".8"/><stop offset=".35" stop-color="#e7983e" stop-opacity=".35"/><stop offset="1" stop-color="#a65b24" stop-opacity="0"/></radialGradient>
  <linearGradient id="sheen" x2=".6" y2="1"><stop stop-color="#d6eeff" stop-opacity=".12"/><stop offset=".55" stop-color="#a8cced" stop-opacity=".015"/><stop offset="1" stop-color="#a8cced" stop-opacity="0"/></linearGradient>
  <clipPath id="face"><ellipse rx="100" ry="135"/></clipPath>
  </defs>`;
}
function face(direction,state,cx,cy,scale,seed) {
  const r=rng(seed);
  let centers;
  if(state===0) centers=[[-16,-36,12,16],[12,-7,16,14],[-24,18,13,14],[3,42,11,15],[-43,61,9,12],[41,-59,10,12],[-20,-83,8,11],[43,55,8,10]];
  else centers=[[-43,-69,11,13],[5,-80,14,12],[35,-44,11,17],[-17,-22,16,15],[-48,13,11,16],[13,22,14,12],[-13,62,13,16],[42,63,10,14],[5,97,8,8]];
  if(direction.key==='c') centers=centers.concat([[-62,-35,7,13],[56,5,9,17],[-48,89,8,9]]);
  const bits=[];
  bits.push(`<g transform="translate(${cx} ${cy}) scale(${scale})">`);
  bits.push('<ellipse cy="7" rx="110" ry="145" fill="#000" opacity=".35"/>');
  bits.push('<ellipse rx="106" ry="141" fill="url(#rim)" stroke="#34485c" stroke-width=".6"/>');
  bits.push('<ellipse rx="102" ry="137" fill="#01040a"/><ellipse rx="100" ry="135" fill="url(#glass)"/>');
  bits.push('<g clip-path="url(#face)">');
  for(let i=0;i<130;i++) {
    const a=r()*Math.PI*2,rad=Math.sqrt(r());
    bits.push(circle(Math.cos(a)*rad*99,Math.sin(a)*rad*133,.1+r()*.24,'#7ba5c4',.12+r()*.25));
  }
  centers.forEach(([x,y,sx,sy],index)=>{
    x+=gaussian(r)*3; y+=gaussian(r)*3;
    const isConcern=state===2&&(index===7||index===5);
    const colors=isConcern?amber:palettes;
    const spread=direction.spread;
    bits.push(`<ellipse cx="${num(x)}" cy="${num(y)}" rx="${num(sx*3.6*spread)}" ry="${num(sy*3.6*spread)}" fill="url(#${isConcern?'amber':'blue'})" opacity="${direction.haze}"/>`);
    for(let i=0;i<direction.count;i++) {
      const gx=gaussian(r),gy=gaussian(r);
      const px=x+gx*sx*spread,py=y+gy*sy*spread;
      const distance=Math.sqrt(gx*gx+gy*gy);
      const opacity=Math.max(.08,.88-distance*.16)*(state===0?.85:1);
      let radius=(.22+r()*.95)*direction.radius;
      if(i%29===0) radius*=1.6;
      const pick=Math.min(colors.length-1,Math.floor(r()*colors.length));
      const color=colors[pick];
      if(i%11===0) {
        bits.push(circle(px,py,radius*5,color,opacity*.045));
        bits.push(circle(px,py,radius*2.3,color,opacity*.13));
      }
      bits.push(circle(px,py,radius,color,opacity));
      if(i%37===0) bits.push(circle(px,py,radius*.4,'#f1fbff',opacity*.9));
    }
  });
  bits.push('<path d="M-85,-72 C-75,-115 -25,-141 21,-126 C-31,-108 -64,-67 -73,-8 C-88,-28 -94,-54 -85,-72Z" fill="url(#sheen)"/>');
  bits.push('</g><path d="M-67,-111 Q-20,-142 31,-129" fill="none" stroke="#adcde5" stroke-opacity=".2" stroke-width=".6"/>');
  bits.push('<path d="M72,104 Q94,79 100,47" fill="none" stroke="#769fbd" stroke-opacity=".12" stroke-width=".5"/></g>');
  return bits.join('');
}
function start(width,height,title,subtitle) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${definitions()}<rect width="${width}" height="${height}" fill="url(#bg)"/>
  <g font-family="DejaVu Sans, sans-serif"><text x="62" y="49" fill="#82acc5" font-size="12" letter-spacing="3">BRIAR / LIGHT STUDIES / ROUND 01</text>
  <text x="62" y="102" fill="#edf6ff" font-size="36" font-weight="bold">${title}</text>
  <text x="62" y="138" fill="#96adc2" font-size="16">${subtitle}</text>`;
}
function finish(width,height) {
  return `<path d="M62,${height-80} H${width-62}" stroke="#25364a"/>
  <text x="62" y="${height-49}" fill="#96adc2" font-size="13">Original still concepts · no lines, no live status · labels describe intended meaning, not tested recognition.</text>
  <text x="62" y="${height-24}" fill="#647e98" font-size="11">Laptop first. Desk device, VR and other harness users are future design considerations.</text>
  <text x="${width-62}" y="${height-24}" text-anchor="end" fill="#647e98" font-size="11">Briar · 10 November 2026</text></g></svg>`;
}
async function save(name,svg) {
  await writeFile(join(out,name+'.svg'),svg);
  if(sharp) await sharp(Buffer.from(svg)).png().toFile(join(out,name+'.png'));
}
for(let d=0;d<directions.length;d++) {
  const direction=directions[d];
  let svg=start(1800,850,`${direction.key.toUpperCase()} / ${direction.name}`,direction.sub);
  for(let state=0;state<3;state++) {
    const x=62+state*566;
    svg+=`<rect x="${x}" y="176" width="544" height="574" rx="18" fill="url(#card)" stroke="#293c50"/>`;
    svg+=`<text x="${x+26}" y="213" fill="${state===2?'#e6ba7e':'#86b9d7'}" font-size="12" letter-spacing="2">${states[state].title.toUpperCase()}</text>`;
    svg+=face(direction,state,x+272,444,1.42,20261110+d*100+state);
    svg+=`<text x="${x+26}" y="686" fill="#dcecff" font-size="19">${states[state].subtitle}</text>`;
    svg+=`<text x="${x+26}" y="718" fill="#91a8c0" font-size="13">${states[state].note}</text>`;
  }
  await save('direction-'+direction.key,svg+finish(1800,850));
}
let overview=start(1800,1790,'Which grouping of light feels like Briar?','Three materials. The same face, three expressions. Choose the character before we animate it.');
const colNames=['ATTENDING','FOCUSED WORK','HOLDING A CONCERN'];
for(let s=0;s<3;s++) overview+=`<text x="${480+s*495}" y="194" text-anchor="middle" fill="${s===2?'#e6ba7e':'#9cc0d9'}" font-size="13" letter-spacing="2">${colNames[s]}</text>`;
for(let d=0;d<3;d++) {
  const y=220+d*481;
  overview+=`<rect x="62" y="${y}" width="1676" height="457" rx="18" fill="url(#card)" stroke="#26394e"/>`;
  overview+=`<text x="89" y="${y+48}" fill="#83acc7" font-size="13" letter-spacing="2">${directions[d].key.toUpperCase()}</text>`;
  overview+=`<text x="89" y="${y+85}" fill="#e1efff" font-size="20">${directions[d].name}</text>`;
  const short=[['Soft pockets.','Diffuse depth.'],['Distinct groups.','Dark intervals.'],['Fine particles.','Dense fragments.']][d];
  short.forEach((line,i)=>overview+=`<text x="89" y="${y+123+i*23}" fill="#8da6bf" font-size="13">${line}</text>`);
  for(let s=0;s<3;s++) overview+=face(directions[d],s,480+s*495,y+224,1.4,20261110+d*100+s);
}
await save('overview',overview+finish(1800,1790));
console.log(svgOnly?'Generated four SVG concept sheets.':'Generated four SVG and four PNG concept sheets.');
