import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';

test('recorded preview renders accepted transitions, replays and pauses without a server', {skip: !process.env.BRIAR_CANVAS_MODULE}, () => {
  const build = spawnSync(process.execPath, ['scripts/embedded-preview.mjs'], {cwd: new URL('..', import.meta.url), encoding: 'utf8', timeout: 15000, maxBuffer: 4096});
  assert.equal(build.status, 0, build.stderr);
  const html = readFileSync(new URL('../test-artifacts/embedded-api-preview.html', import.meta.url), 'utf8');
  const script = html.match(/<script type="module">([\s\S]*)<\/script>/)[1];
  const {createCanvas} = createRequire(import.meta.url)(process.env.BRIAR_CANVAS_MODULE);
  const canvas = createCanvas(360, 460);
  canvas.clientWidth = 360;
  canvas.addEventListener = () => {};
  const nodes = Object.fromEntries(['#label', '#facts', '#explain', '#pause'].map(id => [id, {textContent: '', addEventListener(_event, fn) {this.click = fn;}}]));
  let callback;
  const context = vm.createContext({document: {querySelector: id => id === 'canvas' ? canvas : nodes[id]},
    matchMedia: () => ({matches: false}), devicePixelRatio: 1, requestAnimationFrame: fn => {callback = fn;}});
  vm.runInContext(script, context, {timeout: 2000});
  assert.equal(vm.runInContext('projectAcceptedView(trace.at(-1).view).baseState', context), 'unknown');
  assert.equal(vm.runInContext('trace.at(-1).view.producers[0].lease', context), 'expired');
  const labels = new Set();
  for (let t = 1; t <= 26301; t += 100) {
    callback(t);
    labels.add(nodes['#label'].textContent);
  }
  assert.equal(labels.size, 6);
  assert.match(nodes['#label'].textContent, /Working quietly/);
  assert.ok(canvas.toBuffer('image/png').length > 1000);
  nodes['#pause'].click();
  const before = nodes['#label'].textContent;
  callback(40000);
  assert.equal(nodes['#pause'].textContent, 'Resume');
  assert.equal(nodes['#label'].textContent, before);
});
