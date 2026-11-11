// Portable accepted-state presentation. No I/O, ambient clock or DOM.
import {createPresence} from '../core/presence.mjs';

const copy = value => JSON.parse(JSON.stringify(value));
const severityRank = value => ({minor: 1, significant: 2, critical: 3})[value] ?? 0;
const key = (producerId, kind, id) => JSON.stringify([producerId, kind, id]);
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export function projectAcceptedView(view) {
  if (view?.ok !== true || !Array.isArray(view.producers)) throw new TypeError('Accepted scoped view required');
  const result = {version: '0.1-draft', mode: 'synthetic', userId: view.userId, workspaceId: view.workspaceId,
    viewRevision: view.viewRevision, focus: copy(view.focus), sources: [], work: [], concerns: [], requests: []};
  for (const p of view.producers) {
    result.sources.push({producerId: p.id, generation: p.generation, revision: p.revision, lease: p.lease});
    for (const w of [...p.work, ...p.retainedWork]) result.work.push({...copy(w), producerId: p.id});
    for (const c of p.concerns) result.concerns.push({...copy(c), producerId: p.id});
    for (const a of p.attentionItems) result.requests.push({...copy(a), producerId: p.id, sourceLease: p.lease});
  }
  result.concerns.sort((a, b) => Number(b.lifecycle === 'open') - Number(a.lifecycle === 'open') ||
    severityRank(b.severity?.level) - severityRank(a.severity?.level) || compare(key(a.producerId, 'concern', a.id), key(b.producerId, 'concern', b.id)));
  const facts = [...result.work, ...result.concerns];
  const unknown = !result.sources.some(s => s.lease === 'active') || (facts.length > 0 && !facts.some(f => f.freshness === 'current'));
  result.baseState = unknown ? 'unknown' : result.work.some(w => w.freshness === 'current' && w.lifecycle === 'running') ? 'working' :
    result.work.some(w => w.freshness === 'current' && w.lifecycle === 'waiting') ? 'waiting' : 'quiet';
  const open = result.concerns.filter(c => c.lifecycle === 'open');
  const requests = result.requests.filter(a => a.state === 'open' && a.category !== 'for-awareness');
  result.explanations = ['Synthetic demonstration — no live harness connected.',
    `${open.length} unresolved concern(s); ${requests.length} response request(s).`,
    ...open.map(c => `${c.producerId}/${c.id}: ${c.severity?.assessment === 'provisional' ? 'Possible ' : ''}${c.severity?.level ?? 'unassessed'} impact${c.severity?.assessment === 'provisional' ? ' — not confirmed' : ''}; ${c.acknowledged ? 'acknowledged, still open' : 'not acknowledged at this revision'}; ${c.freshness}${c.sourceOmitted ? '; source omitted this concern' : ''}. ${c.summary}`),
    ...requests.map(a => `${a.producerId}/${a.id}: ${a.category}. ${a.request ?? ''}${a.timing ? ` Timing: ${a.timing.basis}. Delay: ${a.timing.consequenceOfDelay}.` : ''} Source lease: ${a.sourceLease}.`)];
  return result;
}

function groupFor(producerId, kind, id) {
  let hash = 2166136261;
  for (const character of key(producerId, kind, id)) {
    // Explicit UTF-16 code units, including surrogate pairs, for deterministic keys.
    for (let i = 0; i < character.length; i++) hash = Math.imul(hash ^ character.charCodeAt(i), 16777619) >>> 0;
  }
  return hash % 9;
}

