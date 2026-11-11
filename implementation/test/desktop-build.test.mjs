import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {assertCiContext,desktopPresets,TARGETS,DOWNLOADS,safeArchiveMembers,assertBinary,verifyDesktopArtifact,downloadPinned} from '../scripts/build-desktop-ci.mjs';
import {APP_FILES} from '../scripts/package-godot.mjs';
import {writeManifest} from '../scripts/package-files.mjs';

const ci={GITHUB_REPOSITORY:'DynamicDevices/briar-presence',GITHUB_REPOSITORY_ID:'1452847479',RUNNER_NAME:'dd-esl-proxmox',RUNNER_OS:'Linux',RUNNER_ARCH:'X64',GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/heads/work/self-hosted-builds-20261111',GITHUB_SHA:'a'.repeat(40),RUNNER_TEMP:'/tmp/job',GITHUB_OUTPUT:'/tmp/job/output'};
test('cross-build entry rejects other runners, repositories, PRs and refs',()=>{
  assert.doesNotThrow(()=>assertCiContext(ci));
  assert.doesNotThrow(()=>assertCiContext({...ci,GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main'}));
  for(const changes of [{RUNNER_NAME:'other'},{RUNNER_OS:'Windows'},{RUNNER_ARCH:'ARM64'},{GITHUB_REPOSITORY:'other/repo'},{GITHUB_REPOSITORY_ID:'1'},{GITHUB_EVENT_NAME:'pull_request'},{GITHUB_EVENT_NAME:'pull_request_target'},{GITHUB_REF:'refs/heads/untrusted'},{GITHUB_SHA:'main'},{RUNNER_TEMP:'relative'},{GITHUB_OUTPUT:''}])assert.throws(()=>assertCiContext({...ci,...changes}));
});
test('three export presets retain every runtime dependency and disable signing',()=>{
  const presets=desktopPresets();
  assert.equal(TARGETS.length,3);
  for(const target of TARGETS){assert.ok(presets.includes(`platform="${target.platform}"`));assert.ok(presets.includes(`name="${target.preset}"`));}
  for(const name of APP_FILES.filter(n=>/\.(gd|gdshader|tscn)$/.test(n)))assert.equal(presets.split(`"res://${name}"`).length-1,3);
  assert.ok(presets.includes('codesign/codesign=0'));assert.ok(presets.includes('notarization/notarization=0'));
  assert.ok(presets.includes('application/modify_resources=false'));
  assert.equal(DOWNLOADS.templates.sha256,'f298490b8d44d934be425a5a65a51bf15f422428b229a06a6e11d9ffea248011');
});
test('export archive names cannot escape the app directory',()=>{
  assert.deepEqual(safeArchiveMembers('BriarPresence.app/\nBriarPresence.app/Contents/Info.plist\n','BriarPresence.app/'),['BriarPresence.app/','BriarPresence.app/Contents/Info.plist']);
  for(const name of ['../bad','/tmp/bad','BriarPresence.app/../bad','BriarPresence.app/Contents/../../bad','BriarPresence.app/\\bad','other.app/file',''])assert.throws(()=>safeArchiveMembers(name,'BriarPresence.app/'));
  assert.throws(()=>safeArchiveMembers('BriarPresence.app/a\nBriarPresence.app/a','BriarPresence.app/'));
});
test('binary and source-bearing manifests reject corruption, omissions and links',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'briar-cross-test-'));
  try{
    const binary=path.join(dir,'BriarPresence');fs.writeFileSync(binary,Buffer.from('7f454c4602010100','hex'),{mode:0o755});
    assertBinary(binary,'linux-x64');assert.throws(()=>assertBinary(binary,'windows-x64'));assert.throws(()=>assertBinary(binary,'macos-universal'));
    for(const [kind,hex] of [['windows-x64','4d5a0000'],['macos-universal','cafebabe']]){fs.writeFileSync(binary,Buffer.from(hex,'hex'));assertBinary(binary,kind);}
    fs.writeFileSync(binary,Buffer.from('7f454c4602010100','hex'));
    const names=['BriarPresence.pck','COPYING','SOURCE/LICENSE',...APP_FILES.map(n=>'SOURCE/implementation/godot/'+n),...['package-godot.mjs','package-files.mjs','launch-godot.mjs','godot-package-launcher.sh','build-desktop-ci.mjs'].map(n=>'SOURCE/implementation/scripts/'+n),'SOURCE/.github/workflows/desktop-builds.yml','GODOT-LICENSE.txt','GODOT-COPYRIGHT.txt','GODOT-AUTHORS.md','BUILDING.md'];
    for(const name of names){fs.mkdirSync(path.dirname(path.join(dir,name)),{recursive:true});fs.writeFileSync(path.join(dir,name),name);}
    const metadata={kind:'godot-cross-export',target:'linux-x64',sourceCommit:'a'.repeat(40),nativeTested:false,signed:false};
    await writeManifest(dir,metadata);await verifyDesktopArtifact(dir);
    fs.appendFileSync(path.join(dir,'COPYING'),'changed');await assert.rejects(verifyDesktopArtifact(dir),/content mismatch/);
    fs.unlinkSync(path.join(dir,'COPYING'));await writeManifest(dir,metadata);await assert.rejects(verifyDesktopArtifact(dir),/Missing source/);
    fs.symlinkSync('GODOT-LICENSE.txt',path.join(dir,'COPYING'));await assert.rejects(verifyDesktopArtifact(dir),/Symlinks/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('pinned downloads fail on HTTP errors or checksum mismatch without network',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'briar-download-test-')),original=globalThis.fetch;
  try{
    globalThis.fetch=async()=>new Response('test bytes');
    const sha256=crypto.createHash('sha256').update('test bytes').digest('hex');
    await downloadPinned({url:'https://invalid.test/fixture',name:'valid',sha256},dir);
    await assert.rejects(downloadPinned({url:'https://invalid.test/fixture',name:'wrong',sha256:'0'.repeat(64)},dir),/checksum mismatch/);
    globalThis.fetch=async()=>new Response('not found',{status:404});
    await assert.rejects(downloadPinned({url:'https://invalid.test/fixture',name:'missing',sha256},dir),/Download failed/);
  }finally{globalThis.fetch=original;fs.rmSync(dir,{recursive:true,force:true});}
});
test('self-hosted workflow has trusted triggers, exact routing and SHA-pinned Node24 actions',()=>{
  const workflow=fs.readFileSync(new URL('../../.github/workflows/desktop-builds.yml',import.meta.url),'utf8');
  assert.ok(workflow.includes('runs-on: [self-hosted, Linux, X64, dd-esl-proxmox]'));
  assert.ok(workflow.includes('persist-credentials: false'));assert.ok(workflow.includes('contents: read'));
  assert.ok(workflow.includes('timeout-minutes: 45'));assert.ok(workflow.includes('cancel-in-progress: false'));
  assert.ok(!/^\s*pull_request(?:_target)?:/m.test(workflow));assert.ok(!workflow.includes('secrets.'));
  for(const [,action,sha] of workflow.matchAll(/uses: ([\w/-]+)@([^\s]+)/g)){assert.match(sha,/^[a-f0-9]{40}$/);assert.ok(['actions/checkout','actions/setup-node','actions/upload-artifact'].includes(action));}
  for(const target of TARGETS)assert.ok(workflow.includes(`BriarPresence-${target.id}.zip`));
});
