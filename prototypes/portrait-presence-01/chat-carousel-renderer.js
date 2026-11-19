/* Original Briar light material; aggregate synthetic chats, geometric morphs and
 * event-coloured perimeter bar. GPL-3.0-or-later. Assisted-by: Briar. */
(() => {
  'use strict';
  const model=window.briarChatDemo;
  const anchors=[0,4,9,14,20,25,30,35.5,40,44.5,35.5,50];
  const originalPoint=point,sourceRender=window.render;
  const groupChat=[0,1,2,3,4,5,6,7,0];
  const targetAnchors=Array.from({length:12},(_,i)=>Array.from({length:12},(_,j)=>i===j?1:0));
  let weights=Array.from({length:9},()=>targetAnchors[11].slice()),from=weights.map(w=>w.slice()),target=11,changedAt=0,lastTime=0,barAngle=0,barSpeed=.35;
  let colors=Array.from({length:9},()=>[100,196,250]),barColor=[105,161,197],paintWeights=weights,painting=false;
  const lastPage=model.carousel(model.snapshot(59.999),59.999);
  const rows=lastPage.rows.map(chat=>({id:chat.id,chat,old:null,at:0}));
  let transitionRank=null;
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  const mix=(a,b,t)=>a+(b-a)*t;
  const project=p=>[16+(330+p.x-145)*288/370,42+(321+p.y-81)*374/480];
  // Integrate the event-dependent speed once, then close the path at 60 seconds
  // so the looping fixture does not jump the bar back to its initial angle.
  const phasePath=[0];let pathSpeed=.35,pathAngle=0;
  for(let i=1;i<=480;i++){
    const o=model.snapshot((i-.5)/8).overall;
    const wanted=o.unknown?.28:o.urgent?1.35:o.decisions?.6:o.active?.8:.35;
    pathSpeed=mix(pathSpeed,wanted,1-Math.exp(-.125/.25));pathAngle+=pathSpeed/8;phasePath.push(pathAngle);
  }
  const phaseScale=Math.PI*2*Math.max(1,Math.round(pathAngle/(Math.PI*2)))/pathAngle;
  point=function(p,t,still){
    if(!painting)return originalPoint(p,t,still);
    const result={x:0,y:0,cx:0,cy:0,sx:0,sy:0};
    for(let i=0;i<12;i++)if(paintWeights[p.group][i]>.00001){
      const q=originalPoint(p,anchors[i],true),w=paintWeights[p.group][i];
      for(const key of Object.keys(result))result[key]+=q[key]*w;
    }
    return result;
  };
  function ink(chat){return !chat.fresh?[116,132,145]:chat.urgent&&chat.concern?[255,115,134]:chat.concern?[255,188,95]:chat.nextActor==='Alex'?[190,173,250]:chat.state==='waiting'?[111,167,187]:[100,196,250];}
  function pointNow(p){painting=true;const q=point(p,0,true);painting=false;return q;}
  function render(sample){
    const dt=sample===0?0:sample-lastTime;lastTime=sample;
    const state=model.snapshot(sample),overall=state.overall,page=model.carousel(state,sample);
    if(overall.mode!==target){from=weights.map(w=>w.slice());target=overall.mode;changedAt=sample;transitionRank=null;}
    const centersBefore=Array.from({length:9},(_,group)=>project(pointNow({group,gx:0,gy:0,depth:1,phase:0})));
    const order=Array.from({length:9},(_,i)=>i).sort((a,b)=>(centersBefore[a][0]-160)**2+(centersBefore[a][1]-229)**2-(centersBefore[b][0]-160)**2-(centersBefore[b][1]-229)**2);
    if(!transitionRank)transitionRank=new Map(order.map((g,i)=>[g,i]));
    const rank=transitionRank;
    if(!overall.unknown){
      weights=from.map((w,g)=>{const a=smooth((sample-changedAt-rank.get(g)*.09)/.8);return w.map((v,i)=>mix(v,targetAnchors[target][i],a));});
    } // On silence freeze geometry; only fade its appearance to neutral unknown.
    paintWeights=weights;
    painting=true;const previousElapsed=elapsed;elapsed=0;sourceRender();elapsed=previousElapsed;painting=false;
    const source=document.getElementById('face'),canvas=document.createElement('canvas');canvas.width=320;canvas.height=480;
    const g=canvas.getContext('2d');g.fillStyle='#030912';g.fillRect(0,0,320,480);
    g.drawImage(source,source.width*145/660,source.height*81/660,source.width*370/660,source.height*480/660,16,42,288,374);
    const centers=Array.from({length:9},(_,group)=>project(pointNow({group,gx:0,gy:0,depth:1,phase:0})));
    const factor=dt?1-Math.exp(-dt/0.25):0;
    for(let group=0;group<9;group++)colors[group]=colors[group].map((v,i)=>{const goal=ink(state.chats[groupChat[group]])[i],value=mix(v,goal,factor);return Math.abs(value-goal)<.05?goal:value;});
    const image=g.getImageData(0,42,320,374),tileColors=[];
    for(let ty=0;ty<47;ty++)for(let tx=0;tx<40;tx++){
      let total=0;const color=[0,0,0];
      for(let i=0;i<9;i++){
        const distance=(tx*8+4-centers[i][0])**2+(ty*8+46-centers[i][1])**2;
        const weight=1/(distance+100)**2;total+=weight;
        for(let c=0;c<3;c++)color[c]+=colors[i][c]*weight;
      }
      tileColors.push(color.map(v=>v/total));
    }
    for(let y=0;y<374;y++)for(let x=0;x<320;x++){
      const offset=(y*320+x)*4,tx=Math.floor(x/8),ty=Math.floor(y/8),fx=(x%8)/8,fy=(y%8)/8;
      const c00=tileColors[ty*40+tx],c10=tileColors[ty*40+Math.min(39,tx+1)],c01=tileColors[Math.min(46,ty+1)*40+tx],c11=tileColors[Math.min(46,ty+1)*40+Math.min(39,tx+1)];
      const r=image.data[offset],green=image.data[offset+1],b=image.data[offset+2];
      const saturation=b>r*1.15?Math.min(1,(b-r)/Math.max(b,1))*smooth((b-24)/48):0;
      const base=[r,green,b];
      for(let i=0;i<3;i++){
        const color=mix(mix(c00[i],c10[i],fx),mix(c01[i],c11[i],fx),fy);
        const tinted=mix(base[i],b*color/250,saturation);
        image.data[offset+i]=Math.min(255,Math.round(Math.pow(tinted/255,.72)*255*1.12));
      }
    }
    g.putImageData(image,0,42);
    // Per-chat foreground motion. The aggregate face never receives page.rows.
    if(!overall.unknown){
      g.save();g.beginPath();g.ellipse(160,229,131.5,175.3,0,0,Math.PI*2);g.clip();
      const count=new Array(9).fill(0);
      for(const p of dots){
        const chat=state.chats[groupChat[p.group]];
        if(!chat.fresh||p.fine||p.phase<4.8||count[p.group]>=3||['done','queued','ready'].includes(chat.state))continue;
        count[p.group]++;
        const [bx,by]=project(pointNow(p));
        const waiting=['waiting','decision','blocked'].includes(chat.state),rate=waiting?.27:chat.state==='revising'?1.1:1.3,radius=waiting?3:chat.state==='revising'?12:9;
        const angle=sample*rate*(groupChat[p.group]%2?-1:1)+p.phase;
        const c=ink(chat).join(','),x=bx+Math.sin(angle)*radius,y=by+Math.cos(angle*.85)*radius*.7;
        for(let tail=3;tail>=0;tail--){const a=angle-tail*.14;g.fillStyle='rgba('+c+','+(.92-tail*.2)+')';g.beginPath();g.arc(bx+Math.sin(a)*radius,by+Math.cos(a*.85)*radius*.7,tail?1.1:1.7,0,Math.PI*2);g.fill();}
        const halo=g.createRadialGradient(x,y,0,x,y,5);halo.addColorStop(0,'rgba('+c+',.4)');halo.addColorStop(1,'rgba('+c+',0)');g.fillStyle=halo;g.fillRect(x-5,y-5,10,10);
      }
      const face=smooth((sample-6)/.9)*(1-smooth((sample-11)/1));
      if(face&&!overall.urgent)for(const group of [0,1,4,5])for(let n=0;n<7;n++){
        const [cx,cy]=centers[group],f=n/6;g.fillStyle='rgba(190,236,255,'+(face*.65)+')';g.beginPath();g.arc(cx+(f-.5)*24,cy-Math.sin(f*Math.PI)*4+Math.sin(sample+group)*2,1.2,0,Math.PI*2);g.fill();
      }
      g.restore();
    }
    // The circumference bar is an event/display cue, not proof of live thinking.
    const wanted=overall.unknown?[142,160,175]:overall.urgent?[255,105,129]:overall.decisions?[255,190,95]:overall.concerns?[238,177,110]:overall.active?[105,205,255]:[105,161,197];
    const speed=overall.unknown?.28:overall.urgent?1.35:overall.decisions?.6:overall.active?.8:.35;
    barSpeed=mix(barSpeed,speed,factor);barColor=barColor.map((v,i)=>mix(v,wanted[i],factor));barAngle=phasePath[Math.round(sample*8)]*phaseScale;
    g.lineWidth=3.5;g.lineCap='round';
    for(let segment=0;segment<24;segment++){
      g.strokeStyle='rgba('+barColor.map(Math.round).join(',')+','+(.12+.86*segment/24)+')';g.beginPath();g.ellipse(160,229,139,183,0,barAngle-.7+segment*.7/24,barAngle-.7+(segment+1)*.7/24);g.stroke();
    }
    g.fillStyle='#ecf7ff';g.font='20px system-ui';g.fillText('Briar',18,29);
    g.font='10px system-ui';g.fillStyle='#bcd9ea';g.fillText('SYNTHETIC · 8 DEMO CHATS',156,27,148);
    const title=overall.unknown?'Unknown':overall.urgent?'Urgent concern':overall.concerns?'Mixed work':overall.decisions?'Waiting for you':overall.active?'Working':'Rest';
    g.font='12px system-ui';g.fillStyle='#e6f3ff';g.fillText(overall.unknown?'Unknown · idle bar · !'+overall.concerns:title+' · '+overall.active+' active · !'+overall.concerns,18,426,190);
    const positions=page.rowPositions[1]===page.rowPositions[0]+1?page.rowPositions.join('–'):page.rowPositions.join(',');
    g.font='10px system-ui';g.fillStyle='#bcd9ea';g.fillText(page.pinnedId?'Pinned + '+page.position+'/'+page.rotationTotal:positions+'/'+page.total,218,426,88);
    function drawRow(chat,y){
      const color=chat.urgent&&chat.concern?'#ff8b9b':chat.concern?'#ffc16b':!chat.fresh?'#9bb0bd':chat.nextActor==='Alex'?'#c4afff':'#90ddff';
      g.fillStyle=color;g.beginPath();g.arc(21,y-4,chat.concern?3:2,0,Math.PI*2);g.fill();
      g.font='11px system-ui';g.fillStyle='#e6f3ff';g.fillText(chat.title,30,y,104);
      const actor=chat.nextActor==='Alex'?'you':chat.nextActor==='none'||chat.nextActor==='unknown'?'—':chat.nextActor;
      g.fillStyle=color;g.fillText((chat.concern?'! ':'')+chat.state+' · '+actor,140,y,165);
    }
    page.rows.forEach((chat,i)=>{
      const row=rows[i],y=447+i*18;
      if(row.id!==chat.id){row.old=row.chat||null;row.id=chat.id;row.at=sample;}
      row.chat=chat;const a=smooth((sample-row.at)/.35);
      g.save();g.beginPath();g.rect(15,y-13,292,17);g.clip();
      if(row.old&&a<1)drawRow(row.old,y-a*18);
      drawRow(chat,y+(row.old?1-a:0)*18);g.restore();
    });
    return {png:canvas.toDataURL('image/png').split(',')[1],scene:title,clusters:centers,streams:state.chats,overall,page:{...page,rows:page.rows.map(c=>c.id)},transitioning:!overall.unknown&&sample-changedAt<1.6,sourceFresh:!overall.unknown,bar:{color:barColor,speed:barSpeed*phaseScale,angle:barAngle},weights};
  }
  window.briarChatCarousel={render};
})();
