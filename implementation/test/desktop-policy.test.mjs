import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const {DEFAULTS,validateDisplay,migrateDisplay}=createRequire(import.meta.url)('../desktop/display-policy.cjs');
test('only bounded display settings cross the host bridge',()=>{
 assert.deepEqual(validateDisplay(DEFAULTS),DEFAULTS);
 assert.deepEqual(migrateDisplay({brightness:72,scale:110,reducedMotion:true}),{brightness:72,scale:110,reducedMotion:true,desktopContrast:true});
 for(const value of [null,[],{...DEFAULTS,command:'sh'},{...DEFAULTS,brightness:101},{...DEFAULTS,scale:0},{...DEFAULTS,reducedMotion:'yes'}])assert.throws(()=>validateDisplay(value),TypeError);
});
test('desktop source explicitly retains isolation and denies network/navigation',()=>{
 const main=fs.readFileSync(new URL('../desktop/main.cjs',import.meta.url),'utf8');
 for(const text of ['app.enableSandbox()','contextIsolation:true','nodeIntegration:false','sandbox:true','webSecurity:true','webviewTag:false','backgroundThrottling:false',"action:'deny'",'event.senderFrame===surface.webContents.mainFrame','event.senderFrame.url===pathToFileURL(entry).href','callback({cancel:true})','callback(false)'])assert.ok(main.includes(text),text);
 assert.doesNotMatch(main,/appendSwitch\(['"](?:no-sandbox|disable-web-security)|execSync\(|spawn\(|setIgnoreMouseEvents\(true/);
 const preload=fs.readFileSync(new URL('../desktop/preload.cjs',import.meta.url),'utf8');
 assert.doesNotMatch(preload,/exposeInMainWorld\(['"](?:require|ipcRenderer)|\.invoke\(channel|\.send\(channel/);
 const html=fs.readFileSync(new URL('../desktop/index.html',import.meta.url),'utf8');
 assert.match(html,/connect-src 'none'/);assert.doesNotMatch(html,/unsafe-inline|unsafe-eval/);
});
