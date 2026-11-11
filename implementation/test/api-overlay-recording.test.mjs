import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {acceptedDemoTrace,sceneRecords,buildOverlayRecording} from '../scripts/api-overlay-recording.mjs';
import {createPresentation} from '../api/presentation.mjs';

test('overlay sample contains exact canonical accepted scenes and independent reduced-motion scenes',async()=>{
 const demo=await acceptedDemoTrace(),records=[...sceneRecords(demo,[10,4010,8010,12010,16010,22500])];
 const direct=createPresentation(demo.policy);
 const expected=direct.frame(demo.trace[0].view,demo.trace[0].announcements,10,{brightness:.85,reducedMotion:false,attentionEnabled:true});
 assert.deepEqual(records[0].scene,expected.scene);
 assert.equal(records.length,6);assert.equal(records[0].scene.lights.length,1170);
 assert.equal(records[1].semantic.concerns[0].severity.assessment,'provisional');
 assert.equal(records[2].semantic.concerns[0].severity.assessment,'established');
 assert.equal(records[3].semantic.concerns[0].acknowledged,true);assert.equal(records[3].semantic.concerns[0].lifecycle,'open');
 assert.equal(records[4].semantic.concerns[0].lifecycle,'resolved');assert.equal(records[5].scene.state,'unknown');
 assert.notDeepEqual(records[0].scene,records[0].reducedScene);
 const stable=[...sceneRecords(demo,[10,1000])];
 assert.deepEqual(stable[0].reducedScene.lights,stable[1].reducedScene.lights);
 assert.notDeepEqual(stable[0].scene.lights,stable[1].scene.lights);
});

test('JSONL tape has truthful synthetic header/count and individually parseable complete scene records',async()=>{
 const output=await buildOverlayRecording({sample:true}),lines=(await readFile(output,'utf8')).trimEnd().split('\n').map(JSON.parse);
 const header=lines.shift();assert.equal(header.syntheticOnly,true);assert.equal(header.frameCount,lines.length);assert.equal(header.durationMs,26000);
 for(const r of lines){assert.equal(r.scene.glows.length,9);assert.equal(r.scene.lights.length,1170);assert.equal(r.reducedScene.lights.length,1170);assert.equal(r.semantic.mode,'synthetic')}
 assert.ok(lines.every((r,i)=>!i||r.at>lines[i-1].at));
});
