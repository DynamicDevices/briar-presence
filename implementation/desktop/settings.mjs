import {DEMO_STATES} from '../inputs/demo.mjs';
const $=id=>document.getElementById(id),host=window.presenceHost;
const preference=matchMedia('(prefers-reduced-motion: reduce)');
let current;
function error(reason){$('error').textContent=reason.message;}
function apply(snapshot){current=snapshot;const display=snapshot.display;$('brightness').value=String(display.brightness);$('scale').value=String(display.scale);$('desktopContrast').checked=display.desktopContrast;$('still').checked=display.reducedMotion??preference.matches;$('stayAbove').checked=snapshot.stayAbove;$('state').value=snapshot.state;$('explanation').textContent=DEMO_STATES[snapshot.state].message;}
async function save(changedMotion=false){try{const display={brightness:Number($('brightness').value),scale:Number($('scale').value),desktopContrast:$('desktopContrast').checked,reducedMotion:changedMotion?$('still').checked:current.display.reducedMotion};await host.saveDisplay(display);}catch(reason){error(reason);}}
for(const id of ['brightness','scale'])$(id).addEventListener('input',()=>{void save();});
$('desktopContrast').addEventListener('change',()=>{void save();});$('still').addEventListener('change',()=>{void save(true);});
$('state').addEventListener('change',()=>{host.setDemoState($('state').value).catch(error);});
$('stayAbove').addEventListener('change',()=>{host.setStayAbove($('stayAbove').checked).then(result=>{$('platformNote').textContent=result.note;}).catch(error);});
$('restart').addEventListener('click',async()=>{try{await host.saveDisplay({...current.display,reducedMotion:false});await host.setDemoState('quiet');}catch(reason){error(reason);}});
$('done').addEventListener('click',()=>{void host.hideControls();});$('quit').addEventListener('click',()=>{void host.quit();});
document.addEventListener('keydown',event=>{if(event.key==='Escape')void host.hideControls();});
host.onSnapshot(apply);preference.addEventListener('change',()=>{if(current?.display.reducedMotion===null)$('still').checked=preference.matches;});
try{apply(await host.getSnapshot());document.body.dataset.ready='true';host.ready();}catch(reason){error(reason);}
