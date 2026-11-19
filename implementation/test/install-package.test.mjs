import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {writeManifest,verifyPackage} from '../scripts/package-files.mjs';
import {stagePackage,installPackage,removePackage,rollbackPackage} from '../scripts/install-package.mjs';
import {installPreview} from '../scripts/install-preview.mjs';
async function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'briar-install-test-')),candidate=path.join(root,'candidate'),home=path.join(root,'home');
 fs.mkdirSync(path.join(candidate,'resources'),{recursive:true});
 for(const name of ['briar-presence','resources/app.asar','LICENSE','LICENSES.chromium.html'])fs.writeFileSync(path.join(candidate,name),'fixture '+name);
 fs.chmodSync(path.join(candidate,'briar-presence'),0o755);
 await writeManifest(candidate,{sourceDigest:'a'.repeat(64),executable:'briar-presence'});
 return {root,candidate,home};
}
test('standalone staging verifies an independent copy and refuses a changed release',async()=>{
 const f=await fixture();try{
  const staged=await stagePackage(f);assert.notEqual(staged.release,f.candidate);
  assert.equal((await verifyPackage(staged.release)).sourceDigest,'a'.repeat(64));
  assert.equal((await stagePackage(f)).reused,true);
  assert.equal(fs.existsSync(path.join(f.home,'.local/bin/briar-presence')),false);
  fs.writeFileSync(path.join(staged.release,'LICENSE'),'changed');
  await assert.rejects(stagePackage(f),/differs/);
 }finally{fs.rmSync(f.root,{recursive:true});}
});
test('standalone install migrates a managed preview, preserving recovery and preferences',async()=>{
 const f=await fixture();try{
  const source=path.join(f.root,'source');fs.mkdirSync(path.join(source,'node_modules/electron/dist'),{recursive:true});fs.writeFileSync(path.join(source,'node_modules/electron/dist/electron'),'fixture');
  fs.mkdirSync(path.join(source,'desktop'));fs.writeFileSync(path.join(source,'desktop/main.cjs'),'fixture');
  const preview=installPreview({home:f.home,root:source}),old=fs.readFileSync(preview.launcher,'utf8');
  const prefs=path.join(f.home,'.config/briar-presence');fs.mkdirSync(prefs,{recursive:true});fs.writeFileSync(path.join(prefs,'display.json'),'preserved');
  const installed=await installPackage(f),script=fs.readFileSync(installed.launcher,'utf8');
  assert.match(script,/unset ELECTRON_RUN_AS_NODE/);assert.ok(script.includes(installed.release));assert.ok(!script.includes(source));
  assert.equal(fs.readFileSync(path.join(installed.recovery,'briar-presence'),'utf8'),old);
  assert.equal(fs.existsSync(preview.receiptFile),false);
  await installPackage(f);
  fs.appendFileSync(installed.launcher,'# user edit');
  await assert.rejects(installPackage(f),/Preserving/);assert.throws(()=>removePackage(f),/Preserving/);
  fs.writeFileSync(installed.launcher,script);
  const removed=removePackage(f);assert.ok(fs.existsSync(path.join(removed.recovery,'briar-presence')));
  assert.equal(fs.existsSync(installed.launcher),false);assert.ok(fs.existsSync(installed.release));
  assert.equal(fs.readFileSync(path.join(prefs,'display.json'),'utf8'),'preserved');
 }finally{fs.rmSync(f.root,{recursive:true});}
});
test('standalone installer preserves unknown launchers and symlink targets',async()=>{
 const f=await fixture();try{
  const bin=path.join(f.home,'.local/bin');fs.mkdirSync(bin,{recursive:true});
  const launcher=path.join(bin,'briar-presence');fs.writeFileSync(launcher,'unrelated');
  await assert.rejects(installPackage(f),/Preserving/);assert.equal(fs.readFileSync(launcher,'utf8'),'unrelated');
  fs.unlinkSync(launcher);fs.symlinkSync(path.join(f.candidate,'LICENSE'),launcher);
  await assert.rejects(installPackage(f),/symlink/);
  assert.equal(fs.readFileSync(path.join(f.candidate,'LICENSE'),'utf8'),'fixture LICENSE');
 }finally{fs.rmSync(f.root,{recursive:true});}
});
test('rollback restores the previous preview exactly and preserves modified recovery files',async()=>{
 const f=await fixture();try{
  const source=path.join(f.root,'source');fs.mkdirSync(path.join(source,'node_modules/electron/dist'),{recursive:true});fs.writeFileSync(path.join(source,'node_modules/electron/dist/electron'),'fixture');
  fs.mkdirSync(path.join(source,'desktop'));fs.writeFileSync(path.join(source,'desktop/main.cjs'),'fixture');
  const preview=installPreview({home:f.home,root:source});
  const original=fs.readFileSync(preview.launcher),receipt=fs.readFileSync(preview.receiptFile);
  const installed=await installPackage(f),backup=path.join(installed.recovery,'briar-presence');
  fs.appendFileSync(backup,'# changed');
  assert.throws(()=>rollbackPackage(f),/edited recovery/);
  assert.ok(fs.readFileSync(installed.launcher,'utf8').includes(installed.release));
  fs.writeFileSync(backup,original);
  fs.unlinkSync(backup);assert.throws(()=>rollbackPackage(f),/missing or edited recovery/);fs.writeFileSync(backup,original,{mode:0o755});
  const result=rollbackPackage(f);assert.equal(result.restored,'development-preview');
  assert.deepEqual(fs.readFileSync(preview.launcher),original);assert.deepEqual(fs.readFileSync(preview.receiptFile),receipt);
  assert.ok(fs.statSync(preview.launcher).mode&0o111);assert.ok(fs.existsSync(installed.release));
 }finally{fs.rmSync(f.root,{recursive:true});}
});
test('rollback after first installation returns to no launcher',async()=>{
 const f=await fixture();try{
  const installed=await installPackage(f),result=rollbackPackage(f);
  assert.equal(result.restored,'no-launcher');assert.equal(fs.existsSync(installed.launcher),false);
  assert.ok(fs.existsSync(installed.release));assert.ok(fs.existsSync(path.join(result.recovery,'standalone-launcher.json')));
 }finally{fs.rmSync(f.root,{recursive:true});}
});
