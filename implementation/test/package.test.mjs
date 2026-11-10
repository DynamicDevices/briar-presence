import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {allowedAppPath,packageSourceDigest,writeManifest,verifyPackage} from '../scripts/package-files.mjs';
test('package cache identity includes application, lockfile and build policy',async()=>{
 const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'briar-source-test-'));
 try{
  for(const dir of ['core','renderers','inputs','desktop','scripts'])fs.mkdirSync(path.join(fixture,dir));
  const sources=['package.json','package-lock.json','scripts/package-linux.mjs','scripts/package-files.mjs','core/scene.mjs','desktop/main.cjs'];
  for(const rel of sources)fs.writeFileSync(path.join(fixture,rel),'fixture');
  const original=await packageSourceDigest(fixture);
  assert.equal(await packageSourceDigest(fixture),original);
  for(const rel of sources){
   fs.writeFileSync(path.join(fixture,rel),'changed');
   assert.notEqual(await packageSourceDigest(fixture),original,rel);
   fs.writeFileSync(path.join(fixture,rel),'fixture');
  }
 }finally{fs.rmSync(fixture,{recursive:true});}
});
test('only the application source can enter the packaged archive',()=>{
 for(const rel of ['','/','/package.json','/core/presence.mjs','/desktop/main.cjs','/inputs/demo.mjs','/renderers/canvas.mjs'])assert.equal(allowedAppPath(rel),true,rel);
 for(const rel of ['/node_modules','/package-lock.json','/.test-profile','/test-artifacts','/test','/scripts','/dist','/.env'])assert.equal(allowedAppPath(rel),false,rel);
});
test('package integrity catches changed, missing, extra and linked files',async()=>{
 const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'briar-package-test-'));
 try{
  fs.mkdirSync(path.join(fixture,'resources'));
  for(const file of ['briar-presence','resources/app.asar','LICENSE','LICENSES.chromium.html'])fs.writeFileSync(path.join(fixture,file),'fixture '+file);
  await writeManifest(fixture,{sourceDigest:'a'.repeat(64),executable:'briar-presence'});
  assert.equal((await verifyPackage(fixture)).sourceDigest,'a'.repeat(64));
  fs.writeFileSync(path.join(fixture,'LICENSE'),'changed');await assert.rejects(verifyPackage(fixture),/differs/);
  fs.writeFileSync(path.join(fixture,'LICENSE'),'fixture LICENSE');
  fs.writeFileSync(path.join(fixture,'extra'),'unlisted');await assert.rejects(verifyPackage(fixture),/inventory/);fs.unlinkSync(path.join(fixture,'extra'));
  fs.symlinkSync('LICENSE',path.join(fixture,'linked'));await assert.rejects(verifyPackage(fixture),/Symlinks/);
 }finally{fs.rmSync(fixture,{recursive:true});}
});
