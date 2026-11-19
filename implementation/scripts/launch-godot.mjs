// Explicit candidate launch; never installs, downloads or replaces the default host.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const binaryName='Godot_v4.7.2-stable_linux.x86_64';
const binarySha256='8d106cbe6144c2dc7e881d61d2429c1a8a76e6b22ef48bd5e48dcf934953f71e';

function socketPresent(socketPath) {
 try {return fs.statSync(socketPath).isSocket();} catch {return false;}
}

export function preferredBackend(environment,probe=socketPresent) {
 const display=environment.WAYLAND_DISPLAY;
 const socketPath=display&&(path.isAbsolute(display)?display:
  environment.XDG_RUNTIME_DIR?path.join(environment.XDG_RUNTIME_DIR,display):null);
 return socketPath&&probe(socketPath)?'wayland':'x11';
}

export function launchPlan(projectRoot, args=[], environment=process.env,probe=socketPresent) {
 const mode=args[0];
 if(args.length>1 || (args.length===1 && !['--check','--smoke','--api-recording','--inspection','--inspection-opaque','--plain-resize-test','--inspection-wayland','--inspection-x11'].includes(mode)))
  throw new Error('Usage: node scripts/launch-godot.mjs [--check|--smoke|--api-recording|--inspection|--inspection-opaque|--plain-resize-test|--inspection-wayland|--inspection-x11]');
 const tools=path.join(projectRoot,'.tools');
 const diagnostic=['--inspection-opaque','--plain-resize-test'].includes(mode);
 const backend=mode==='--inspection-wayland'?'wayland':
  mode==='--inspection-x11'||diagnostic?'x11':
  ['--check','--smoke'].includes(mode)?null:preferredBackend(environment,probe);
 const inspection=['--inspection','--inspection-wayland','--inspection-x11','--inspection-opaque'].includes(mode);
 const userArgs=diagnostic&&mode==='--plain-resize-test'?['--script','res://resize_diagnostic.gd']:
  mode==='--smoke'?['--','--briar-smoke']:
  inspection?['--','--api-recording','--inspection',...(mode==='--inspection-opaque'?['--opaque-resize-test']:[])]:
  mode==='--api-recording'?['--','--api-recording']:[];
 return {engine:path.join(tools,'godot-4.7.2',binaryName),
  args:['--path',path.join(projectRoot,'godot'),...(backend?['--display-driver',backend]:[]),...userArgs],
  backend,diagnostic,check:mode==='--check',smoke:mode==='--smoke',apiRecording:inspection||mode==='--api-recording',
  env:{...environment,
   XDG_CONFIG_HOME:path.join(tools,'runtime/config'),
   XDG_CACHE_HOME:path.join(tools,'runtime/cache'),
   XDG_DATA_HOME:path.join(tools,'runtime/data')}};
}

export function verifyEngine(plan) {
 if(process.platform!=='linux'||process.arch!=='x64')
  throw new Error('This candidate launcher supports Linux x86_64 only');
 const stat=fs.lstatSync(plan.engine);
 if(!stat.isFile()||stat.isSymbolicLink()) throw new Error('Expected the pinned regular engine executable');
 const actual=crypto.createHash('sha256').update(fs.readFileSync(plan.engine)).digest('hex');
 if(actual!==binarySha256) throw new Error('Godot executable checksum mismatch; refusing to launch');
 fs.accessSync(plan.engine,fs.constants.X_OK);
 return {engine:plan.engine,sha256:actual,verified:true};
}

async function main() {
 const plan=launchPlan(root,process.argv.slice(2));
 const receipt=verifyEngine(plan);
 if(plan.check) {console.log(JSON.stringify({...receipt,launches:false}));return;}
 if(plan.backend)console.log(JSON.stringify({type:'briar-display-selection',backend:plan.backend,diagnostic:plan.diagnostic}));
 if(plan.backend==='x11')console.warn('Briar Presence: using X11; transparent corner resizing may flash (Godot issue #120113). Use native Wayland when available. No desktop/session settings were changed.');
 for(const key of ['XDG_CONFIG_HOME','XDG_CACHE_HOME','XDG_DATA_HOME'])
  fs.mkdirSync(plan.env[key],{recursive:true});
 const child=spawn(plan.engine,plan.args,{cwd:root,env:plan.env,stdio:'inherit',shell:false});
 let expired=false;
 const timer=plan.smoke?setTimeout(()=>{expired=true;child.kill('SIGKILL');},15000):null;
 const interrupt=()=>child.kill('SIGINT');
 const terminate=()=>child.kill('SIGTERM');
 process.on('SIGINT',interrupt);
 process.on('SIGTERM',terminate);
 try {
  const exit=await new Promise((resolve,reject)=>{
   child.once('error',reject);
   child.once('close',(code,signal)=>resolve({code,signal}));
  });
  process.exitCode=expired?124:(exit.code??(exit.signal==='SIGINT'?130:143));
 } finally {
  if(timer) clearTimeout(timer);
  process.removeListener('SIGINT',interrupt);
  process.removeListener('SIGTERM',terminate);
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(error=>{console.error(error.message);process.exitCode=1;});
