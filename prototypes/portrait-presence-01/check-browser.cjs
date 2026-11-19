'use strict';
// Isolated headless browser, local fixture only; no user browser or USB access.
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const assert=require('node:assert/strict');
const binary=process.env.BRIAR_TEST_CHROMIUM||'/home/ajlennon/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const out=process.argv[2];
if(!out||!path.isAbsolute(out))throw Error('Supply an absolute screenshot output directory');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'briar-portrait-browser-'));
const browser=spawn(binary,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--remote-debugging-pipe','--user-data-dir='+profile],{stdio:['ignore','ignore','pipe','pipe','pipe']});
let id=0,buffer='',stderr='',session;
const pending=new Map(),listeners=new Map(),errors=[];
browser.stderr.on('data',b=>{stderr=(stderr+b).slice(-1500);});
browser.stdio[4].on('data',b=>{
  buffer+=b.toString();let n;
  while((n=buffer.indexOf('\0'))>=0){
    const message=JSON.parse(buffer.slice(0,n));buffer=buffer.slice(n+1);
    if(message.id&&pending.has(message.id)){const p=pending.get(message.id);pending.delete(message.id);message.error?p.reject(Error(JSON.stringify(message.error))):p.resolve(message.result);}
    else if(listeners.has(message.method)){const fn=listeners.get(message.method);listeners.delete(message.method);fn(message);}
    if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text);
  }
});
function send(method,params={},sid=session){return new Promise((resolve,reject)=>{const current=++id;pending.set(current,{resolve,reject});browser.stdio[3].write(JSON.stringify({id:current,method,params,...(sid?{sessionId:sid}:{})})+'\0');});}
const once=method=>new Promise(resolve=>listeners.set(method,resolve));
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
const select=s=>evaluate(`(()=>{const el=document.querySelector('select');el.value=${JSON.stringify(s)};el.dispatchEvent(new Event('change'));return document.getElementById('briar-portrait-study').briarStudy.getState();})()`);
const click=name=>evaluate(`document.querySelector('[data-bp="${name}"]').click()`);
const text=name=>evaluate(`document.querySelector('[data-bp="${name}"]').textContent`);
async function screenshot(name){const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(r.data,'base64'));}
const deadline=setTimeout(()=>{browser.kill('SIGTERM');console.error('Browser test timed out: '+stderr);process.exitCode=1;},process.argv.includes('--expressive')?90000:45000);
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const {targetId}=await send('Target.createTarget',{url:'about:blank'},null);
  session=(await send('Target.attachToTarget',{targetId,flatten:true},null)).sessionId;
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  // Block all network requests; fixture operation must be entirely local.
  await send('Network.setBlockedURLs',{urls:['http://*','https://*','ws://*','wss://*']});
  await send('Emulation.setDeviceMetricsOverride',{width:736,height:620,deviceScaleFactor:1,mobile:false});
  const loaded=once('Page.loadEventFired');
  const motionExport=process.argv[3]==='--export-motion';
  const source=motionExport?path.resolve(__dirname,'../../design/studies/03-motion/motion-study.html'):__dirname+'/index.html';
  await send('Page.navigate',{url:'file://'+source});await loaded;
  if(motionExport){
    const livelier=process.argv.includes('--livelier');
    const localMotion=process.argv.includes('--local-motion');
    const ongoing=process.argv.includes('--ongoing');
    const expressive=process.argv.includes('--expressive');
    const chatCarousel=process.argv.includes('--chat-carousel');
    if(chatCarousel&&!expressive)throw Error('--chat-carousel requires --expressive');
    if(ongoing&&!localMotion)throw Error('--ongoing requires --local-motion');
    if(expressive&&(!ongoing||!localMotion||livelier))throw Error('--expressive requires --ongoing --local-motion without --livelier');
    const exportFps=expressive?8:localMotion?4:2;
    if(chatCarousel){
      await evaluate(fs.readFileSync(__dirname+'/chat-demo-state.js','utf8'));
      await evaluate(fs.readFileSync(__dirname+'/chat-carousel-renderer.js','utf8'));
    }else if(expressive)await evaluate(fs.readFileSync(__dirname+'/expressive-renderer.js','utf8'));
    if(livelier)await evaluate(`(()=>{
      const original=point;
      point=function(p,t,still){
        const result=original(p,t,still);
        const offline=windowed(t,42,44,47,49);
        if(still||offline>.001)return result;
        const waiting=windowed(t,22,24,27,29);
        const facial=windowed(t,6,8.5,10,13);
        const work=windowed(t,12,15,21,24);
        const rethink=windowed(t,27,29,31,33);
        const urgent=windowed(t,37,39,41,43);
        const concern=windowed(t,17,20,32,36);
        const rest=t>=49?.35:1;
        const amplitude=(1-waiting)*(1-facial*.7)*(1-urgent*.85)*rest;
        const quietConcern=(p.group===5||p.group===7)?1-concern*.55:1;
        const radius=(9+work*4+rethink*7)*amplitude*quietConcern;
        const phase=t*(.7+work*.18)+p.group*1.7;
        const dx=Math.sin(phase)*radius;
        const dy=Math.cos(phase*.83+p.group*.4)*radius*.72;
        result.x+=dx+Math.sin(t*1.35+p.phase)*2.1*amplitude;
        result.y+=dy+Math.cos(t*1.15+p.phase)*1.8*amplitude;
        result.cx+=dx;result.cy+=dy;
        return result;
      };
      return true;
    })()`);
    const frames=[];
    for(let n=0;n<60*exportFps;n++){
      const sample=n/exportFps;
      const result=expressive?await evaluate(`window.${chatCarousel?'briarChatCarousel':'briarExpressive'}.render(${sample})`):await evaluate(`(()=>{
        const sample=${sample};
        const t=sample<43?sample:sample<52?44.5:sample<55?35.5:50;
        const localMotion=${localMotion};
        const ongoing=${ongoing};
        const phase=chapterAt(t);
        const anchor=[0,4,9,14,20,25,30,35.5,40,44.5,50][phase];
        const renderTime=localMotion?anchor:t;
        const slider=document.getElementById('timeline');slider.value=renderTime;slider.dispatchEvent(new Event('input'));
        const output=document.createElement('canvas');output.width=320;output.height=480;
        const g=output.getContext('2d'),source=document.getElementById('face');
        g.fillStyle='#030912';g.fillRect(0,0,320,480);
        g.drawImage(source,source.width*145/660,source.height*81/660,source.width*370/660,source.height*480/660,16,52,288,374);
        const pixels=g.getImageData(0,52,320,374);
        let before=0,after=0;
        for(let i=0;i<pixels.data.length;i+=4){
          before+=pixels.data[i]+pixels.data[i+1]+pixels.data[i+2];
          for(let c=0;c<3;c++)pixels.data[i+c]=Math.min(255,Math.round(Math.pow(pixels.data[i+c]/255,.72)*255*1.12));
          after+=pixels.data[i]+pixels.data[i+1]+pixels.data[i+2];
        }
        g.putImageData(pixels,0,52);
        const clusters=[];
        for(let group=0;group<9;group++){
          const pos=point({group,gx:0,gy:0,depth:1,phase:0},renderTime,true);
          clusters.push([16+(330+pos.cx-145)*288/370,52+(321+pos.cy-81)*374/480]);
        }
        if(localMotion&&phase!==9&&(ongoing||(phase!==5&&phase!==8))){
          // Move sparse highlights, not the whole glass, cloud glow or granular base.
          g.save();g.beginPath();g.ellipse(160,239,131.5,175.3,0,0,Math.PI*2);g.clip();
          const perGroup=new Array(9).fill(0);
          for(const p of dots){
            if(p.fine||p.phase<4.8||perGroup[p.group]>=(ongoing?3:2))continue;
            perGroup[p.group]++;
            const base=point(p,anchor,true);
            const calm=phase===10?.35:phase===2?.45:1;
            const radius=ongoing?[10,9,4,12,7,4,14,8,4,0,6][phase]:(phase===6?12:phase===3?9:6)*calm;
            const rate=ongoing?[.55,.9,.6,1.2,.7,.32,1,.65,.4,0,.4][phase]:.8;
            const direction=phase===6&&p.group%2?-1:1;
            const a=sample*rate*direction+p.phase;
            const bx=16+(330+base.x-145)*288/370,by=52+(321+base.y-81)*374/480;
            const x=bx+Math.sin(a)*radius;
            const y=by+Math.cos(a*.8)*radius*.7;
            const concerned=(phase===4||phase===6)&&(p.group===5||p.group===7);
            const color=phase===8?'255,135,149':concerned?'255,190,99':'144,221,255';
            if(ongoing){
              for(let tail=3;tail>=1;tail--){
                const past=a-tail*.16*direction;
                g.fillStyle='rgba('+color+','+(.48-tail*.09)+')';
                g.beginPath();g.arc(bx+Math.sin(past)*radius,by+Math.cos(past*.8)*radius*.7,1.6-tail*.15,0,Math.PI*2);g.fill();
              }
            }
            const glow=ongoing?5:4;
            const halo=g.createRadialGradient(x,y,0,x,y,glow);
            halo.addColorStop(0,'rgba('+color+',.5)');halo.addColorStop(1,'rgba('+color+',0)');
            g.fillStyle=halo;g.fillRect(x-glow,y-glow,glow*2,glow*2);
            g.fillStyle='rgba('+color+',.95)';g.beginPath();g.arc(x,y,ongoing?1.7:.9,0,Math.PI*2);g.fill();
          }
          g.restore();
        }
        if(localMotion&&ongoing&&phase===9){
          // Decorative rim motion is independent of the frozen unknown data field.
          const a=sample*.35;
          for(let tail=3;tail>=0;tail--){
            g.fillStyle='rgba(170,188,200,'+(.8-tail*.16)+')';g.beginPath();
            g.arc(160+Math.sin(a-tail*.045)*139,239+Math.cos(a-tail*.045)*183,tail?1.4:2.1,0,Math.PI*2);g.fill();
          }
        }
        g.fillStyle='#ecf7ff';g.font='20px system-ui';g.fillText('Briar',18,30);
        g.font='11px system-ui';g.fillStyle='#bcd9ea';g.fillText('SYNTHETIC DEMO',192,28);
        let title=document.getElementById('state').textContent.replace(' · simulated','');
        if(sample>=52&&sample<55)title='Simulated resolution';
        if(sample>=55)title='Rest';
        g.fillStyle='#e6f3ff';g.font='15px system-ui';
        // Long source chapter names are shortened only for the small caption.
        title=title.replace(' — separate example','');
        const retained=sample>=43&&sample<52;
        g.fillText(title,18,retained&&ongoing?438:445,284);
        if(retained&&ongoing){g.font='10px system-ui';g.fillStyle='#bcd9ea';g.fillText('Display idle motion · data unknown',18,452,284);}
        g.font='11px system-ui';g.fillStyle='#bcd9ea';
        if(retained){g.fillStyle='#ff8b9b';g.fillText('! Open demo concern retained',18,466);}
        else g.fillText('Motion study · no live activity',18,466);
        return {png:output.toDataURL('image/png').split(',')[1],scene:title,clusters,brightnessRatio:after/before};
      })()`);
      const file=String(n).padStart(3,'0')+'-motion.png';
      fs.writeFileSync(path.join(out,file),Buffer.from(result.png,'base64'));
      frames.push({file,scene:result.scene,clusters:result.clusters,...(expressive?{streams:result.streams,transitioning:result.transitioning,sourceFresh:result.sourceFresh}: {}),...(chatCarousel?{overall:result.overall,page:result.page,bar:result.bar,weights:result.weights}: {})});
      if(n===0&&!expressive)console.log('PIXEL_BRIGHTNESS: face-region RGB sum gain '+result.brightnessRatio.toFixed(2)+'x; backlight unchanged');
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({synthetic:true,width:320,height:480,fps:exportFps,seconds:60,mode:'motion-cues',variant:chatCarousel?'chat-carousel-aggregate':expressive?'expressive-work-streams':ongoing?'ongoing-mode-highlights':localMotion?'local-highlights':livelier?'livelier':'baseline',source,frames},null,2));
    console.log((chatCarousel?'EXPORTED: aggregate face, eight independent demo chats, two-row carousel and event circumference bar; ':'EXPORTED: original Briar motion and all 11 cue chapters; explicit demo resolution before loop; ')+out);return;
  }
  if(process.argv[3]==='--export-display'){
    const clips=await evaluate(`(()=>{const r=document.querySelector('.bp-screen').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`);
    assert.equal(clips.width,320);assert.equal(clips.height,480);
    const frames=[];
    for(const scene of ['attending','work','concern','urgent','stale','unknown']){
      await select(scene);
      for(let n=0;n<20;n++){
        await evaluate(`document.getElementById('briar-portrait-study').briarStudy.sample(${n/2})`);
        const png=await send('Page.captureScreenshot',{format:'png',clip:clips,captureBeyondViewport:true});
        const file=String(frames.length).padStart(3,'0')+'-'+scene+'.png';
        fs.writeFileSync(path.join(out,file),Buffer.from(png.data,'base64'));
        frames.push({file,scene});
      }
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({synthetic:true,width:320,height:480,fps:2,seconds:60,frames},null,2));
    console.log('EXPORTED: 120 synthetic 320x480 frames; 60-second tour; '+out);return;
  }
  assert.equal(await text('title'),'Ready');await screenshot('portrait-ready');
  await evaluate(`window.bpPlaybackDone=new Promise(resolve=>{const play=document.querySelector('[data-bp="play"]');const observer=new MutationObserver(()=>{if(!play.disabled){observer.disconnect();resolve();}});observer.observe(play,{attributes:true,attributeFilter:['disabled']});});true`);
  await click('play');await evaluate('window.bpPlaybackDone');
  assert.equal((await evaluate(`document.getElementById('briar-portrait-study').briarStudy.getState()`)).scene,'unknown');
  assert.match(await text('concern'),/Open/);
  await click('resolve');
  await select('attending');await screenshot('portrait-face');
  await select('concern');await click('ack');
  assert.match(await text('concern'),/acknowledged/);
  await select('stale');assert.match(await text('freshness'),/expired/);
  assert.match(await text('concern'),/acknowledged/);
  await select('unknown');await screenshot('portrait-unknown');
  const frozen=await evaluate(`document.querySelector('canvas').toDataURL()`);
  // Two animation frames are enough to expose unintended continuous changes.
  await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  assert.equal(await evaluate(`document.querySelector('canvas').toDataURL()`),frozen);
  assert.match(await text('concern'),/Open/);
  await click('resolve');assert.equal(await text('concern'),'No open concerns in this fixture');
  for(const width of [736,320]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===320});
    await select('urgent');
    const layout=await evaluate(`(()=>{const root=document.getElementById('briar-portrait-study'),screen=root.querySelector('.bp-screen').getBoundingClientRect(),caption=root.querySelector('.bp-caption').getBoundingClientRect();return {width:innerWidth,scroll:document.documentElement.scrollWidth,captionFits:caption.bottom<=screen.bottom&&caption.left>=screen.left&&caption.right<=screen.right,overflow:[...root.querySelectorAll('button,select,.bp-controls,.bp-screen')].some(e=>e.scrollWidth>e.clientWidth+1)};})()`);
    assert.equal(layout.width,width,'actual CSS viewport at '+width);
    assert(layout.scroll<=layout.width,'page horizontal overflow at '+width);
    assert(layout.captionFits,'caption clipped at '+width);
    assert(!layout.overflow,'control overflow at '+width);
  }
  await screenshot('portrait-mobile');
  await evaluate(`window.bpReducedReady=new Promise(resolve=>{const m=matchMedia('(prefers-reduced-motion: reduce)');if(m.matches)resolve();else m.addEventListener('change',()=>resolve(),{once:true});});true`);
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await evaluate('window.bpReducedReady');
  assert(await evaluate(`document.querySelector('[data-bp="play"]').disabled`));
  await select('attending');assert.equal(await text('title'),'A moment of recognition');
  assert.deepEqual(errors,[],'browser exceptions');
  console.log('PASS: real Chromium; complete 18-second playback; scenes and controls; retained concern; frozen unknown; 736px/320px layout; reduced motion; no runtime exceptions. Screenshots: '+out);
})().catch(error=>{console.error(error.message+'\n'+stderr);process.exitCode=1;}).finally(async()=>{
  clearTimeout(deadline);
  try{await send('Browser.close',{},null);}catch{}
  browser.kill('SIGTERM');
  // Exact temporary profile created by this invocation, never a user profile.
  browser.once('exit',()=>fs.rmSync(profile,{recursive:true,force:true}));
});
