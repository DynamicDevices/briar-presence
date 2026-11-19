// Extracted from the accepted v6 visual prototype; no platform or I/O imports.
export const STATES=Object.freeze(['quiet','attending','working','concern','urgent','waiting','unknown']);
export function createPresence(initialSeed){
 if(!Number.isInteger(initialSeed)||initialSeed<0||initialSeed>4294967295)throw new TypeError('A uint32 random seed is required');
 let state='quiet',reducedMotion=false;
 function frozen(){return reducedMotion||state==='unknown'||state==='waiting';}
const TAU=Math.PI*2,lerp=(a,b,t)=>a+(b-a)*t,clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
const envelope=(t,a,b,c,d)=>ease((t-a)/(b-a))*(1-ease((t-c)/(d-c)));
let seed=initialSeed>>>0;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return(seed+.5)/4294967296;}function normal(){return Math.sqrt(-2*Math.log(random()))*Math.cos(TAU*random());}
const clouds=[[-.43,-.59,.13,.16],[-.04,-.77,.13,.13],[.35,-.43,.12,.17],[-.19,-.17,.18,.16],[-.48,.17,.12,.17],[.12,.20,.15,.13],[-.13,.61,.14,.16],[.43,.61,.10,.14],[.03,.89,.09,.10]];
const abstract=[[-.31,-.33,.19,.045],[.18,-.36,.15,.04],[.40,-.12,.07,.13],[-.04,-.03,.045,.13],[-.37,.17,.12,.11],[.27,.19,.11,.10],[-.17,.44,.12,.045],[.14,.43,.10,.04],[.01,.65,.11,.06]];
const points=[];for(let group=0;group<9;group++)for(let n=0;n<130;n++)points.push({group,x:normal(),y:normal(),r:.35+random()*.85,a:.25+random()*.65,phase:random()*TAU,white:random()>.88,key:random()*10000,speed:.35+random()*.55,travel:.65+random()*.75});
// Smooth random waypoints: each light follows its own path, without frame noise.
function wander(t,key){
 const cell=Math.floor(t),u=ease(t-cell);
 const value=n=>{const v=Math.sin(n*127.1+key*311.7)*43758.5453;return(v-Math.floor(v))*2-1;};
 return lerp(value(cell),value(cell+1),u);
}
function particlePosition(p,c,t,move,face){
 const freedom=move*(1-face*.65),q=t*p.speed;
 const dx=(wander(q,p.key)*.075+wander(q*.47,p.key+17)*.055)*p.travel*freedom;
 const dy=(wander(q*.83,p.key+41)*.075+wander(q*.39,p.key+73)*.055)*p.travel*freedom;
 return[(c[0]+p.x*c[2]+dx)*120,(c[1]+p.y*c[3]+dy)*165];
}
const motion=clouds.map(()=>({phase:random()*TAU,speed:.55+random()*.35,spread:.11+random()*.04}));
const gatherings=[{start:1.5,duration:8+random()*3,strength:.8+random()*.15}];
function faceBlend(t){
 let last=gatherings[gatherings.length-1];
 while(t>last.start+last.duration){last={start:last.start+last.duration+4+random()*7,duration:7+random()*5,strength:.7+random()*.25};gatherings.push(last);}
 const gathering=gatherings.find(g=>t<=g.start+g.duration);
 const u=(t-gathering.start)/gathering.duration;
 return envelope(u,0,.32,.58,1)*gathering.strength;
}
function layout(group,t,face=0){
 const c=clouds[group].map((v,i)=>lerp(v,abstract[group][i],face));
 if(!frozen()){
  const m=motion[group],p=t*m.speed+m.phase;
  c[0]+=m.spread*(Math.sin(p)+.35*Math.sin(p*.71+m.phase));
  c[1]+=m.spread*(Math.cos(p*.83)+.3*Math.sin(p*1.17));
  c[0]+=.035*wander(t*.31,m.phase+100);
  c[1]+=.035*wander(t*.27,m.phase+200);
  c[2]*=1+.18*wander(t*.3,m.phase+300);c[3]*=1+.15*wander(t*.37,m.phase+400);
 }
 if(state==='attending'){c[0]*=.78;c[1]*=.86;}
 if(state==='urgent'){c[0]*=.80;c[1]*=.82;c[2]*=.8;c[3]*=.8;}
 if(state==='working'){c[0]+=.04*Math.sin(t*.19+group);c[1]+=.025*Math.cos(t*.15+group);}
 return c;
}
function tint(group,white=false){
 let rgb=white?[203,236,255]:[87,181,250];
 if(state==='concern'&&(group===5||group===7))rgb=white?[255,230,177]:[240,174,78];
 if(state==='urgent')rgb=white?[255,179,190]:[245,84,110];
 if(state==='unknown')rgb=[105,113,123];
 return rgb;
}

 return Object.freeze({sample(input){
  if(!input||!Number.isFinite(input.time)||input.time<0||!STATES.includes(input.state)||typeof input.reducedMotion!=='boolean')throw new TypeError('Invalid presence sample');
  state=input.state;reducedMotion=input.reducedMotion;
  const t=frozen()?0:input.time,face=frozen()?0:faceBlend(t),dim=state==='unknown'?.25:1;
  const positions=clouds.map((_,group)=>layout(group,t,face));
  const glows=positions.map((c,group)=>({x:(180+c[0]*120)/360,y:(224+c[1]*165)/460,rx:c[2]*120*3.5/360,ry:c[3]*165*3.5/460,color:tint(group),opacity:dim}));
  const lights=points.map(p=>{
   const [x,y]=particlePosition(p,positions[p.group],t,frozen()?0:1,face);
   const fade=clamp((172-Math.abs(x))/35)*clamp((210-Math.abs(y))/35);
   return{x:(180+x)/360,y:(224+y)/460,radius:p.r/360,color:tint(p.group,p.white),opacity:p.a*dim*fade,halo:p.phase>5.9};
  });
  return{version:1,aspect:360/460,state,time:input.time,glows,lights};
 }});
}
