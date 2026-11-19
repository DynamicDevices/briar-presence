import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {launchPlan,preferredBackend,verifyEngine} from '../scripts/launch-godot.mjs';

test('Godot candidate launch is local and reports its selected display backend',()=>{
 const plan=launchPlan('/example/implementation',[],{DISPLAY:':1',WAYLAND_DISPLAY:'wayland-0'});
 assert.deepEqual(plan.args,['--path','/example/implementation/godot','--display-driver','x11']);
 assert.equal(plan.check,false);
 assert.equal(plan.smoke,false);
 assert.equal(plan.env.DISPLAY,':1');
 assert.equal(plan.env.WAYLAND_DISPLAY,'wayland-0');
 for(const key of ['XDG_CONFIG_HOME','XDG_CACHE_HOME','XDG_DATA_HOME'])
  assert.ok(plan.env[key].startsWith('/example/implementation/.tools/runtime/'));
 assert.equal(plan.backend,'x11');
 assert.deepEqual(launchPlan('/example',['--smoke']).args.slice(-2),['--','--briar-smoke']);
 assert.equal(launchPlan('/example',['--check']).check,true);
 assert.deepEqual(launchPlan('/example',['--api-recording']).args.slice(-2),['--','--api-recording']);
 assert.equal(launchPlan('/example',['--api-recording']).apiRecording,true);
 assert.deepEqual(launchPlan('/example',['--inspection']).args.slice(-3),['--','--api-recording','--inspection']);
 assert.equal(launchPlan('/example',['--inspection']).apiRecording,true);
 assert.deepEqual(launchPlan('/example',['--inspection-opaque']).args.slice(-4),['--','--api-recording','--inspection','--opaque-resize-test']);
 assert.equal(launchPlan('/example',['--inspection-opaque']).apiRecording,true);
 assert.equal(launchPlan('/example',['--inspection']).args.includes('--opaque-resize-test'),false);
 assert.deepEqual(launchPlan('/example',['--plain-resize-test']).args.slice(-2),['--script','res://resize_diagnostic.gd']);
 assert.equal(launchPlan('/example',['--plain-resize-test']).apiRecording,false);
 assert.deepEqual(launchPlan('/example',['--inspection-wayland']).args.slice(2),['--display-driver','wayland','--','--api-recording','--inspection']);
 assert.equal(launchPlan('/example',['--inspection-wayland']).apiRecording,true);
 assert.equal(launchPlan('/example',['--inspection-wayland']).args.includes('--opaque-resize-test'),false);
 for(const args of [['--script'],['--check','--smoke'],['--instanced-study']])
  assert.throws(()=>launchPlan('/example',args),/Usage/);
});

test('Linux interactive launches prefer an existing Wayland socket and retain explicit choices',()=>{
 const environment={WAYLAND_DISPLAY:'wayland-0',XDG_RUNTIME_DIR:'/run/user/example',DISPLAY:':1'};
 const present=socketPath=>{assert.equal(socketPath,'/run/user/example/wayland-0');return true;};
 assert.equal(preferredBackend(environment,present),'wayland');
 assert.equal(preferredBackend(environment,()=>false),'x11');
 assert.equal(preferredBackend({DISPLAY:':1'},()=>{throw Error('must not probe');}),'x11');
 assert.equal(preferredBackend({WAYLAND_DISPLAY:'wayland-0'},()=>{throw Error('no runtime dir');}),'x11');
 assert.equal(preferredBackend({WAYLAND_DISPLAY:'/custom/wayland'},p=>p==='/custom/wayland'),'wayland');
 for(const args of [[],['--inspection'],['--api-recording']]){
  const plan=launchPlan('/example',args,environment,present);
  assert.equal(plan.backend,'wayland');assert.deepEqual(plan.args.slice(2,4),['--display-driver','wayland']);
 }
 assert.equal(launchPlan('/example',['--inspection-x11'],environment,present).backend,'x11');
 assert.equal(launchPlan('/example',['--inspection-wayland'],{},()=>false).backend,'wayland');
 for(const mode of ['--inspection-opaque','--plain-resize-test'])assert.equal(launchPlan('/example',[mode],environment,present).backend,'x11');
 for(const mode of ['--check','--smoke'])assert.equal(launchPlan('/example',[mode],environment,present).backend,null);
 const plainFile=path.join(os.tmpdir(),'briar-non-socket-'+process.pid);
 fs.writeFileSync(plainFile,'not a socket');
 try{assert.equal(preferredBackend({WAYLAND_DISPLAY:plainFile}),'x11');}finally{fs.unlinkSync(plainFile);}
});

test('Godot launcher rejects a changed executable before execution',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'briar-godot-launch-'));
 try {
  const engine=path.join(dir,'engine');
  fs.writeFileSync(engine,'not the pinned engine',{mode:0o700});
  assert.throws(()=>verifyEngine({engine}),/checksum mismatch/);
  const linked=path.join(dir,'linked');
  fs.symlinkSync(engine,linked);
  assert.throws(()=>verifyEngine({engine:linked}),/regular engine/);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