export function createPresentation({seed, cueDurationMs, cueSpeedMultiplier}) {
  if (!Number.isFinite(cueDurationMs) || cueDurationMs <= 0 || !Number.isFinite(cueSpeedMultiplier) || cueSpeedMultiplier < 1) throw new TypeError('Explicit synthetic cue policy required');
  const model = createPresence(seed);
  let lastTime = null, visualTime = 0, active = null, lastSequence = 0;
  const itemKey = item => key(item.producerId, item.kind, item.id);
  function relevant(item, view) {
    if (item.kind === 'attention') return view.requests.some(a => a.producerId === item.producerId && a.id === item.id && a.state === 'open' && a.category === 'time-sensitive');
    const c = view.concerns.find(c => c.producerId === item.producerId && c.id === item.id);
    if (!c || c.lifecycle !== 'open' || c.acknowledged) return false;
    if (item.reason === 'new-concern' && severityRank(c.severity?.level) < 2) return false;
    return item.reason !== 'critical-confirmed' || (c.severity?.level === 'critical' && c.severity?.assessment === 'established');
  }
  return Object.freeze({
    acknowledge(producerId, id, revision) {
      if (active) active.items = active.items.filter(i => !(i.kind === 'concern' && i.producerId === producerId && i.id === id && i.revision <= revision));
    },
    frame(view, announcements, now, preferences) {
      if (!Number.isFinite(now) || now < 0 || (lastTime !== null && now < lastTime)) throw new TypeError('Monotonic presentation time required');
      const {brightness, reducedMotion, attentionEnabled} = preferences;
      if (!Number.isFinite(brightness) || brightness < 0 || brightness > 1 || typeof reducedMotion !== 'boolean' || typeof attentionEnabled !== 'boolean') throw new TypeError('Explicit display preferences required');
      const semantic = projectAcceptedView(view);
      if (lastTime !== null) {
        const extra = active && !reducedMotion && attentionEnabled ? Math.max(0, Math.min(now, active.until) - lastTime) : 0;
        visualTime += (now - lastTime + extra * (cueSpeedMultiplier - 1)) / 1000;
      }
      lastTime = now;
      if (active && (now >= active.until || !attentionEnabled)) active = null;
      for (const a of announcements) {
        if (a.sequence <= lastSequence) continue;
        lastSequence = a.sequence;
        if (!attentionEnabled) continue;
        if (!active) active = {startedAt: now, until: now + cueDurationMs, items: []};
        for (const item of a.items) {
          const index = active.items.findIndex(i => itemKey(i) === itemKey(item));
          if (index < 0) active.items.push(copy(item)); else active.items[index] = copy(item);
        }
      }
      if (active) {
        active.items = active.items.filter(item => relevant(item, semantic));
        if (!active.items.length) active = null;
      }
      const groups = Array.from({length: 9}, (_, index) => ({index, items: [], weight: 0, color: null, uncertain: false}));
      const workGroup = (producerId, workId, fallbackKind, fallbackId) => groupFor(producerId, workId ? 'work' : fallbackKind, workId ?? fallbackId);
      const mark = (group, reference, weight, color, uncertain = false) => {
        groups[group].items.push(reference);
        groups[group].uncertain ||= uncertain;
        if (weight > groups[group].weight) Object.assign(groups[group], {weight, color});
      };
      for (const c of semantic.concerns.filter(c => c.lifecycle === 'open')) {
        const level = severityRank(c.severity?.level), established = c.severity?.assessment === 'established';
        mark(workGroup(c.producerId, c.workId, 'concern', c.id), {kind: 'concern', producerId: c.producerId, id: c.id},
          level === 3 && established ? 5 : level === 3 ? 4 : level === 2 ? 3 : 2,
          level === 3 && established ? [245, 84, 110] : level >= 2 ? [240, 174, 78] : [205, 188, 145], c.freshness !== 'current' || c.sourceOmitted);
      }
      for (const a of semantic.requests.filter(a => a.state === 'open' && a.category !== 'for-awareness')) {
        const c = semantic.concerns.find(c => c.producerId === a.producerId && c.id === a.concernId);
        const group = c ? workGroup(c.producerId, c.workId, 'concern', c.id) : workGroup(a.producerId, a.workId, 'attention', a.id);
        mark(group, {kind: 'attention', producerId: a.producerId, id: a.id}, a.category === 'time-sensitive' ? 3.5 : 1.5,
          a.category === 'time-sensitive' ? [225, 179, 110] : [134, 203, 220], a.sourceLease !== 'active');
      }
      const cueGroups = new Set();
      for (const item of active?.items ?? []) for (const g of groups) if (g.items.some(i => itemKey(i) === itemKey(item))) cueGroups.add(g.index);
      const stronger = Boolean(active), movingCue = stronger && !reducedMotion && semantic.baseState !== 'unknown';
      const scene = model.sample({time: visualTime, state: movingCue ? 'attending' : semantic.baseState, reducedMotion});
      if (scene.glows.length !== 9 || scene.lights.length !== 1170) throw new TypeError('Reference renderer group layout changed; review adapter');
      const treat = (record, index) => {
        const g = groups[index], steady = g.weight >= 3 ? 0.68 : 0.42;
        const pulse = active && !reducedMotion ? Math.sin(Math.PI * (now - active.startedAt) / cueDurationMs) : 0;
        const amount = cueGroups.has(index) ? steady + (0.9 - steady) * pulse : steady;
        const color = g.color ? record.color.map((v, n) => Math.round(v * (1 - amount) + g.color[n] * amount)) : record.color;
        return {...record, color: g.uncertain ? color.map(v => Math.round(v * 0.7 + 115 * 0.3)) : color,
          opacity: Math.min(brightness, record.opacity * brightness)};
      };
      scene.glows = scene.glows.map((g, index) => treat(g, index));
      // The unchanged reference generator emits nine contiguous 130-light groups.
      // This is an explicit adapter contract, not a portable scene-format claim.
      scene.lights = scene.lights.map((p, index) => treat(p, Math.floor(index / 130)));
      return {ok: true, now, semantic, groups: copy(groups), scene, newAnnouncements: copy(announcements),
        cue: active ? copy(active) : null, speedMultiplier: movingCue ? cueSpeedMultiplier : 1};
    }
  });
}
