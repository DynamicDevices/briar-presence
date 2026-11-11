// Finite headless checks only; never opens a visible desktop window.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {launchPlan,verifyEngine} from './launch-godot.mjs';
import {buildInspectionVectors} from './inspection-vectors.mjs';
import {buildOverlayRecording} from './api-overlay-recording.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const plan=launchPlan(root),engine=verifyEngine(plan);
const artifacts=path.join(root,'test-artifacts');
const full=process.argv[2]==='--full';
if(process.argv.length>3||(process.argv[2]&&!full))throw Error('Usage: node scripts/test-inspection-godot.mjs [--full]');
fs.mkdirSync(artifacts,{recursive:true});
for(const name of ['XDG_CONFIG_HOME','XDG_CACHE_HOME','XDG_DATA_HOME'])fs.mkdirSync(plan.env[name],{recursive:true});
fs.writeFileSync(path.join(artifacts,'inspection-accepted-vectors.json'),JSON.stringify(buildInspectionVectors()));
await buildOverlayRecording({inspection:true,sample:true});
let log='';
for(const [script,compileOnly] of [['study.gd',true],['inspection_test.gd',true],['inspection_test.gd',false]]){
  const args=['--headless','--path',path.join(root,'godot'),...(compileOnly?['--check-only']:[]),'--script',`res://${script}`,...(full&&!compileOnly?['--','--full-inspection']:[])];
  const result=spawnSync(plan.engine,args,{cwd:root,env:plan.env,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
  log+=`${script} ${compileOnly?'compile':'behaviour'}\n${result.stdout??''}${result.stderr??''}`;
  fs.writeFileSync(path.join(artifacts,'godot-inspection.log'),log);
  if(result.status!==0||result.error||/SCRIPT ERROR:|ERROR:/.test(result.stderr??'')){
    console.error(log.slice(-3500));process.exit(1);
  }
}
const report=JSON.parse(fs.readFileSync(path.join(artifacts,'godot-inspection-results.json'),'utf8'));
console.log(JSON.stringify({...report,engineSha256:engine.sha256,log:path.join(artifacts,'godot-inspection.log')}));
if(!report.passed)process.exitCode=1;
