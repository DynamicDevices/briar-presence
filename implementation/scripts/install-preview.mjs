// A reversible development launcher, not a standalone distribution package.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const sourceRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=content=>crypto.createHash('sha256').update(content).digest('hex');
const quote=value=>"'"+value.replaceAll("'","'\\''")+"'";
export function installPreview({home=os.homedir(),root=sourceRoot}={}){
 const electron=path.join(root,'node_modules/electron/dist/electron');
 if(!fs.existsSync(electron)||!fs.existsSync(path.join(root,'desktop/main.cjs')))throw new Error('Build prerequisites are missing');
 const directory=path.join(home,'.local/share/briar-presence');
 const launcher=path.join(home,'.local/bin/briar-presence');
 const desktop=path.join(home,'.local/share/applications/briar-presence.desktop');
 const receiptFile=path.join(directory,'preview-launcher.json');
 const previous=fs.existsSync(receiptFile)?JSON.parse(fs.readFileSync(receiptFile,'utf8')):null;
 for(const file of [launcher,desktop])if(fs.existsSync(file)){
  if(fs.lstatSync(file).isSymbolicLink()||!previous||previous.files?.[file]!==sha(fs.readFileSync(file)))throw new Error('Preserving conflicting or edited file: '+file);
 }
 const script=`#!/bin/sh\n# Briar Presence preview launcher (managed; schema 1)\nunset ELECTRON_RUN_AS_NODE\nexec ${quote(electron)} ${quote(root)} "$@"\n`;
 const entry=`[Desktop Entry]\nType=Application\nName=Briar Presence (preview)\nComment=Local clustered-light desktop presence; synthetic states only\nExec="${launcher.replaceAll('%','%%')}"\nIcon=applications-graphics\nTerminal=false\nCategories=Utility;\nStartupNotify=false\n`;
 for(const file of [launcher,desktop,receiptFile])fs.mkdirSync(path.dirname(file),{recursive:true});
 fs.writeFileSync(launcher,script,{mode:0o755});fs.chmodSync(launcher,0o755);
 fs.writeFileSync(desktop,entry,{mode:0o644});
 const receipt={schema:1,kind:'development-preview',sourceRoot:root,files:{[launcher]:sha(script),[desktop]:sha(entry)}};
 fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
 return{launcher,desktop,receiptFile,standalonePackage:false};
}
export function removePreview({home=os.homedir()}={}){
 const directory=path.join(home,'.local/share/briar-presence'),receiptFile=path.join(directory,'preview-launcher.json');
 const receipt=JSON.parse(fs.readFileSync(receiptFile,'utf8'));
 const targets=[path.join(home,'.local/bin/briar-presence'),path.join(home,'.local/share/applications/briar-presence.desktop')];
 if(receipt.schema!==1||receipt.kind!=='development-preview')throw new Error('Unknown installer receipt');
 for(const file of targets)if(fs.existsSync(file)&&(fs.lstatSync(file).isSymbolicLink()||receipt.files[file]!==sha(fs.readFileSync(file))))throw new Error('Preserving edited launcher: '+file);
 const recovery=fs.mkdtempSync(path.join(directory,'removed-launchers-'));
 for(const file of targets)if(fs.existsSync(file))fs.renameSync(file,path.join(recovery,path.basename(file)));
 fs.renameSync(receiptFile,path.join(recovery,'preview-launcher.json'));
 return{recovery,preserved:'Source, dependencies and display preferences are untouched.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.platform!=='linux')throw new Error('This development launcher currently targets Linux only');
 const action=process.argv[2];if(!['--install','--remove'].includes(action))throw new Error('Use --install or --remove');
 console.log(JSON.stringify(action==='--install'?installPreview():removePreview()));
}
