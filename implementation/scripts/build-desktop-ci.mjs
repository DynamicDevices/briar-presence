// Unsigned Godot cross-exports. Never installs or starts the desktop overlay.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {APP_FILES} from './package-godot.mjs';
import {digestFile, filesUnder, writeManifest, MANIFEST} from './package-files.mjs';

export const VERSION='4.7.2-stable';
export const TARGETS=Object.freeze([
  {id:'linux-x64',preset:'Linux desktop',platform:'Linux',output:'BriarPresence',architecture:'x86_64',template:'linux_release.x86_64'},
  {id:'windows-x64',preset:'Windows desktop',platform:'Windows Desktop',output:'BriarPresence.exe',architecture:'x86_64',template:'windows_release_x86_64.exe'},
  {id:'macos-universal',preset:'macOS desktop',platform:'macOS',output:'BriarPresence.zip',architecture:'universal',template:'macos.zip'}
]);
const release=`https://github.com/godotengine/godot/releases/download/${VERSION}/`;
export const DOWNLOADS=Object.freeze({
  engine:{name:'engine.zip',url:release+'Godot_v4.7.2-stable_linux.x86_64.zip',sha256:'cadd3204e728a35d3f13adb7fd0d7902636b79f6b95c40c265eb73b6c35329e4'},
  templates:{name:'templates.tpz',url:release+'Godot_v4.7.2-stable_export_templates.tpz',sha256:'f298490b8d44d934be425a5a65a51bf15f422428b229a06a6e11d9ffea248011'},
  licence:{name:'GODOT-LICENSE.txt',url:`https://raw.githubusercontent.com/godotengine/godot/${VERSION}/LICENSE.txt`,sha256:'b0435e3b3e4e55238f05f4b306f30524a1b2e20147810d436eaa554fa6855c80'},
  copyright:{name:'GODOT-COPYRIGHT.txt',url:`https://raw.githubusercontent.com/godotengine/godot/${VERSION}/COPYRIGHT.txt`,sha256:'cb1980c88089573bcacd7221d777c689bb8bbd778799f24c27fca0fe5f774d6d'},
  authors:{name:'GODOT-AUTHORS.md',url:`https://raw.githubusercontent.com/godotengine/godot/${VERSION}/AUTHORS.md`,sha256:'6ca51d335b9de108ea53c5621e820c187d98c6faf92e14c8413ddb946b5e56cf'}
});
const ENGINE='Godot_v4.7.2-stable_linux.x86_64';
const BUILD_FILES=['package-godot.mjs','package-files.mjs','launch-godot.mjs','godot-package-launcher.sh','build-desktop-ci.mjs'];

export function assertCiContext(env){
  if(env.GITHUB_REPOSITORY!=='DynamicDevices/briar-presence'||env.GITHUB_REPOSITORY_ID!=='1452847479')throw new Error('Wrong repository');
  if(env.RUNNER_NAME!=='dd-esl-proxmox'||env.RUNNER_OS!=='Linux'||env.RUNNER_ARCH!=='X64')throw new Error('Wrong DD runner');
  if(!['push','workflow_dispatch'].includes(env.GITHUB_EVENT_NAME))throw new Error('Untrusted event');
  if(!['refs/heads/main','refs/heads/work/self-hosted-builds-20261111'].includes(env.GITHUB_REF))throw new Error('Untrusted ref');
  if(!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??''))throw new Error('Missing exact source commit');
  if(!env.RUNNER_TEMP||!path.isAbsolute(env.RUNNER_TEMP)||!env.GITHUB_OUTPUT)throw new Error('Missing job storage');
}

export function desktopPresets(){
  const resources=APP_FILES.filter(name=>/\.(gd|gdshader|tscn)$/.test(name)).map(name=>JSON.stringify('res://'+name)).join(', ');
  return TARGETS.map((target,i)=>`[preset.${i}]
name="${target.preset}"
platform="${target.platform}"
runnable=true
export_filter="selected_resources"
export_files=PackedStringArray(${resources})
include_filter=""
exclude_filter="*_test.gd"
export_path=""
encrypt_pck=false
encrypt_directory=false
script_export_mode=0

[preset.${i}.options]
binary_format/architecture="${target.architecture}"
binary_format/embed_pck=false
${target.platform==='Windows Desktop'?'application/modify_resources=false\n':''}${target.platform==='macOS'?'application/bundle_identifier="org.dynamicdevices.briarpresence"\ncodesign/codesign=0\nnotarization/notarization=0\n':''}`).join('\n');
}

export function safeArchiveMembers(list,root){
  const members=list.trim().split(/\r?\n/);
  if(!members.length||members.some(name=>!name.startsWith(root)||name.includes('\\')||name.split('/').some(p=>p==='..'||p==='.')||name.startsWith('/')))throw new Error('Unsafe archive path');
  if(new Set(members).size!==members.length)throw new Error('Duplicate archive member');
  return members;
}

