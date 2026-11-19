import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {installPreview,removePreview} from '../scripts/install-preview.mjs';
test('preview launcher is reversible and refuses unrelated or edited files',()=>{
 const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'briar-launcher-test-'));
 try{
  const home=path.join(fixture,'home'),root=path.join(fixture,'source');
  fs.mkdirSync(path.join(root,'node_modules/electron/dist'),{recursive:true});fs.writeFileSync(path.join(root,'node_modules/electron/dist/electron'),'test fixture');
  fs.mkdirSync(path.join(root,'desktop'),{recursive:true});fs.writeFileSync(path.join(root,'desktop/main.cjs'),'test fixture');
  const installed=installPreview({home,root});assert.ok(fs.existsSync(installed.launcher));assert.equal(installed.standalonePackage,false);
  assert.match(fs.readFileSync(installed.launcher,'utf8'),/unset ELECTRON_RUN_AS_NODE/);
  installPreview({home,root});
  fs.appendFileSync(installed.launcher,'# user edit\n');assert.throws(()=>installPreview({home,root}),/Preserving/);assert.throws(()=>removePreview({home}),/Preserving/);
  // Restore the exact generated file in this isolated fixture, then remove.
  const text=fs.readFileSync(installed.launcher,'utf8').replace('# user edit\n','');fs.writeFileSync(installed.launcher,text);
  const result=removePreview({home});assert.ok(!fs.existsSync(installed.launcher));assert.ok(fs.existsSync(path.join(result.recovery,'briar-presence')));assert.ok(fs.existsSync(root));
 }finally{fs.rmSync(fixture,{recursive:true});}
});
