/* Original Briar motion source remains unchanged. This derivative adds the
 * selected smoother transitions, mode cues, two fictional work streams and
 * transient abstract features. Source material: Matthieu Houdebine is credited
 * for the USB protocol elsewhere; the face material is Briar Presence's original
 * GPL-3.0-or-later study. No live data or network access. Assisted-by: Briar.
 */
(() => {
  'use strict';
  const width=320,height=480,art={x:16,y:42,w:288,h:374};
  const starts=[0,2,7,12,17,23,28,33,38,43,52,55];
  const anchors=[0,4,9,14,20,25,30,35.5,40,44.5,35.5,50];
  const titles=['Available','Attending','Abstract face','Focused work','Holding a concern','Waiting for a choice','Correction / rethink','Resolution','Urgent','Disconnected','Simulated resolution','Rest'];
  const streamGroup=[0,0,1,0,0,1,0,1,1];
  const cached=new Map(),masks=new Map();
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  const project=p=>[art.x+(330+p.x-145)*art.w/370,art.y+(321+p.y-81)*art.h/480];
  function base(index){
    if(cached.has(index))return cached.get(index);
    const slider=document.getElementById('timeline');slider.value=anchors[index];slider.dispatchEvent(new Event('input'));
    const image=document.createElement('canvas');image.width=width;image.height=height;
    const g=image.getContext('2d');g.fillStyle='#030912';g.fillRect(0,0,width,height);
    const source=document.getElementById('face');
    g.drawImage(source,source.width*145/660,source.height*81/660,source.width*370/660,source.height*480/660,art.x,art.y,art.w,art.h);
    const pixels=g.getImageData(0,art.y,width,art.h);
    for(let n=0;n<pixels.data.length;n+=4)for(let c=0;c<3;c++)pixels.data[n+c]=Math.min(255,Math.round(Math.pow(pixels.data[n+c]/255,.72)*255*1.12));
    g.putImageData(pixels,0,art.y);
    const centers=Array.from({length:9},(_,group)=>project(point({group,gx:0,gy:0,depth:1,phase:0},anchors[index],true)));
    const data=g.getImageData(0,art.y,width,art.h);
    const result={image,data,centers};cached.set(index,result);return result;
  }
  function transitionMask(previous,current){
    const key=previous+':'+current;if(masks.has(key))return masks.get(key);
    const old=base(previous),next=base(current);
    const centers=old.centers.map((p,i)=>p.map((v,c)=>lerp(v,next.centers[i][c],.5)));
    const mask=new Uint8Array(width*art.h);
    for(let y=0;y<art.h;y++)for(let x=0;x<width;x++){
      let best=0,distance=Infinity;
      for(let i=0;i<9;i++){
        const d=(x-centers[i][0])**2+(y+art.y-centers[i][1])**2;
        if(d<distance){distance=d;best=i;}
      }
      mask[y*width+x]=best;
    }
    masks.set(key,mask);return mask;
  }
  function streams(index){
    const rows=[['ready','ready'],['attending','queued'],['interaction','waiting'],['working','working'],['working','decision needed'],['waiting for you','concern open'],['revising','concern open'],['working','resolved'],['working','blocked'],['unknown','unknown'],['ready','resolved'],['rest','rest']][index];
    const concern=index>=4&&index<=6||index===8||index===9;
    return [
      {id:'orchard',name:'Orchard',shape:'circle',state:rows[0],fresh:index!==9,concern:false},
      {id:'beacon',name:'Beacon',shape:'diamond',state:rows[1],fresh:index!==9,concern,urgent:index===8||index===9}
    ];
  }
  function marker(g,x,y,shape,color,size=3){
    g.fillStyle=color;g.beginPath();
    if(shape==='diamond'){g.moveTo(x,y-size);g.lineTo(x+size,y);g.lineTo(x,y+size);g.lineTo(x-size,y);g.closePath();}
    else g.arc(x,y,size,0,Math.PI*2);
    g.fill();
  }
  function render(sample){
    let index=starts.length-1;while(index>0&&sample<starts[index])index--;
    const local=sample-starts[index],previous=(index+starts.length-1)%starts.length;
    const old=base(previous),next=base(index);
    const order=next.centers.map((p,i)=>i).sort((a,b)=>(next.centers[a][0]-160)**2+(next.centers[a][1]-229)**2-(next.centers[b][0]-160)**2-(next.centers[b][1]-229)**2);
    const rank=new Map(order.map((group,i)=>[group,i]));
    // Centre-first group fades, not a screen-wide top-to-bottom wipe. Unknown
    // data changes immediately to its fixed grey snapshot; it never morphs as work.
    const amounts=Array.from({length:9},(_,group)=>index===9?1:smooth((local-rank.get(group)*.14)/.25));
    const centers=next.centers.map((p,i)=>p.map((v,c)=>lerp(old.centers[i][c],v,amounts[i])));
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const g=canvas.getContext('2d');g.drawImage(next.image,0,0);
    const transitioning=amounts.some(v=>v<1);
    if(transitioning){
      const mask=transitionMask(previous,index),pixels=g.createImageData(width,art.h);
      for(let p=0;p<mask.length;p++){
        const a=amounts[mask[p]],offset=p*4;
        for(let c=0;c<3;c++)pixels.data[offset+c]=Math.round(lerp(old.data.data[offset+c],next.data.data[offset+c],a));
        pixels.data[offset+3]=255;
      }
      g.putImageData(pixels,0,art.y);
    }
    const work=streams(index),perGroup=new Array(9).fill(0);
    if(index!==9){
      g.save();g.beginPath();g.ellipse(160,229,131.5,175.3,0,0,Math.PI*2);g.clip();
      for(const p of dots){
        if(p.fine||p.phase<4.8||perGroup[p.group]>=3)continue;
        const slot=perGroup[p.group]++,s=work[streamGroup[p.group]];
        const before=project(point(p,anchors[previous],true)),after=project(point(p,anchors[index],true));
        const bx=lerp(before[0],after[0],amounts[p.group]),by=lerp(before[1],after[1],amounts[p.group]);
        const radius=[10,9,4,13,7,4,15,8,4,0,8,6][index]*(s.concern?.65:1);
        const rate=[.6,1,.65,1.3,.7,.32,1.05,.7,.4,0,.7,.4][index]*(s.concern?.45:1);
        const direction=index===6?(p.group%2?-1:1):s.id==='orchard'?1:-1;
        const a=sample*rate*direction+p.phase;
        const trajectory=theta=>{
          let x=bx+Math.sin(theta)*radius,y=by+Math.cos(theta*.8)*radius*.7;
          if(index===1){const gather=(Math.sin(theta)+1)/2;x=lerp(bx,centers[p.group][0],gather*.6);y=lerp(by,centers[p.group][1],gather*.6);}
          if(index===3){x=bx+Math.sin(theta)*radius;y=by+Math.cos(theta)*radius*.45;}
          if(index===5){x=bx+Math.sin(theta)*3;y=by+Math.cos(theta)*2;}
          return [x,y];
        };
        const [x,y]=trajectory(a);
        const color=s.urgent?'255,135,149':s.concern?'255,190,99':s.id==='orchard'?'144,221,255':'110,232,231';
        // Distinct bead/diamond shapes and stable named rows back up colour.
        for(let tail=3;tail>=1;tail--){
          const past=a-tail*.14*direction;
          const [tx,ty]=trajectory(past);
          marker(g,tx,ty,s.shape,'rgba('+color+','+(.43-tail*.09)+')',1.4-tail*.12);
        }
        const halo=g.createRadialGradient(x,y,0,x,y,5);halo.addColorStop(0,'rgba('+color+',.48)');halo.addColorStop(1,'rgba('+color+',0)');
        g.fillStyle=halo;g.fillRect(x-5,y-5,10,10);marker(g,x,y,s.shape,'rgba('+color+',.95)',slot===0?1.9:1.5);
      }
      // Broken brows and cheek arcs gather briefly, asymmetrically, then dissolve.
      // There are no pupils, literal eyes or a permanent drawn mouth.
      const facial=smooth((sample-6.8)/.8)*(1-smooth((sample-10.5)/1.2));
      if(facial>0){
        for(const group of [0,1,4,5])for(let n=0;n<7;n++){
          const [cx,cy]=centers[group],f=n/6;
          const brow=group<2;
          const x=cx+(f-.5)*(brow?28:15);
          const y=cy+(brow?-Math.sin(f*Math.PI)*4:Math.sin(f*Math.PI)*5)+Math.sin(sample*.8+group)*(group===0?3:1.3);
          g.fillStyle='rgba(188,235,255,'+(facial*(.35+.45*Math.sin((f*.7+.15)*Math.PI)))+')';
          g.beginPath();g.arc(x,y,n%2?1:1.5,0,Math.PI*2);g.fill();
        }
      }
      g.restore();
    }else{
      const a=sample*.35;
      for(let tail=3;tail>=0;tail--)marker(g,160+Math.sin(a-tail*.045)*139,229+Math.cos(a-tail*.045)*183,'circle','rgba(170,188,200,'+(.8-tail*.16)+')',tail?1.4:2.1);
    }
    g.fillStyle='#ecf7ff';g.font='20px system-ui';g.fillText('Briar',18,29);
    g.font='10px system-ui';g.fillStyle='#bcd9ea';g.fillText('SYNTHETIC · 2 WORK STREAMS',154,27,150);
    g.font=index===9?'12px system-ui':'14px system-ui';g.fillStyle='#e6f3ff';g.fillText(titles[index],18,431,284);
    if(index===9){g.font='10px system-ui';g.fillStyle='#bcd9ea';g.fillText('Display idle only; data unknown',112,431,190);}
    work.forEach((s,row)=>{
      const y=450+row*18,color=s.urgent?'#ff8b9b':s.concern?'#ffc16b':!s.fresh?'#9bb0bd':s.id==='orchard'?'#90ddff':'#6ee8e7';
      marker(g,21,y-4,s.shape,color,3);
      g.font='12px system-ui';g.fillStyle='#e6f3ff';g.fillText(s.name,32,y);
      g.fillStyle=color;g.fillText(s.state+(s.concern?' · ! concern':''),108,y,194);
    });
    return {png:canvas.toDataURL('image/png').split(',')[1],scene:titles[index],clusters:centers,streams:work,transitioning,index,sourceFresh:index!==9};
  }
  window.briarExpressive={render,starts,titles};
})();