export function inspectMacArchive(archive,work,execute=execFileSync){
  const list=execute('unzip',['-Z1',archive],{encoding:'utf8',maxBuffer:1024*1024});
  // Keep the generated member names before validation fails, not after extraction.
  // The failure-diagnostics artifact already retains project-owned *.log files.
  fs.writeFileSync(path.join(work,'macos-archive-members.log'),list,{flag:'wx'});
  return safeArchiveMembers(list,'BriarPresence.app/');
}

export async function downloadPinned(spec,directory){
  const destination=path.join(directory,spec.name);
  const response=await fetch(spec.url,{signal:AbortSignal.timeout(25*60*1000)});
  if(!response.ok||!response.body)throw new Error('Download failed: '+spec.name+' '+response.status);
  await pipeline(Readable.fromWeb(response.body),fs.createWriteStream(destination,{flags:'wx'}));
  if(await digestFile(destination)!==spec.sha256)throw new Error('Download checksum mismatch: '+spec.name);
  return destination;
}

function extractMember(archive,member,destination,executable=false){
  const entries=execFileSync('unzip',['-Z1',archive],{encoding:'utf8',maxBuffer:1024*1024}).trim().split(/\r?\n/);
  if(entries.filter(name=>name===member).length!==1)throw new Error('Missing or duplicate pinned archive member: '+member);
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  const fd=fs.openSync(destination,'wx',executable?0o755:0o644);
  try{execFileSync('unzip',['-p',archive,member],{stdio:['ignore',fd,'pipe'],timeout:120000});}finally{fs.closeSync(fd);}
}

export function assertBinary(file,kind){
  if(!TARGETS.some(target=>target.id===kind))throw new Error('Unknown binary target');
  const fd=fs.openSync(file,'r'),header=Buffer.alloc(4);
  try{if(fs.readSync(fd,header,0,4,0)!==4)throw new Error('Truncated export');}finally{fs.closeSync(fd);}
  const hex=header.toString('hex');
  if(kind==='linux-x64'&&hex!=='7f454c46'||kind==='windows-x64'&&header.subarray(0,2).toString()!=='MZ'||kind==='macos-universal'&&!['cafebabe','cafebabf'].includes(hex))throw new Error('Wrong exported binary format: '+kind);
}

export async function verifyDesktopArtifact(directory){
  const manifest=JSON.parse(fs.readFileSync(path.join(directory,MANIFEST),'utf8'));
  if(manifest.kind!=='godot-cross-export'||!TARGETS.some(t=>t.id===manifest.target)||manifest.nativeTested!==false||manifest.signed!==false||!/^[a-f0-9]{40}$/.test(manifest.sourceCommit))throw new Error('Invalid cross-export manifest');
  const actual=filesUnder(directory).filter(name=>name!==MANIFEST);
  if(JSON.stringify(actual.sort())!==JSON.stringify(Object.keys(manifest.files).sort()))throw new Error('Artifact inventory mismatch');
  const requiredSources=[...APP_FILES.map(name=>'SOURCE/implementation/godot/'+name),...BUILD_FILES.map(name=>'SOURCE/implementation/scripts/'+name),'SOURCE/.github/workflows/desktop-builds.yml'];
  for(const required of ['COPYING','SOURCE/LICENSE',...requiredSources,'GODOT-LICENSE.txt','GODOT-COPYRIGHT.txt','GODOT-AUTHORS.md','BUILDING.md'])if(!actual.includes(required))throw new Error('Missing source/notice: '+required);
  if(manifest.target==='macos-universal'){
    const binaries=actual.filter(name=>name.startsWith('BriarPresence.app/Contents/MacOS/'));
    if(binaries.length!==1)throw new Error('Missing macOS executable');
    assertBinary(path.join(directory,binaries[0]),manifest.target);
  }else{
    const target=TARGETS.find(target=>target.id===manifest.target);
    if(!actual.includes(target.output)||!actual.includes('BriarPresence.pck'))throw new Error('Missing exported executable/pack');
    assertBinary(path.join(directory,target.output),target.id);
  }
  for(const name of actual){
    const stat=fs.statSync(path.join(directory,name)),record=manifest.files[name];
    if(stat.size!==record.size||Boolean(stat.mode&0o111)!==record.executable||await digestFile(path.join(directory,name))!==record.sha256)throw new Error('Artifact content mismatch: '+name);
  }
  return manifest;
}

