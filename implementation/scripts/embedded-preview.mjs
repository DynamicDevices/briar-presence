// Recorded synthetic host: validates through the real API, then bundles a
// browser-only playback. No server, live harness, installed app or dependencies.
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createEmbeddedPresence} from '../api/embedded.mjs';
import {validate, epochMs, snapshot, work, concern, severity, ack} from '../test/helpers/embedded-fixtures.mjs';

export function createAcceptedDemoTrace() {
const policy = {seed: 0x5eed1234, cueDurationMs: 1800, cueSpeedMultiplier: 1.6};
const api = createEmbeddedPresence({userId: 'alex-demo', workspaceId: 'workspace-demo', validate,
  policy: {epochMs, observationTtlMs: 22000, futureSkewMs: 5, groupWindowMs: 10}, presentation: policy});
const {port} = api.admitProducer({producerId: 'demo', session: 'session-a', generation: 1, leaseMs: 14000, userRaisedConcernIds: ['risk']}, 0);
const preferences = {brightness: 0.85, reducedMotion: false, attentionEnabled: true};
const trace = [];
function capture(at, label, acknowledgement = null) {
  const shown = api.user.present({now: at, preferences});
  assert.equal(shown.ok, true);
  trace.push({at, label, view: api.user.read(at), announcements: shown.newAnnouncements, acknowledgement});
}
const job = work('cedar', 0, {label: 'Synthetic API checks'});
const risk = concern('risk', 4000, {origin: 'user', workId: 'cedar', severity: severity('critical', 'provisional', 'Possible irreversible loss')});
assert.equal(port.submit(snapshot(1, 0, {work: [job]}), 0).ok, true);
capture(10, 'Working quietly');
assert.equal(port.submit(snapshot(2, 4000, {work: [job], concerns: [risk]}), 4000).ok, true);
capture(4010, 'Possible concern — amber, not yet confirmed');
const established = {...risk, revision: 2, observedAt: new Date(epochMs + 8000).toISOString(), severity: severity('critical', 'established', 'Confirmed irreversible loss')};
assert.equal(port.submit(snapshot(3, 8000, {work: [job], concerns: [established]}), 8000).ok, true);
capture(8010, 'Confirmed concern — brief rose cue, then steady');
assert.equal(api.user.acknowledge(ack('risk', 2, 0), 12000).ok, true);
capture(12010, 'Acknowledged — still open', {producerId: 'demo', id: 'risk', revision: 2});
assert.equal(api.user.resolveConcern({producerId: 'demo', id: 'risk', revision: 2, reason: 'Synthetic evidence reviewed', expectedViewRevision: api.user.read(16000).viewRevision}, 16000).ok, true);
capture(16010, 'Explicitly resolved — quiet work remains');
capture(22500, 'Source expired — unknown, not healthy idle');
return {trace,policy};
}

export async function buildEmbeddedPreview() {
const {trace,policy}=createAcceptedDemoTrace();
const source = async path => (await readFile(new URL(path, import.meta.url), 'utf8'))
  .replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
const bundled = (await Promise.all(['../core/presence.mjs', '../api/presentation.mjs', '../renderers/canvas.mjs'].map(source))).join('\n');
const data = JSON.stringify({trace, policy}).replace(/</g, '\\u003c');
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Briar — synthetic embedded API preview</title><style>
body{margin:0;background:#d5dce0;color:#263746;font:16px system-ui;display:grid;place-items:center;min-height:100vh}
main{width:min(90vw,820px);display:flex;align-items:center;gap:2rem;padding:2rem}canvas{width:min(46vw,360px);height:auto;background:radial-gradient(ellipse,#22334299,#22334200 72%);border-radius:38%;cursor:pointer}
section{max-width:360px}h1{font-size:1.2rem;font-weight:500}p{line-height:1.5}button{border:1px solid #9eafb8;border-radius:1rem;padding:.5rem 1rem;background:#edf2f4;color:inherit}small{color:#526775}details{line-height:1.5} @media(max-width:600px){main{flex-direction:column}canvas{width:65vw}}
</style><main><canvas width="720" height="920" aria-label="Animated clustered-light Briar face"></canvas><section>
<h1>Briar’s visual language</h1><small>Recorded synthetic API demonstration. No live harness connected.</small>
<p id="label" aria-live="polite"></p><p id="facts"></p><button id="pause">Pause</button>
<details><summary>What the lights mean</summary><p>Blue: ordinary work. Amber: possible concern. Rose: confirmed serious concern. Acknowledging is not resolving. An expired source is unknown.</p><p id="explain"></p></details>
<p><small>26-second loop · click the face to pause · respects reduced motion · no installed display changes</small></p></section></main>
<script type="module">${bundled}
const {trace,policy}=${data};
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),label=document.querySelector('#label'),facts=document.querySelector('#facts'),explain=document.querySelector('#explain');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');let controller=createPresentation(policy),index=-1,previous=0,elapsed=0,paused=false;
function toggle(){paused=!paused;document.querySelector('#pause').textContent=paused?'Resume':'Pause'}
canvas.addEventListener('click',toggle);document.querySelector('#pause').addEventListener('click',toggle);
function tick(stamp){if(previous&&!paused)elapsed+=Math.min(stamp-previous,100);previous=stamp;
 if(elapsed>=26000){elapsed%=26000;controller=createPresentation(policy);index=-1}
 const now=Math.max(10,elapsed),announcements=[];let changed=false;
 while(index+1<trace.length&&trace[index+1].at<=now){index++;changed=true;announcements.push(...trace[index].announcements);const a=trace[index].acknowledgement;if(a)controller.acknowledge(a.producerId,a.id,a.revision)}
 const entry=trace[Math.max(0,index)],f=controller.frame(entry.view,announcements,now,{brightness:.85,reducedMotion:reduced.matches,attentionEnabled:true});
 const ratio=devicePixelRatio||1,w=Math.round(canvas.clientWidth*ratio),h=Math.round(w*460/360);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
 drawCanvas(ctx,f.scene,{contrast:true});if(changed){label.textContent=entry.label;facts.textContent=f.semantic.explanations.slice(1,2).join(' ');explain.textContent=f.semantic.explanations.slice(2).join(' ')}requestAnimationFrame(tick)}requestAnimationFrame(tick);
</script></html>`;
const output = new URL('../test-artifacts/embedded-api-preview.html', import.meta.url);
await mkdir(new URL('.', output), {recursive: true});
await writeFile(output, html);
return fileURLToPath(output);
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(await buildEmbeddedPreview());
