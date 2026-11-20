import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {EventEmitter} from 'node:events';
import {PassThrough, Writable} from 'node:stream';
import {createTurmoProjection} from '../api/turmo.mjs';
import {drawTurmo} from '../renderers/turmo.mjs';
import {canvasRgb565, createTurmoFrameSink, createTurmoPipeSender} from '../renderers/turmo-writer.mjs';
import {host, preferences} from './helpers/embedded-fixtures.mjs';

const require = createRequire(import.meta.url);
const {createCanvas} = require(process.env.BRIAR_CANVAS_MODULE);
function frames() {
  const {api} = host();
  const display = createTurmoProjection({userId:'alex-demo', workspaceId:'workspace-demo',
    userLabel:'Alex', producerLabels:{demo:'Local'}, ownerCurrent:()=>true,
    readAccepted:now=>api.user.read(now), seed:123, transitionMs:400, carouselMs:200,
    maxAnimationStepMs:500, speeds:{idle:.3,working:.8,waiting:.4,attention:1.2,unknown:.2}});
  return [0, 100, 200].map(now => display.frame({now, preferences}));
}

test('Canvas conversion is exactly RGB565 little endian', () => {
  const canvas = createCanvas(320,480), ctx = canvas.getContext('2d');
  for (const [x,color] of ['#ff0000','#00ff00','#0000ff','#ffffff'].entries()) {
    ctx.fillStyle = color; ctx.fillRect(x,0,1,1);
  }
  const pixels = canvasRgb565(canvas);
  assert.equal(pixels.length,307200);
  assert.deepEqual([...pixels.subarray(0,8)],[0,248,224,7,31,0,255,255]);
});

test('one active and newest waiting frame only; skipped scenes are not rendered', async () => {
  const canvas = createCanvas(320,480), sent=[], releases=[];
  const sink = createTurmoFrameSink({canvas,send:pixels=>{
    sent.push(pixels); return new Promise(resolve=>releases.push(resolve));
  }});
  const [first,skipped,latest] = frames();
  const expectedCanvas = createCanvas(320,480);
  drawTurmo(expectedCanvas.getContext('2d'),latest);
  const expected = canvasRgb565(expectedCanvas);
  sink.offer(first); sink.offer(skipped); sink.offer(latest);
  latest.ring.color.fill(0); // The waiting frame is isolated from host mutation.
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(sent.length,1); assert.equal(sink.read().replaced,1);
  releases.shift()(); await new Promise(resolve=>setImmediate(resolve));
  assert.equal(sent.length,2); assert.notDeepEqual(sent[0],sent[1]);
  assert.deepEqual(sent[1],expected,'Pending scene is isolated from later host mutation');
  releases.shift()(); await sink.flush();
  assert.equal(sink.read().consumed,2);
  await sink.stop(); assert.equal(sink.offer(first).code,'STOPPED');
});

test('failure stops replay; stop drops waiting scenes and drains only the current slice', async () => {
  const canvas = createCanvas(320,480), [frame] = frames();
  let sent=0;
  const sink = createTurmoFrameSink({canvas,send:async()=>{sent++;throw new Error('USB fault');}});
  sink.offer(frame); sink.offer(frame);
  await assert.rejects(sink.flush(),/USB fault/);
  assert.equal(sent,1); assert.equal(sink.offer(frame).code,'WRITER_FAULT');
  let release;
  const draining = createTurmoFrameSink({canvas,send:()=>new Promise(resolve=>{release=resolve;})});
  draining.offer(frame); draining.offer(frame);
  const stopped=draining.stop();
  await new Promise(resolve=>setImmediate(resolve)); release(); await stopped;
  assert.equal(draining.read().consumed,1); assert.equal(draining.read().waiting,false);
});

test('local pipe rejects malformed ACK and child exit instead of hanging', async () => {
  for (const reason of ['bad-ack','exit']) {
    const child = new EventEmitter();
    child.stdin = new Writable({write(data,encoding,callback){callback();}});
    child.stdout = new PassThrough();
    const sender = createTurmoPipeSender(child);
    const sent = sender.send(Buffer.alloc(307200));
    if (reason === 'bad-ack') child.stdout.write(Buffer.from([2]));
    else child.emit('exit',1);
    await assert.rejects(sent,reason === 'bad-ack' ? /ACK/ : /exited/);
    await assert.rejects(sender.send(Buffer.alloc(307200)));
    sender.close();
  }
});

test('real Canvas frames pass through the local Python scheduler pipe without hardware', {timeout:20000}, async t => {
  const child = spawn(process.env.BRIAR_TEST_PYTHON ?? 'python3',
    [new URL('../../prototypes/portrait-presence-01/turmo-live-writer.py',import.meta.url).pathname,'--simulate'],
    {stdio:['pipe','pipe','pipe']});
  t.after(()=>{if(child.exitCode === null) child.kill();});
  let errors=''; child.stderr.on('data',data=>{errors=(errors+data.toString()).slice(-2000);});
  const exit=once(child,'exit');
  const sender = createTurmoPipeSender(child);
  const sink = createTurmoFrameSink({canvas:createCanvas(320,480),send:sender.send});
  const [first,skipped,latest] = frames();
  sink.offer(first); sink.offer(skipped); sink.offer(latest);
  await sink.flush();
  assert.equal(sink.read().consumed,2); assert.equal(sink.read().replaced,1);
  await sink.stop(); sender.close();
  const [code] = await exit;
  assert.equal(code,0,errors);
});
