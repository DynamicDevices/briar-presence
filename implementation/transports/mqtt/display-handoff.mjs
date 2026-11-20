// Trusted sidecar -> renderer plan, NOT a new MQTT payload or a frame stream.
// The receiver has already applied the full wire schema and scope/clock checks.
import {createPresentation} from '../../api/presentation.mjs';
import {createPresence} from '../../core/presence.mjs';

const copy = x => structuredClone(x);
const key = x => JSON.stringify([x.producerId, x.kind, x.id]);
const preferencesValid = p => p && Number.isFinite(p.brightness) && p.brightness >= 0 && p.brightness <= 1 &&
  typeof p.reducedMotion === 'boolean' && typeof p.attentionEnabled === 'boolean';

export function createDisplayHandoff({receiver, userId, workspaceId, seed, cueDurationMs, cueSpeedMultiplier}) {
  const presentation = createPresentation({seed, cueDurationMs, cueSpeedMultiplier});
  if (typeof receiver?.read !== 'function' || typeof userId !== 'string' || !userId.trim() || typeof workspaceId !== 'string' || !workspaceId.trim() ||
      !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new TypeError('Trusted receiver, scope and seed required');
  let lastMono = null;
  return Object.freeze({
    capture({wallNow, monotonicNow, preferences}) {
      // Validate first: a malformed request must not consume pending cues.
      if (!preferencesValid(preferences)) return {ok: false, code: 'PREFERENCES'};
      if (!Number.isFinite(wallNow) || wallNow < 0 || !Number.isFinite(monotonicNow) || monotonicNow < 0 ||
          (lastMono !== null && monotonicNow < lastMono)) return {ok: false, code: 'CLOCK'};
      lastMono = monotonicNow;
      const read = receiver.read({wallNow, monotonicNow});
      if (!read.ok) return read;
      const view = read.view ?? {ok: true, userId, workspaceId, viewRevision: 0, focus: null,
        acknowledgements: [], announcements: [], producers: []};
      // A lost/expired owner ends transient attention, not the concern. Without
      // clearing the local presentation cue here, a quick reconnect can revive
      // an old pulse even though the receiver correctly suppresses replay.
      const frame = presentation.frame(view, read.announcements, monotonicNow,
        read.connection === 'current' ? preferences : {...preferences, attentionEnabled: false});
      const skew = read.timing?.conservativeClockSkewMs ?? 0;
      const deadlines = (read.timing?.sources ?? []).map(s => ({producerId: s.producerId,
        leaseUntilUnixMs: s.leaseValidUntil === null ? null : Date.parse(s.leaseValidUntil) - skew}));
      const sourceUntil = producerId => deadlines.find(s => s.producerId === producerId)?.leaseUntilUnixMs ?? 0;
      const factDeadlines = [...frame.semantic.work.map(w => ({...w, kind: 'work'})), ...frame.semantic.concerns.map(c => ({...c, kind: 'concern'}))]
        .map(f => ({producerId: f.producerId, kind: f.kind, id: f.id,
          observedAtUnixMs: Date.parse(f.observedAt),
          validUntilUnixMs: Math.min(sourceUntil(f.producerId), Date.parse(f.observedAt) + (read.timing?.observationTtlMs ?? 0) - skew)}));
      const cueGroups = frame.cue ? frame.groups.filter(g => g.items.some(i => frame.cue.items.some(c => key(c) === key(i)))).map(g => g.index) : [];
      return {ok: true, plan: {kind: 'presence.display-plan', version: 1, syntheticOnly: true,
        seed, sampledAtUnixMs: wallNow, visualTimeSeconds: frame.scene.time,
        connection: read.connection, ownerValidUntilUnixMs: read.timing ? Date.parse(read.timing.ownerValidUntil) - skew : 0,
        semantic: frame.semantic, groups: frame.groups, sourceDeadlines: deadlines, factDeadlines,
        preferences: copy(preferences), speedMultiplier: frame.speedMultiplier,
        cue: frame.cue ? {startedAtUnixMs: wallNow + frame.cue.startedAt - monotonicNow,
          untilUnixMs: wallNow + frame.cue.until - monotonicNow, groups: cueGroups} : null}};
    }
  });
}

// Offline reference for the Godot port. Animation is extrapolated locally from
// a keyframe; no light positions or per-frame samples cross MQTT or the pipe.
export function sampleDisplayPlan(plan, {wallNow, elapsedMs}) {
  if (plan?.kind !== 'presence.display-plan' || plan.version !== 1 || !Number.isFinite(wallNow) ||
      !Number.isFinite(elapsedMs) || elapsedMs < 0) throw new TypeError('Trusted display plan and explicit clocks required');
  const now = Math.max(wallNow, plan.sampledAtUnixMs + elapsedMs);
  const ownerCurrent = plan.connection === 'current' && wallNow >= plan.sampledAtUnixMs && now < plan.ownerValidUntilUnixMs;
  const semantic = copy(plan.semantic);
  for (const source of semantic.sources) {
    const until = plan.sourceDeadlines.find(s => s.producerId === source.producerId)?.leaseUntilUnixMs;
    source.lease = !ownerCurrent || until === null || until === undefined ? 'unknown' : now < until ? 'active' : 'expired';
  }
  for (const [kind, records] of [['work', semantic.work], ['concern', semantic.concerns]]) for (const record of records) {
    const deadline = plan.factDeadlines.find(f => f.producerId === record.producerId && f.kind === kind && f.id === record.id);
    record.freshness = record.tracking === 'last-known-reference' ? 'unknown' : ownerCurrent && deadline && now < deadline.validUntilUnixMs ? 'current' : 'stale';
    record.ageMs = Math.max(record.ageMs, now - Date.parse(record.observedAt));
  }
  for (const request of semantic.requests) request.sourceLease = semantic.sources.find(s => s.producerId === request.producerId)?.lease ?? 'unknown';
  const facts = [...semantic.work, ...semantic.concerns];
  const unknown = !semantic.sources.some(s => s.lease === 'active') || (facts.length > 0 && !facts.some(f => f.freshness === 'current'));
  semantic.baseState = unknown ? 'unknown' : semantic.work.some(w => w.freshness === 'current' && w.lifecycle === 'running') ? 'working' :
    semantic.work.some(w => w.freshness === 'current' && w.lifecycle === 'waiting') ? 'waiting' : 'quiet';
  // Do not leave a frozen "current" explanation beside locally expired facts.
  if (!ownerCurrent) semantic.explanations = ['Synthetic demonstration — no live harness connected.',
    'Display connection is unknown; retained facts are last known. Open concerns are not resolved.'];
  else if (facts.some(f => f.freshness !== 'current')) semantic.explanations = ['Synthetic demonstration — no live harness connected.',
    'Some observations are stale or unknown; inspect the freshness of each item.'];
  const groups = copy(plan.groups);
  for (const group of groups) for (const item of group.items) {
    const record = (item.kind === 'concern' ? semantic.concerns : semantic.requests).find(r => r.producerId === item.producerId && r.id === item.id);
    group.uncertain ||= !record || (item.kind === 'concern' ? record.freshness !== 'current' || record.sourceOmitted : record.sourceLease !== 'active');
  }
  const cue = ownerCurrent && plan.preferences.attentionEnabled && plan.cue && now < plan.cue.untilUnixMs ? plan.cue : null;
  const movingCue = Boolean(cue && !plan.preferences.reducedMotion && semantic.baseState !== 'unknown');
  const extraMs = plan.cue && !plan.preferences.reducedMotion && plan.preferences.attentionEnabled ?
    Math.max(0, Math.min(now, plan.cue.untilUnixMs) - plan.sampledAtUnixMs) : 0;
  const visualTime = plan.visualTimeSeconds + (now - plan.sampledAtUnixMs + extraMs * (plan.speedMultiplier - 1)) / 1000;
  const scene = createPresence(plan.seed).sample({time: visualTime, state: movingCue ? 'attending' : semantic.baseState, reducedMotion: plan.preferences.reducedMotion});
  const treat = (record, index) => {
    const g = groups[index], steady = g.weight >= 3 ? .68 : .42;
    const pulse = cue && !plan.preferences.reducedMotion ? Math.sin(Math.PI * (now - cue.startedAtUnixMs) / (cue.untilUnixMs - cue.startedAtUnixMs)) : 0;
    const amount = cue?.groups.includes(index) ? steady + (.9 - steady) * pulse : steady;
    const color = g.color ? record.color.map((v, n) => Math.round(v * (1 - amount) + g.color[n] * amount)) : record.color;
    return {...record, color: g.uncertain ? color.map(v => Math.round(v * .7 + 115 * .3)) : color,
      opacity: Math.min(plan.preferences.brightness, record.opacity * plan.preferences.brightness)};
  };
  scene.glows = scene.glows.map((g, index) => treat(g, index));
  scene.lights = scene.lights.map((p, index) => treat(p, Math.floor(index / 130)));
  return {semantic, groups, scene};
}
