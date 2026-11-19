import test from 'node:test';
import assert from 'node:assert/strict';
import {createReferenceFixtures} from '../scripts/export-reference-scenes.mjs';
import {createPresence,STATES} from '../core/presence.mjs';
test('cross-renderer reference scenes serialize deterministically with source identity',()=>{
 const fixtures=createReferenceFixtures();
 assert.equal(fixtures.format,'briar-presence-reference-scenes/1');
 assert.match(fixtures.referenceCoreSha256,/^[a-f0-9]{64}$/);
 assert.deepEqual(JSON.parse(JSON.stringify(fixtures)),fixtures);
 assert.deepEqual(createReferenceFixtures(),fixtures);
 assert.deepEqual(fixtures.cases.map(value=>value.seed),[0x5eed1234,0,0xffffffff]);
 const states=new Set();
 for(const value of fixtures.cases){
  const model=createPresence(value.seed);
  for(const {input,scene}of value.samples){
   states.add(input.state);assert.equal(scene.version,1);
   assert.deepEqual(scene,model.sample(input));
   assert.equal(scene.lights.length,1170);assert.equal(scene.glows.length,9);
   for(const light of scene.lights){
    for(const key of ['x','y','radius','opacity'])assert.ok(Number.isFinite(light[key]));
    assert.ok(light.radius>0);assert.ok(light.opacity>=0&&light.opacity<=1);
    assert.ok(light.color.every(channel=>Number.isInteger(channel)&&channel>=0&&channel<=255));
   }
  }
 }
 assert.deepEqual([...states].sort(),[...STATES].sort());
});
test('reference cases expose backward seeking and static-state comparisons',()=>{
 const samples=createReferenceFixtures().cases[0].samples;
 assert.ok(samples.some((sample,i)=>i&&sample.input.time<samples[i-1].input.time));
 for(const state of ['waiting','unknown']){
  const pair=samples.filter(sample=>sample.input.state===state);
  assert.deepEqual(pair[0].scene.lights,pair[1].scene.lights);
 }
 const reduced=samples.filter(sample=>sample.input.reducedMotion);
 assert.deepEqual(reduced[0].scene.lights,reduced[1].scene.lights);
 const seek=samples.find(sample=>sample.input.time===7);
 assert.deepEqual(seek.scene,createPresence(0x5eed1234).sample(seek.input));
});
