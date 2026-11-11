// Standalone local feasibility bundle; no install, download or public release.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {filesUnder,digestFile,writeManifest,MANIFEST} from './package-files.mjs';
import {launchPlan,verifyEngine} from './launch-godot.mjs';
const defaultRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const APP_FILES=Object.freeze(['project.godot','export_presets.cfg','study.tscn','study.gd','presence.gd','light_scene.gd','resize_policy.gd','display_sizing.gd','settings_window.gd','api_recording.gd','inspection_window.gd','inspection_model.gd','inspection_layout.gd','instanced_light_scene.gd','point_batch.gd','point_material.gdshader']);
const BUILD_FILES=['package-godot.mjs','package-files.mjs','launch-godot.mjs','godot-package-launcher.sh'];
const NOTICES={
 'LICENSE.txt':'b0435e3b3e4e55238f05f4b306f30524a1b2e20147810d436eaa554fa6855c80',
 'COPYRIGHT.txt':'cb1980c88089573bcacd7221d777c689bb8bbd778799f24c27fca0fe5f774d6d',
 'AUTHORS.md':'6ca51d335b9de108ea53c5621e820c187d98c6faf92e14c8413ddb946b5e56cf'
};
function copyRegular(from,to){
 if(!fs.lstatSync(from).isFile())throw new Error('Expected a regular source file: '+from);
 fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);
}
export async function verifyGodotBundle(directory){
 const manifest=JSON.parse(fs.readFileSync(path.join(directory,MANIFEST),'utf8'));
 if(manifest.schema!==1||manifest.kind!=='godot-local-candidate'||manifest.executable!=='briar-presence'||!/^[a-f0-9]{64}$/.test(manifest.sourceDigest)||!manifest.files||Array.isArray(manifest.files))throw new Error('Invalid Godot manifest');
 const names=Object.keys(manifest.files).sort();
 if(JSON.stringify(names)!==JSON.stringify(filesUnder(directory).filter(name=>name!==MANIFEST).sort()))throw new Error('Bundle inventory differs');
 for(const name of ['godot','briar-presence','briar-presence.pck','COPYING','GODOT-LICENSE.txt','GODOT-COPYRIGHT.txt','GODOT-AUTHORS.md','SOURCE/LICENSE',...APP_FILES.map(name=>'SOURCE/implementation/godot/'+name),...BUILD_FILES.map(name=>'SOURCE/implementation/scripts/'+name)])
  if(!names.includes(name))throw new Error('Missing required bundled file: '+name);
 for(const name of names){
  if(path.isAbsolute(name)||name.includes('\\')||name.split('/').some(part=>part==='..'||part===''))throw new Error('Unsafe bundle path');
  const file=path.join(directory,name),record=manifest.files[name],stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.size!==record.size||Boolean(stat.mode&0o111)!==record.executable||await digestFile(file)!==record.sha256)throw new Error('Changed bundle file: '+name);
 }
 return manifest;
}
export async function buildGodotPackage(root=defaultRoot){
 const plan=launchPlan(root,['--check']),engine=verifyEngine(plan);
 const engineDirectory=path.dirname(plan.engine);
 for(const [name,expected] of Object.entries(NOTICES))
  if(await digestFile(path.join(engineDirectory,name))!==expected)throw new Error('Upstream notice checksum mismatch: '+name);
 const dist=path.join(root,'dist');fs.mkdirSync(dist,{recursive:true});
 const work=fs.mkdtempSync(path.join(dist,'godot-build-'));
 const workspace=path.join(work,'workspace'),bundle=path.join(work,'BriarPresence');
 fs.mkdirSync(bundle);
 const sourceInputs=['../LICENSE',...APP_FILES.map(name=>'godot/'+name),...BUILD_FILES.map(name=>'scripts/'+name)];
 for(const name of APP_FILES){
  copyRegular(path.join(root,'godot',name),path.join(workspace,name));
  if(fs.existsSync(path.join(root,'godot',name+'.uid')))copyRegular(path.join(root,'godot',name+'.uid'),path.join(workspace,name+'.uid'));
 }
 const log=fs.openSync(path.join(work,'export.log'),'wx');
 try{execFileSync(plan.engine,['--headless','--path',workspace,'--export-pack','Linux candidate pack',path.join(bundle,'briar-presence.pck')],{env:plan.env,timeout:30000,stdio:['ignore',log,log]});}
 finally{fs.closeSync(log);}
 if(/^(?:ERROR|SCRIPT ERROR):/m.test(fs.readFileSync(path.join(work,'export.log'),'utf8')))throw new Error('Engine export logged errors; preserved '+work);
 for(const name of APP_FILES){
  copyRegular(path.join(workspace,name),path.join(bundle,'SOURCE/implementation/godot',name));
  if(fs.existsSync(path.join(workspace,name+'.uid')))copyRegular(path.join(workspace,name+'.uid'),path.join(bundle,'SOURCE/implementation/godot',name+'.uid'));
 }
 for(const name of BUILD_FILES)copyRegular(path.join(root,'scripts',name),path.join(bundle,'SOURCE/implementation/scripts',name));
 copyRegular(path.join(root,'../LICENSE'),path.join(bundle,'COPYING'));
 copyRegular(path.join(root,'../LICENSE'),path.join(bundle,'SOURCE/LICENSE'));
 copyRegular(plan.engine,path.join(bundle,'godot'));fs.chmodSync(path.join(bundle,'godot'),0o755);
 for(const name of Object.keys(NOTICES))copyRegular(path.join(engineDirectory,name),path.join(bundle,'GODOT-'+name));
 copyRegular(path.join(root,'scripts/godot-package-launcher.sh'),path.join(bundle,'briar-presence'));fs.chmodSync(path.join(bundle,'briar-presence'),0o755);
 const sourceHash=crypto.createHash('sha256');
 for(const name of sourceInputs.sort()){sourceHash.update(name+'\0');sourceHash.update(await digestFile(path.join(root,name)));}
 sourceHash.update(engine.sha256+JSON.stringify(NOTICES));
 const sourceDigest=sourceHash.digest('hex');
 fs.writeFileSync(path.join(bundle,'README.txt'),`Briar Presence — local Godot candidate, GPL-3.0-or-later\n\nRun ./briar-presence. No Node, npm, checkout or server is needed at runtime.\nRequires Linux x86_64 and compatible system graphics/window libraries.\nClick the face or use F1 for settings. Drag the face to move; corners resize.\nStay-above defaults on. Settings: reduced motion, Done, Quit Briar.\nEscape quits from the face, hides settings when settings have focus. Ctrl+Q quits.\n\nNot a sandbox, final installation or public binary release. Synthetic data only.\nGodot ${engine.sha256} is the unmodified standard 4.7.2 engine (MIT).\nIts complete upstream notices and author list are included.\nNotice source: https://github.com/godotengine/godot/tree/4.7.2-stable\nOur source/build scripts and GPL text are in SOURCE/. No raw portrait is bundled.\n\nTo rebuild, put the included engine and upstream notices into\nSOURCE/implementation/.tools/godot-4.7.2/ using their original filenames\n(the engine filename is Godot_v4.7.2-stable_linux.x86_64), then run\nnode scripts/package-godot.mjs from SOURCE/implementation/. Requires Node.\nNo install/startup entries or existing launcher are changed by building.\n\nBRIAR_PRESENCE_RUNTIME may select the runtime directory; default is\n$XDG_DATA_HOME/briar-presence/godot-candidate (or ~/.local/share equivalent).\nThe runtime directory must be outside this immutable bundle.\nThe manifest records bundled bytes; it is not an authority signature.\n`);
 await writeManifest(bundle,{kind:'godot-local-candidate',executable:'briar-presence',sourceDigest,engineSha256:engine.sha256,notices:NOTICES,syntheticOnly:true});
 await verifyGodotBundle(bundle);
 const destination=path.join(dist,'godot-'+sourceDigest.slice(0,16));
 if(fs.existsSync(destination))throw new Error('Preserving existing candidate at '+destination+'; newly verified build retained at '+bundle);
 fs.renameSync(bundle,destination);
 return {directory:destination,sourceDigest,verified:true,exportLog:path.join(work,'export.log'),installed:false,publicRelease:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 buildGodotPackage().then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1;});
