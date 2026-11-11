import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {writeManifest} from '../scripts/package-files.mjs';
import {APP_FILES,verifyGodotBundle} from '../scripts/package-godot.mjs';

test('Godot manifest consistency rejects changed, extra and linked files',async()=>{
 // Tiny metadata fixture, not an engine or evidence of a runnable package.
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'briar-godot-manifest-'));
 try {
  const names=['godot','briar-presence','briar-presence.pck','COPYING','GODOT-LICENSE.txt','GODOT-COPYRIGHT.txt','GODOT-AUTHORS.md','SOURCE/LICENSE',
   ...APP_FILES.map(name=>'SOURCE/implementation/godot/'+name),
   ...['package-godot.mjs','package-files.mjs','launch-godot.mjs','godot-package-launcher.sh'].map(name=>'SOURCE/implementation/scripts/'+name)];
  for(const name of names){fs.mkdirSync(path.dirname(path.join(dir,name)),{recursive:true});fs.writeFileSync(path.join(dir,name),name);}
  await writeManifest(dir,{kind:'godot-local-candidate',executable:'briar-presence',sourceDigest:'a'.repeat(64)});
  await verifyGodotBundle(dir);
  fs.writeFileSync(path.join(dir,'COPYING'),'changed');
  await assert.rejects(verifyGodotBundle(dir),/Changed bundle file/);
  fs.writeFileSync(path.join(dir,'COPYING'),'COPYING');
  fs.writeFileSync(path.join(dir,'unexpected'),'extra');
  await assert.rejects(verifyGodotBundle(dir),/inventory differs/);
  fs.unlinkSync(path.join(dir,'unexpected'));
  fs.unlinkSync(path.join(dir,'COPYING'));
  fs.symlinkSync('GODOT-LICENSE.txt',path.join(dir,'COPYING'));
  await assert.rejects(verifyGodotBundle(dir),/Symlinks/);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('Godot application bundle includes every local script and shader dependency',()=>{
  const preset=fs.readFileSync(new URL('../godot/export_presets.cfg',import.meta.url),'utf8');
  for(const name of APP_FILES){
    if(/\.(?:gd|gdshader|tscn)$/.test(name))assert.ok(preset.includes(`"res://${name}"`),`export preset must include ${name}`);
    const source=fs.readFileSync(new URL('../godot/'+name,import.meta.url),'utf8');
    for(const [,dependency] of source.matchAll(/res:\/\/([^"\s,]+\.(?:gdshader|tscn|gd))(?=["\s,]|$)/g))
      assert.ok(APP_FILES.includes(dependency),`${name} requires missing ${dependency}`);
  }
});
