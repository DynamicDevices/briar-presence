// One finite Linux process-tree sample; not an idle/battery benchmark or monitor.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pid=Number(process.argv[2]);
if(!Number.isInteger(pid)||pid<=1)throw new Error('Supply the exact task-owned app PID');
const command=fs.readFileSync(`/proc/${pid}/cmdline`,'utf8').split('\0').filter(Boolean);
const executable=path.join(root,'node_modules/electron/dist/electron');
// Electron may rewrite argv into one process-title field after startup.
const development=fs.realpathSync(`/proc/${pid}/exe`)===fs.realpathSync(executable)&&((command[0]===executable&&command[1]===root)||(command.length===1&&command[0]===executable+' '+root));
if(!development)throw new Error('PID does not match this project development preview');
const ticks=Number(execFileSync('getconf',['CLK_TCK'],{encoding:'utf8'}).trim());
if(!Number.isFinite(ticks)||ticks<=0)throw new Error('Invalid clock tick rate');
function stat(id){
 const raw=fs.readFileSync(`/proc/${id}/stat`,'utf8'),fields=raw.slice(raw.lastIndexOf(')')+2).trim().split(/\s+/);
 return {ticks:Number(fields[11])+Number(fields[12]),started:fields[19]};
}
function tree(id){
 return [id,...fs.readFileSync(`/proc/${id}/task/${id}/children`,'utf8').trim().split(/\s+/).filter(Boolean).flatMap(child=>tree(Number(child)))];
}
const before=new Map(tree(pid).map(id=>[id,stat(id)])),started=performance.now();
await new Promise(resolve=>setTimeout(resolve,3000));
const elapsed=(performance.now()-started)/1000;
const after=tree(pid);
if(after.length!==before.size||after.some(id=>!before.has(id)))throw new Error('Process tree changed; sample is inconclusive');
let totalTicks=0,pssKiB=0;
for(const id of after){
 const final=stat(id),initial=before.get(id);
 if(final.started!==initial.started)throw new Error('Process identity changed');
 totalTicks+=final.ticks-initial.ticks;
 const match=fs.readFileSync(`/proc/${id}/smaps_rollup`,'utf8').match(/^Pss:\s+(\d+) kB$/m);
 if(!match)throw new Error('PSS unavailable');pssKiB+=Number(match[1]);
}
const result={pid,processes:after.length,sampleSeconds:Number(elapsed.toFixed(3)),pssMiB:Number((pssKiB/1024).toFixed(1)),oneCoreCpuPercent:Number((totalTicks/ticks/elapsed*100).toFixed(1)),scope:'One short current-preview process-tree sample; not an idle, battery or acceptance result.'};
const output=path.join(root,'test-artifacts/resource-sample.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,artifact:output}));
