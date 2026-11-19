import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {launchPlan,verifyEngine} from '../scripts/launch-godot.mjs';

test('Godot candidate launch is explicit, local and preserves the display backend',()=>{
 const plan=launchPlan('/example/implementation',[],{DISPLAY:':1',WAYLAND_DISPLAY:'wayland-0'});
 assert.deepEqual(plan.args,['--path','/example/implementation/godot']);
 assert.equal(plan.check,false);
 assert.equal(plan.smoke,false);
 assert.equal(plan.env.DISPLAY,':1');
 assert.equal(plan.env.WAYLAND_DISPLAY,'wayland-0');
 for(const key of ['XDG_CONFIG_HOME','XDG_CACHE_HOME','XDG_DATA_HOME'])
  assert.ok(plan.env[key].startsWith('/example/implementation/.tools/runtime/'));
 assert.ok(!plan.args.includes('--display-driver'));
 assert.deepEqual(launchPlan('/example',['--smoke']).args.slice(-2),['--','--briar-smoke']);
 assert.equal(launchPlan('/example',['--check']).check,true);
 assert.deepEqual(launchPlan('/example',['--api-recording']).args.slice(-2),['--','--api-recording']);
 assert.equal(launchPlan('/example',['--api-recording']).apiRecording,true);
 assert.deepEqual(launchPlan('/example',['--inspection']).args.slice(-3),['--','--api-recording','--inspection']);
 assert.equal(launchPlan('/example',['--inspection']).apiRecording,true);
 for(const args of [['--script'],['--check','--smoke'],['--instanced-study']])
  assert.throws(()=>launchPlan('/example',args),/Usage/);
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