export function stageDesktopProject(root,workspace){
  fs.mkdirSync(workspace,{recursive:true});
  for(const name of APP_FILES){
    const input=path.join(root,'godot',name);if(!fs.lstatSync(input).isFile())throw new Error('Non-regular source: '+name);
    fs.copyFileSync(input,path.join(workspace,name));
    if(fs.existsSync(input+'.uid'))fs.copyFileSync(input+'.uid',path.join(workspace,name+'.uid'));
  }
  fs.writeFileSync(path.join(workspace,'export_presets.cfg'),desktopPresets());
  // ARM64/universal export requires this import format even with no textures.
  // Change only the staging copy; the accepted desktop project is untouched.
  const project=path.join(workspace,'project.godot'),source=fs.readFileSync(project,'utf8');
  const section=/(\[rendering\]\r?\n)([\s\S]*?)(?=\r?\n\[|$)/;
  if(!section.test(source))throw new Error('Missing rendering settings');
  fs.writeFileSync(project,source.replace(section,(_match,header,body)=>{
    const key='textures/vram_compression/import_etc2_astc=true';
    const existing=/^textures\/vram_compression\/import_etc2_astc=.*$/m;
    return header+(existing.test(body)?body.replace(existing,key):key+'\n'+body);
  }));
}

export function godotFailureDetails(log){
  const lines=log.split(/\r?\n/),selected=new Set();
  for(let i=0;i<lines.length;i++)if(/(?:SCRIPT ERROR|ERROR):/.test(lines[i]))for(let j=Math.max(0,i-1);j<Math.min(lines.length,i+4);j++)selected.add(j);
  const details=selected.size?[...selected].sort((a,b)=>a-b).map(i=>lines[i]).join('\n'):lines.slice(-20).join('\n');
  return Buffer.from(details).subarray(0,3500).toString('utf8');
}

export function runGodotStep({engine,workspace,env,work},args,logName,execute=execFileSync){
  const log=path.join(work,logName),fd=fs.openSync(log,'wx');
  let failure;
  try{execute(engine,['--headless','--path',workspace,...args],{env,timeout:180000,stdio:['ignore',fd,fd]});}
  catch(error){failure=error;}
  finally{fs.closeSync(fd);}
  const text=fs.readFileSync(log,'utf8');
  if(failure||/^(?:ERROR|SCRIPT ERROR):/m.test(text))throw new Error('Godot failed; '+log+'\n'+godotFailureDetails(text),failure?{cause:failure}:undefined);
}

export async function buildDesktopArtifacts({root,work,sourceCommit,env=process.env,onArtifact=()=>{}}){
  if(!/^[a-f0-9]{40}$/.test(sourceCommit))throw new Error('Missing exact source commit');
  const downloads=path.join(work,'downloads'),workspace=path.join(work,'project'),artifacts=path.join(work,'artifacts');
  for(const directory of [downloads,workspace,artifacts])fs.mkdirSync(directory,{recursive:true});
  const downloaded={};
  for(const [key,spec] of Object.entries(DOWNLOADS))downloaded[key]=await downloadPinned(spec,downloads);
  const engine=path.join(work,ENGINE);extractMember(downloaded.engine,ENGINE,engine,true);
  if(await digestFile(engine)!=='8d106cbe6144c2dc7e881d61d2429c1a8a76e6b22ef48bd5e48dcf934953f71e')throw new Error('Engine executable checksum mismatch');
  const isolatedEnv={...env,XDG_DATA_HOME:path.join(work,'data'),XDG_CONFIG_HOME:path.join(work,'config'),XDG_CACHE_HOME:path.join(work,'cache'),XDG_RUNTIME_DIR:path.join(work,'runtime'),TMPDIR:path.join(work,'tmp')};
  for(const directory of [isolatedEnv.XDG_DATA_HOME,isolatedEnv.XDG_CONFIG_HOME,isolatedEnv.XDG_CACHE_HOME,isolatedEnv.XDG_RUNTIME_DIR,isolatedEnv.TMPDIR])fs.mkdirSync(directory,{recursive:true,mode:0o700});
  const templateDirectory=path.join(isolatedEnv.XDG_DATA_HOME,'godot','export_templates','4.7.2.stable');
  for(const target of TARGETS)extractMember(downloaded.templates,'templates/'+target.template,path.join(templateDirectory,target.template),target.id!=='macos-universal');
  stageDesktopProject(root,workspace);
  const godot=(args,logName)=>runGodotStep({engine,workspace,env:isolatedEnv,work},args,logName);
  godot(['--editor','--import'],'import.log');
  for(const target of TARGETS){
    const bundle=path.join(artifacts,target.id);fs.mkdirSync(bundle);
    const output=path.join(bundle,target.output);
    godot(['--export-release',target.preset,output],target.id+'.log');
    if(target.id==='macos-universal'){
      inspectMacArchive(output,work);
      execFileSync('unzip',['-q',output,'-d',bundle],{timeout:120000});fs.unlinkSync(output);
      const binaries=filesUnder(bundle).filter(name=>name.startsWith('BriarPresence.app/Contents/MacOS/'));
      if(binaries.length!==1)throw new Error('Unexpected macOS executable layout');
      assertBinary(path.join(bundle,binaries[0]),target.id);
    }else assertBinary(output,target.id);
    fs.copyFileSync(path.join(root,'../LICENSE'),path.join(bundle,'COPYING'));
    for(const key of ['licence','copyright','authors'])fs.copyFileSync(downloaded[key],path.join(bundle,DOWNLOADS[key].name));
    const inputs=['../LICENSE',...APP_FILES.map(name=>'godot/'+name),...BUILD_FILES.map(name=>'scripts/'+name)];
    for(const name of inputs){
      const destination=name==='../LICENSE'?'LICENSE':'implementation/'+name;
      const out=path.join(bundle,'SOURCE',destination);fs.mkdirSync(path.dirname(out),{recursive:true});fs.copyFileSync(path.join(root,name),out);
      if(name.startsWith('godot/')&&fs.existsSync(path.join(root,name+'.uid')))fs.copyFileSync(path.join(root,name+'.uid'),out+'.uid');
    }
    const workflowOut=path.join(bundle,'SOURCE/.github/workflows/desktop-builds.yml');
    fs.mkdirSync(path.dirname(workflowOut),{recursive:true});
    fs.copyFileSync(path.join(root,'../.github/workflows/desktop-builds.yml'),workflowOut);
    fs.writeFileSync(path.join(bundle,'BUILDING.md'),`# Briar Presence — unsigned development cross-export

Target: ${target.id}; source: ${sourceCommit}; Godot: ${VERSION}.
Project source: GPL-3.0-or-later; Godot and dependencies retain their notices.
Not installed, signed, notarised or natively tested. No live harness connection.
Linux exports require compatible system graphics libraries; Windows x64 and
macOS universal are cross-exported, not proof of native window behaviour.

Rebuild with Node24, unzip and zip on Linux x64 using the included SOURCE/.
The exported buildDesktopArtifacts({root,work,sourceCommit}) function in
SOURCE/implementation/scripts/build-desktop-ci.mjs accepts an absolute source
implementation root and a fresh absolute scratch directory. It downloads the
checksum-pinned official engine/templates; no global installation is needed.
Example (from SOURCE/implementation, with your own fresh /tmp build directory):

    node --input-type=module -e 'import {buildDesktopArtifacts} from "./scripts/build-desktop-ci.mjs"; await buildDesktopArtifacts({root:process.cwd(),work:process.argv[1],sourceCommit:"${sourceCommit}"})' /tmp/YOUR-FRESH-BUILD-DIRECTORY

Pinned URLs/hashes are in that script; the generated native export presets
are produced by desktopPresets(). Workflow: SOURCE/.github/workflows/desktop-builds.yml.
The CI entry point additionally checks the approved runner/event/ref.
`);
    await writeManifest(bundle,{kind:'godot-cross-export',target:target.id,sourceCommit,godotVersion:VERSION,signed:false,nativeTested:false,downloads:DOWNLOADS});
    await verifyDesktopArtifact(bundle);
    // Zip inside the job, so the uploader does not discard executable bits.
    const archive=path.join(artifacts,'BriarPresence-'+target.id+'.zip');
    execFileSync('zip',['-q','-r',archive,'.'],{cwd:bundle,timeout:180000});
    onArtifact(target,archive);
    console.log(JSON.stringify({target:target.id,sourceCommit,artifact:'BriarPresence-'+target.id+'.zip',verified:true}));
  }
  const sums=[];
  for(const target of TARGETS){const name='BriarPresence-'+target.id+'.zip';sums.push(await digestFile(path.join(artifacts,name))+'  '+name);}
  fs.writeFileSync(path.join(artifacts,'SHA256SUMS.txt'),sums.join('\n')+'\n');
  return artifacts;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  assertCiContext(process.env);
  const work=fs.mkdtempSync(path.join(process.env.RUNNER_TEMP,'briar-cross-'));
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  fs.appendFileSync(process.env.GITHUB_OUTPUT,`work=${work}\n`);
  const artifacts=await buildDesktopArtifacts({root,work,sourceCommit:process.env.GITHUB_SHA,onArtifact:(target,archive)=>{
    fs.appendFileSync(process.env.GITHUB_OUTPUT,`${target.id.replaceAll('-','_')}=${archive}\n`);
  }});
  fs.appendFileSync(process.env.GITHUB_OUTPUT,`artifacts=${artifacts}\n`);
}
