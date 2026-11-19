'use strict';
const {app,BrowserWindow,ipcMain,session,dialog,screen}=require('electron');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {DEFAULTS,validateDisplay,migrateDisplay}=require('./display-policy.cjs');
const root=path.resolve(__dirname,'..'),faceEntry=path.join(__dirname,'index.html'),settingsEntry=path.join(__dirname,'settings.html');
const selfTest=process.argv.includes('--self-test');
app.setName('Briar Presence');app.enableSandbox();
if(app.commandLine.hasSwitch('no-sandbox')||app.commandLine.hasSwitch('disable-web-security'))throw new Error('Briar Presence requires sandbox and web security');
const testRoot=selfTest?(process.env.BRIAR_PRESENCE_TEST_ROOT?path.resolve(process.env.BRIAR_PRESENCE_TEST_ROOT):app.isPackaged?fs.mkdtempSync(path.join(app.getPath('temp'),'briar-presence-test-')):root):root;
const profile=selfTest?path.join(testRoot,'.test-profile'):path.join(app.getPath('appData'),'briar-presence');
fs.mkdirSync(profile,{recursive:true,mode:0o700});app.setPath('userData',profile);
let win,settingsWindow,settingsReady,validStates,display=readDisplay(),demoState='quiet';
const readiness=new Map();
function readDisplay(){try{const file=path.join(profile,'display.json');if(fs.statSync(file).size>16384)return{...DEFAULTS};return migrateDisplay(JSON.parse(fs.readFileSync(file,'utf8')));}catch{return{...DEFAULTS};}}
function snapshot(){return{display:{...display},state:demoState,controlsOpen:Boolean(settingsWindow&&!settingsWindow.isDestroyed()),stayAbove:Boolean(win&&!win.isDestroyed()&&win.isAlwaysOnTop())};}
function broadcast(){for(const surface of [win,settingsWindow])if(surface&&!surface.isDestroyed())surface.webContents.send('presence:snapshot',snapshot());}
function trusted(event){
 for(const [surface,entry] of [[win,faceEntry],[settingsWindow,settingsEntry]]){
  if(surface&&!surface.isDestroyed()&&event.sender===surface.webContents&&event.senderFrame===surface.webContents.mainFrame&&event.senderFrame.url===pathToFileURL(entry).href)return surface;
 }
 throw new Error('Untrusted window request');
}
function saveDisplay(value){const next=validateDisplay(value);fs.writeFileSync(path.join(profile,'display.json'),JSON.stringify(next)+'\n',{mode:0o600});display=next;broadcast();return snapshot();}
function fatal(error){console.error('Briar Presence:',error.message);if(!selfTest)dialog.showErrorBox('Briar Presence could not start',error.message);app.exit(1);}
function createSurface(options){
 const surface=new BrowserWindow({...options,show:false,autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,webviewTag:false,backgroundThrottling:false,spellcheck:false}});
 surface.setMenuBarVisibility(false);surface.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 surface.webContents.on('will-navigate',event=>event.preventDefault());
 surface.webContents.on('will-attach-webview',event=>event.preventDefault());
 surface.webContents.on('preload-error',(_event,_preload,error)=>fatal(error));
 surface.webContents.on('render-process-gone',(_event,details)=>{if(surface===win)fatal(new Error('Renderer exited: '+details.reason));else if(!surface.isDestroyed())surface.close();});
 return surface;
}
async function loadSurface(surface,entry){
 const ready=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{readiness.delete(surface.webContents.id);reject(new Error('Window did not report ready within 10 seconds'));},10000);readiness.set(surface.webContents.id,()=>{clearTimeout(timer);resolve();});});
 await Promise.all([surface.loadFile(entry),ready]);
}
async function showControls(){
 if(!win||win.isDestroyed())return false;
 if(win.isMinimized())win.restore();
 if(!settingsWindow||settingsWindow.isDestroyed()){
  const face=win.getBounds(),area=screen.getDisplayMatching(face).workArea,width=330,height=Math.min(600,area.height-40);
  const right=face.x+face.width+18,left=face.x-width-18;
  const x=right+width<=area.x+area.width?right:left>=area.x?left:Math.max(area.x,area.x+area.width-width);
  const y=Math.max(area.y,Math.min(face.y,area.y+area.height-height));
  settingsWindow=createSurface({width,height,x,y,frame:true,resizable:true,minWidth:300,minHeight:360,backgroundColor:'#e9eff4',title:'Briar · Display settings',modal:false});
  settingsWindow.on('closed',()=>{settingsWindow=null;settingsReady=null;broadcast();});
  settingsReady=loadSurface(settingsWindow,settingsEntry);broadcast();
 }
 await settingsReady;
 if(settingsWindow&&!settingsWindow.isDestroyed()){settingsWindow.show();settingsWindow.focus();broadcast();app.emit('briar:controls-ready');return true;}
 return false;
}
function hideControls(){if(settingsWindow&&!settingsWindow.isDestroyed())settingsWindow.close();return true;}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitForFaceMode(open){
 return win.webContents.executeJavaScript('new Promise(resolve=>{const desired='+JSON.stringify(open)+';const check=()=>document.body.classList.contains("controls-open")===desired;if(check()){resolve(true);return;}const observer=new MutationObserver(()=>{if(check()){observer.disconnect();clearTimeout(timer);resolve(true);}});const timer=setTimeout(()=>{observer.disconnect();resolve(false);},2000);observer.observe(document.body,{attributes:true,attributeFilter:["class"]});})');
}
async function smoke(){
 await delay(1200);
 const read=()=>win.webContents.executeJavaScript('({ready:document.body.dataset.ready,frames:Number(document.body.dataset.frames||0),failure:document.body.dataset.failure||null,isolated:typeof window.require==="undefined"&&typeof window.process==="undefined",security:window.presenceHost.getSecurityInfo()})');
 const before=await read();
 if(before.ready!=='true'||before.failure||!before.isolated||!before.security.sandboxed||!before.security.contextIsolated)throw new Error('Renderer startup/isolation failed: '+JSON.stringify(before));
 const resting=await win.webContents.executeJavaScript('({buttons:[...document.querySelectorAll("button")].filter(b=>b.getClientRects().length).map(b=>b.id),backdrop:getComputedStyle(document.getElementById("faceButton"),"::before").filter,radius:getComputedStyle(document.getElementById("faceButton"),"::before").borderTopLeftRadius})');
 if(JSON.stringify(resting.buttons)!=='["faceButton"]'||!resting.backdrop.includes('blur')||parseFloat(resting.radius)<40)throw new Error('Quiet rounded face check failed');
 const initial=await win.webContents.capturePage();
 const controlsRequested=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Face click did not open separate controls')),12000);app.once('briar:controls-ready',()=>{clearTimeout(timer);resolve();});});
 await win.webContents.executeJavaScript('document.getElementById("faceButton").click()');await controlsRequested;
 if(!await waitForFaceMode(true))throw new Error('Image did not enter native drag mode');
 const settings=await settingsWindow.webContents.executeJavaScript('({ready:document.body.dataset.ready,security:window.presenceHost.getSecurityInfo(),background:getComputedStyle(document.documentElement).backgroundColor,done:!!document.getElementById("done")})');
 if(settings.ready!=='true'||!settings.security.sandboxed||!settings.security.contextIsolated||!settings.done||settings.background!=='rgb(233, 239, 244)')throw new Error('Separate gentle controls startup failed');
 const controlImage=await settingsWindow.webContents.capturePage(),focusedBefore=win.isFocused(),start=await read();
 await delay(2000);const after=await read(),focusedAfter=win.isFocused(),image=await win.webContents.capturePage();
 if(after.failure||after.frames-start.frames<12||initial.toPNG().equals(image.toPNG()))throw new Error('Face did not keep moving while separate controls were open');
 const bitmap=image.toBitmap();if(bitmap[3]!==0)throw new Error('Face corner is not transparent');
 const aboveBefore=win.isAlwaysOnTop();win.setAlwaysOnTop(true);const aboveReported=win.isAlwaysOnTop();win.setAlwaysOnTop(aboveBefore);
 const faceBounds=win.getBounds(),panelBounds=settingsWindow.getBounds();
 const overlap=faceBounds.x<panelBounds.x+panelBounds.width&&faceBounds.x+faceBounds.width>panelBounds.x&&faceBounds.y<panelBounds.y+panelBounds.height&&faceBounds.y+faceBounds.height>panelBounds.y;
 await settingsWindow.webContents.executeJavaScript('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');
 if(!await waitForFaceMode(false))throw new Error('Escape did not close settings and restore quiet click mode');
 const result={type:'native-desktop-smoke',electron:process.versions.electron,chrome:process.versions.chrome,session:process.env.XDG_SESSION_TYPE||'unknown',ready:true,sandboxed:before.security.sandboxed,contextIsolated:before.security.contextIsolated,rendererIsolation:before.isolated,framesBefore:start.frames,framesAfter:after.frames,changedAppPixels:true,transparentCorner:true,restingControlsHidden:true,separateSettingsWindow:true,gentleSettings:true,dragModeOnClick:true,escapeRestoresQuietView:true,focusedBefore,focusedAfter,stayAboveApiReported:aboveReported,stayAboveVisuallyVerified:false,settingsBoundsOverlapReported:overlap,placementVisuallyVerified:false,manualChecksRemaining:['native image dragging','compositor window placement and stacking','visual comfort and accessibility','monitor/scaling changes','resource and toolkit acceptance']};
 const output=path.join(testRoot,'test-artifacts');result.artifacts=output;fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'desktop-smoke.json'),JSON.stringify(result,null,2)+'\n');fs.writeFileSync(path.join(output,'desktop-smoke.png'),image.toPNG());fs.writeFileSync(path.join(output,'settings-smoke.png'),controlImage.toPNG());
 console.log(JSON.stringify(result));app.quit();
}
if(!app.requestSingleInstanceLock()){app.quit();}else{
 app.on('second-instance',()=>{void showControls().catch(error=>console.error('Settings:',error.message));});
 app.on('window-all-closed',()=>app.quit());
 app.whenReady().then(async()=>{
  validStates=new Set(Object.keys((await import(pathToFileURL(path.join(root,'inputs/demo.mjs')).href)).DEMO_STATES));
  session.defaultSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*','ws://*/*','wss://*/*']},(_details,callback)=>callback({cancel:true}));
  session.defaultSession.on('will-download',event=>event.preventDefault());
  ipcMain.on('presence:ready',event=>{trusted(event);readiness.get(event.sender.id)?.();readiness.delete(event.sender.id);});
  ipcMain.handle('presence:get-snapshot',event=>{trusted(event);return snapshot();});
  ipcMain.handle('presence:save-display',(event,value)=>{trusted(event);return saveDisplay(value);});
  ipcMain.handle('presence:demo-state',(event,value)=>{trusted(event);if(typeof value!=='string'||!validStates.has(value))throw new TypeError('Unknown demo state');demoState=value;broadcast();return snapshot();});
  ipcMain.handle('presence:show-controls',event=>{trusted(event);return showControls();});
  ipcMain.handle('presence:hide-controls',event=>{trusted(event);setImmediate(hideControls);return true;});
  ipcMain.handle('presence:stay-above',(event,value)=>{trusted(event);if(typeof value!=='boolean')throw new TypeError('Boolean required');win.setAlwaysOnTop(value);broadcast();return{reported:win.isAlwaysOnTop(),note:'This is a desktop request, not proof of actual stacking. Placement and stay-above need checking on your screen.'};});
  ipcMain.handle('presence:quit',event=>{trusted(event);setImmediate(()=>app.quit());return true;});
  win=createSurface({width:280,height:410,frame:false,transparent:true,backgroundColor:'#00000000',resizable:false,hasShadow:false,alwaysOnTop:false,title:'Briar Presence'});
  for(const event of ['show','restore'])win.on(event,()=>win.webContents.send('presence:visibility',true));
  for(const event of ['hide','minimize'])win.on(event,()=>win.webContents.send('presence:visibility',false));
  await loadSurface(win,faceEntry);win.showInactive();console.log(JSON.stringify({type:'desktop-preview-ready',pid:process.pid,syntheticOnly:true,session:process.env.XDG_SESSION_TYPE||'unknown'}));
  if(selfTest)await smoke();
 }).catch(fatal);
}
