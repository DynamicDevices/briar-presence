// Local, recoverable installation. No services, startup entries or system writes.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {verifyPackage} from './package-files.mjs';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const quote=value=>"'"+value.replaceAll("'","'\\''")+"'";
function locations(home){
 home=path.resolve(home);
 if(/[\r\n\0]/.test(home))throw new Error('Unsupported home path');
 const directory=path.join(home,'.local/share/briar-presence');
 return {home,directory,launcher:path.join(home,'.local/bin/briar-presence'),desktop:path.join(home,'.local/share/applications/briar-presence.desktop'),receipt:path.join(directory,'standalone-launcher.json'),preview:path.join(directory,'preview-launcher.json')};
}
function noLinks(target){
 let current=path.resolve(target);
 while(true){
  try{if(fs.lstatSync(current).isSymbolicLink())throw new Error('Preserving symlink path: '+current);}
  catch(error){if(error.code!=='ENOENT')throw error;}
  const parent=path.dirname(current);if(parent===current)break;current=parent;
 }
}
function checkedLocations(home){
 const result=locations(home);
 for(const file of [result.launcher,result.desktop,result.receipt,result.preview])noLinks(file);
 return result;
}
export async function stagePackage({home=os.homedir(),candidate}={}){
 if(!candidate)throw new Error('An explicit package directory is required');
 const target=checkedLocations(home),manifest=await verifyPackage(path.resolve(candidate));
 const releases=path.join(target.directory,'releases'),release=path.join(releases,manifest.sourceDigest);
 noLinks(release);
 if(fs.existsSync(release)){
  const existing=await verifyPackage(release);
  if(JSON.stringify(existing)!==JSON.stringify(manifest))throw new Error('Preserving conflicting installed package');
  return {release,sourceDigest:manifest.sourceDigest,staged:true,reused:true};
 }
 fs.mkdirSync(releases,{recursive:true});
 const staging=fs.mkdtempSync(path.join(releases,'staging-'));
 // Keep a failed staging directory for diagnosis; never remove an unknown tree.
 for(const name of fs.readdirSync(path.resolve(candidate)))fs.cpSync(path.join(path.resolve(candidate),name),path.join(staging,name),{recursive:true,errorOnExist:true,force:false});
 await verifyPackage(staging);
 fs.renameSync(staging,release);
 return {release,sourceDigest:manifest.sourceDigest,staged:true,reused:false};
}
function currentReceipt(target){
 const standalone=fs.existsSync(target.receipt),preview=fs.existsSync(target.preview);
 if(standalone&&preview)throw new Error('Conflicting installer receipts; preserving both');
 const file=standalone?target.receipt:preview?target.preview:null;
 const receipt=file?JSON.parse(fs.readFileSync(file,'utf8')):null;
 if(receipt&&(receipt.schema!==1||receipt.kind!==(standalone?'standalone-package':'development-preview')))throw new Error('Unknown installer receipt');
 for(const file of [target.launcher,target.desktop])if(fs.existsSync(file)&&(!receipt||receipt.files?.[file]!==sha(fs.readFileSync(file))))throw new Error('Preserving conflicting or edited launcher: '+file);
 return {file,receipt};
}
export async function installPackage({home=os.homedir(),candidate}={}){
 const target=checkedLocations(home),previous=currentReceipt(target);
 const staged=await stagePackage({home,candidate});
 const executable=path.join(staged.release,'briar-presence');
 if(!(fs.statSync(executable).mode&0o111))throw new Error('Packaged executable is not executable');
 const script=`#!/bin/sh\n# Briar Presence standalone launcher (managed; schema 1)\nunset ELECTRON_RUN_AS_NODE\nexec ${quote(executable)} "$@"\n`;
 const entry=`[Desktop Entry]\nType=Application\nName=Briar Presence (local candidate)\nComment=Clustered-light desktop presence; synthetic states only\nExec="${target.launcher.replaceAll('\\','\\\\').replaceAll('"','\\"').replaceAll('`','\\`').replaceAll('$','\\$').replaceAll('%','%%')}"\nIcon=applications-graphics\nTerminal=false\nCategories=Utility;\nStartupNotify=false\n`;
 for(const file of [target.launcher,target.desktop])fs.mkdirSync(path.dirname(file),{recursive:true});
 const recovery=fs.mkdtempSync(path.join(target.directory,'previous-launchers-'));
 // Preserve exact prior generated files and receipt, including on partial failure.
 for(const file of [target.launcher,target.desktop,previous.file].filter(Boolean))if(fs.existsSync(file))fs.copyFileSync(file,path.join(recovery,path.basename(file)),fs.constants.COPYFILE_EXCL);
 const recoveryFiles=Object.fromEntries(fs.readdirSync(recovery).map(name=>[name,sha(fs.readFileSync(path.join(recovery,name)))]));
 const receipt={schema:1,kind:'standalone-package',release:staged.release,sourceDigest:staged.sourceDigest,recovery,recoveryFiles,files:{[target.launcher]:sha(script),[target.desktop]:sha(entry)}};
 try{
  fs.writeFileSync(target.launcher,script,{mode:0o755});fs.chmodSync(target.launcher,0o755);
  fs.writeFileSync(target.desktop,entry,{mode:0o644});
  fs.writeFileSync(target.receipt,JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
  if(previous.file===target.preview)fs.renameSync(target.preview,path.join(recovery,'retired-preview-receipt.json'));
 }catch(error){throw new Error('Installation interrupted; prior launchers preserved in '+recovery+': '+error.message);}
 return {...staged,launcher:target.launcher,desktop:target.desktop,recovery,standalonePackage:true};
}
export function removePackage({home=os.homedir()}={}){
 const target=checkedLocations(home),current=currentReceipt(target);
 if(current.receipt?.kind!=='standalone-package')throw new Error('No managed standalone installation');
 const recovery=fs.mkdtempSync(path.join(target.directory,'removed-launchers-'));
 for(const file of [target.launcher,target.desktop,target.receipt])if(fs.existsSync(file))fs.renameSync(file,path.join(recovery,path.basename(file)));
 return {recovery,preserved:'Packaged releases, previous launchers, source and display preferences are untouched.'};
}
export function rollbackPackage({home=os.homedir()}={}){
 const target=checkedLocations(home),current=currentReceipt(target);
 if(current.receipt?.kind!=='standalone-package')throw new Error('No managed standalone installation');
 const previous=current.receipt.recovery;
 if(typeof previous!=='string'||path.dirname(previous)!==target.directory||!/^previous-launchers-[A-Za-z0-9]+$/.test(path.basename(previous)))throw new Error('Invalid recovery directory');
 noLinks(previous);
 const inventory=current.receipt.recoveryFiles;
 if(!inventory||typeof inventory!=='object'||Array.isArray(inventory))throw new Error('Missing recovery inventory');
 for(const name of Object.keys(inventory)){
  if(!['briar-presence','briar-presence.desktop','preview-launcher.json','standalone-launcher.json'].includes(name))throw new Error('Invalid recovery file');
  const file=path.join(previous,name);noLinks(file);
  if(!fs.existsSync(file)||sha(fs.readFileSync(file))!==inventory[name])throw new Error('Preserving missing or edited recovery file: '+file);
 }
 for(const name of ['briar-presence','briar-presence.desktop','preview-launcher.json','standalone-launcher.json'])if(fs.existsSync(path.join(previous,name))&&!Object.hasOwn(inventory,name))throw new Error('Unexpected recovery file');
 const receipts=['preview-launcher.json','standalone-launcher.json'].filter(name=>{
  const file=path.join(previous,name);noLinks(file);return fs.existsSync(file);
 });
 if(receipts.length>1)throw new Error('Conflicting recovery receipts');
 const prior=receipts.length?JSON.parse(fs.readFileSync(path.join(previous,receipts[0]),'utf8')):null;
 const expectedKind=receipts[0]==='preview-launcher.json'?'development-preview':'standalone-package';
 if(prior&&(prior.schema!==1||prior.kind!==expectedKind))throw new Error('Unknown recovery receipt');
 const backups=[];
 for(const file of [target.launcher,target.desktop]){
  const backup=path.join(previous,path.basename(file));noLinks(backup);
  if(fs.existsSync(backup)){
   if(!prior||prior.files?.[file]!==sha(fs.readFileSync(backup)))throw new Error('Preserving edited recovery file: '+backup);
   backups.push({file,backup});
  }
 }
 // Validate everything before moving the active launchers out of the way.
 const removed=removePackage({home});
 try{
  for(const {file,backup}of backups)fs.copyFileSync(backup,file,fs.constants.COPYFILE_EXCL);
  if(prior)fs.copyFileSync(path.join(previous,receipts[0]),prior.kind==='development-preview'?target.preview:target.receipt,fs.constants.COPYFILE_EXCL);
 }catch(error){throw new Error('Rollback interrupted; active launchers preserved in '+removed.recovery+': '+error.message);}
 return {restored:prior?.kind??'no-launcher',recovery:removed.recovery,preserved:'All packaged releases, recovery copies and display preferences remain.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.platform!=='linux')throw new Error('This installer targets Linux only');
 const [action,candidate]=process.argv.slice(2);
 if(!['--stage','--install','--remove','--rollback'].includes(action))throw new Error('Use --stage PACKAGE, --install PACKAGE, --remove or --rollback');
 console.log(JSON.stringify(action==='--remove'?removePackage():action==='--rollback'?rollbackPackage():await(action==='--stage'?stagePackage:installPackage)({candidate})));
}
