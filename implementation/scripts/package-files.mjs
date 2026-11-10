import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export const MANIFEST='PACKAGE-MANIFEST.json';
export function allowedAppPath(value){const rel=value.replaceAll('\\','/').replace(/^\/+|\/+$/g,'');return rel===''||rel==='package.json'||['core','renderers','inputs','desktop'].some(dir=>rel===dir||rel.startsWith(dir+'/'));}
export function filesUnder(root,relative=''){
 const result=[];
 for(const name of fs.readdirSync(path.join(root,relative)).sort()){
  const rel=path.posix.join(relative,name),full=path.join(root,rel),stat=fs.lstatSync(full);
  if(stat.isSymbolicLink())throw new Error('Symlinks are not permitted in this local package: '+rel);
  if(stat.isDirectory())result.push(...filesUnder(root,rel));else if(stat.isFile())result.push(rel);else throw new Error('Unsupported file type: '+rel);
 }
 return result;
}
export async function digestFile(file){const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(file))hash.update(chunk);return hash.digest('hex');}
export async function packageSourceDigest(root){
 const sourceFiles=['../LICENSE','package.json','package-lock.json','scripts/package-linux.mjs','scripts/package-files.mjs',...['core','renderers','inputs','desktop'].flatMap(dir=>filesUnder(path.join(root,dir)).map(rel=>dir+'/'+rel))].sort();
 const hash=crypto.createHash('sha256');
 for(const rel of sourceFiles){hash.update(rel+'\0');hash.update(await digestFile(path.join(root,rel)));}
 return hash.digest('hex');
}
export async function writeManifest(root,metadata){
 const files={};for(const rel of filesUnder(root)){if(rel===MANIFEST)continue;const stat=fs.statSync(path.join(root,rel));files[rel]={sha256:await digestFile(path.join(root,rel)),size:stat.size,executable:Boolean(stat.mode&0o111)};}
 const manifest={schema:1,...metadata,files};
 fs.writeFileSync(path.join(root,MANIFEST),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
export async function verifyPackage(root){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,MANIFEST),'utf8'));
 if(manifest.schema!==1||manifest.executable!=='briar-presence'||typeof manifest.sourceDigest!=='string'||!/^[a-f0-9]{64}$/.test(manifest.sourceDigest)||!manifest.files||typeof manifest.files!=='object')throw new Error('Invalid package manifest');
 const names=Object.keys(manifest.files).sort(),actual=filesUnder(root).filter(rel=>rel!==MANIFEST).sort();
 if(JSON.stringify(actual)!==JSON.stringify(names))throw new Error('Package file inventory differs from its manifest');
 for(const required of ['briar-presence','resources/app.asar','LICENSE','LICENSES.chromium.html'])if(!names.includes(required))throw new Error('Missing required runtime/app/licence file: '+required);
 for(const rel of names){
  if(path.isAbsolute(rel)||rel.split('/').includes('..'))throw new Error('Unsafe package path');
  const record=manifest.files[rel],full=path.join(root,rel),stat=fs.statSync(full);
  if(stat.size!==record.size||Boolean(stat.mode&0o111)!==record.executable||await digestFile(full)!==record.sha256)throw new Error('Package content differs from its manifest: '+rel);
 }
 return manifest;
}
