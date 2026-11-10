import {createPresence} from '../core/presence.mjs';
import {drawCanvas} from '../renderers/canvas.mjs';
import {DEMO_STATES} from '../inputs/demo.mjs';
const $=id=>document.getElementById(id),host=window.presenceHost,canvas=$('face'),ctx=canvas.getContext('2d');
const model=createPresence(crypto.getRandomValues(new Uint32Array(1))[0]);
const preference=matchMedia('(prefers-reduced-motion: reduce)');
let snapshot=null,elapsed=0,last=0,frameId=0,hostVisible=true;
function frozen(){return !snapshot||(snapshot.display.reducedMotion??preference.matches)||['waiting','unknown'].includes(snapshot.state);}
function stop(){if(frameId)clearTimeout(frameId);frameId=0;}
function fail(error){stop();$('error').hidden=false;$('error').textContent='Briar needs a restart: '+error.message;document.body.dataset.failure=error.message;}
function paint(){
 if(!snapshot)return;
 drawCanvas(ctx,model.sample({time:elapsed,state:snapshot.state,reducedMotion:snapshot.display.reducedMotion??preference.matches}),{pointScale:1.6,lightGain:1.2});
 document.body.dataset.frames=String(Number(document.body.dataset.frames||0)+1);
}
function schedule(){frameId=setTimeout(()=>frame(performance.now()),80);}
function frame(now){frameId=0;if(!hostVisible||document.hidden||frozen())return;elapsed+=Math.max(0,(now-last)/1000);last=now;try{paint();schedule();}catch(error){fail(error);}}
function start(){stop();try{paint();if(hostVisible&&!document.hidden&&!frozen()){last=performance.now();schedule();}}catch(error){fail(error);}}
function apply(value){
 snapshot=value;const display=value.display,width=180*display.scale/100;
 canvas.style.opacity=display.brightness/100;$('faceButton').style.width=width+'px';
 canvas.width=Math.ceil(width*devicePixelRatio);canvas.height=Math.ceil(width*460/360*devicePixelRatio);
 $('faceButton').classList.toggle('desktop-contrast',display.desktopContrast);
 document.body.classList.toggle('controls-open',value.controlsOpen);$('moveHint').hidden=!value.controlsOpen;
 $('faceButton').setAttribute('aria-expanded',String(value.controlsOpen));
 $('faceButton').setAttribute('aria-label','Briar '+DEMO_STATES[value.state].title+' demo. Open display settings.');
 start();
}
$('faceButton').addEventListener('click',()=>{host.showControls().catch(error=>{$('error').hidden=false;$('error').textContent='Settings could not open: '+error.message;});});
document.addEventListener('keydown',event=>{if(event.key==='Escape')void host.hideControls();});
preference.addEventListener('change',start);
host.onSnapshot(apply);host.onVisibility(visible=>{hostVisible=visible;if(visible)start();else stop();});
document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
try{apply(await host.getSnapshot());document.body.dataset.ready='true';host.ready();}catch(error){fail(error);}
