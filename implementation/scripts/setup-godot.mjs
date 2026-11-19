// Project-local pinned engine only; no global installation or automatic launch.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {digestFile} from './package-files.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(process.platform!=='linux'||process.arch!=='x64')throw new Error('Pinned engine targets Linux x86_64 only');
const version='4.7.2-stable',name='Godot_v4.7.2-stable_linux.x86_64';
const archiveSha256='cadd3204e728a35d3f13adb7fd0d7902636b79f6b95c40c265eb73b6c35329e4';
const url=`https://github.com/godotengine/godot/releases/download/${version}/${name}.zip`;
const tools=path.join(root,'.tools'),destination=path.join(tools,'godot-4.7.2');
fs.mkdirSync(tools,{recursive:true});
if(fs.existsSync(destination)){
 if(fs.lstatSync(destination).isSymbolicLink())throw new Error('Preserving linked engine directory');
 const receipt=JSON.parse(fs.readFileSync(path.join(destination,'receipt.json'),'utf8'));
 if(receipt.url!==url||receipt.archiveSha256!==archiveSha256||await digestFile(path.join(destination,'engine.zip'))!==archiveSha256||await digestFile(path.join(destination,name))!==receipt.executableSha256)throw new Error('Existing engine differs from its receipt');
 console.log(JSON.stringify({engine:path.join(destination,name),version,verified:true,reused:true}));
}else{
 const staging=fs.mkdtempSync(path.join(tools,'godot-download-')),archive=path.join(staging,'engine.zip');
 const response=await fetch(url,{signal:AbortSignal.timeout(120000)});
 if(!response.ok||!response.body)throw new Error('Godot download failed: '+response.status);
 await pipeline(Readable.fromWeb(response.body),fs.createWriteStream(archive,{flags:'wx'}));
 if(await digestFile(archive)!==archiveSha256)throw new Error('Godot archive checksum mismatch; retained for diagnosis');
 const entries=execFileSync('unzip',['-Z1',archive],{encoding:'utf8',maxBuffer:4096}).trim().split('\n');
 if(entries.length!==1||entries[0]!==name)throw new Error('Unexpected archive members; refusing extraction');
 const binary=execFileSync('unzip',['-p',archive,name],{maxBuffer:256*1024*1024});
 const executableSha256=crypto.createHash('sha256').update(binary).digest('hex');
 fs.writeFileSync(path.join(staging,name),binary,{flag:'wx',mode:0o755});
 fs.writeFileSync(path.join(staging,'receipt.json'),JSON.stringify({version,url,archiveSha256,executableSha256},null,2)+'\n',{flag:'wx'});
 fs.renameSync(staging,destination);
 console.log(JSON.stringify({engine:path.join(destination,name),version,archiveSha256,executableSha256,verified:true,reused:false}));
}
