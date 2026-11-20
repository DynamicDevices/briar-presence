// Trusted accepted-state -> live TURMO scene. No MQTT, serial I/O or ambient clock.
// This is a display adapter, not a producer payload or an authentication boundary.
import {createPresence} from '../core/presence.mjs';
import {jsonData} from '../core/state.mjs';

const copy = value => JSON.parse(JSON.stringify(value));
const text = value => typeof value === 'string' && Boolean(value.trim());
const key = (workspace, producer, kind, id) => JSON.stringify([workspace, producer, kind, id]);
const blue = [100, 196, 250], amber = [255, 188, 95], neutral = [116, 132, 145];
const mix = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
function groupFor(identity) {
  let hash = 2166136261;
  for (let i = 0; i < identity.length; i++) hash = Math.imul(hash ^ identity.charCodeAt(i), 16777619) >>> 0;
  return hash % 9;
}
function dimOwner(view) {
  const result = copy(view);
  for (const p of result.producers) {
    p.lease = 'unknown';
    for (const f of [...p.work, ...p.retainedWork, ...p.concerns]) f.freshness = 'unknown';
  }
  return result;
}

export function createTurmoProjection({userId, workspaceId, userLabel, producerLabels,
  readAccepted, ownerCurrent, seed, transitionMs, carouselMs, maxAnimationStepMs, speeds}) {
  if (![userId, workspaceId, userLabel].every(text) || !jsonData(producerLabels) ||
      !producerLabels || Array.isArray(producerLabels) || !Object.values(producerLabels).every(text) ||
      typeof readAccepted !== 'function' || typeof ownerCurrent !== 'function' ||
      !Number.isFinite(transitionMs) || transitionMs <= 0 || !Number.isFinite(carouselMs) || carouselMs <= 0 ||
      !Number.isFinite(maxAnimationStepMs) || maxAnimationStepMs <= 0 ||
      !jsonData(speeds) || !speeds || !['idle', 'working', 'waiting', 'attention', 'unknown'].every(k =>
        Number.isFinite(speeds[k]) && speeds[k] >= 0)) throw new TypeError('Explicit bound TURMO host/display policy required');
  const labels = new Map(Object.entries(producerLabels)), velocity = {...speeds};
  const model = createPresence(seed);
  let accepted = {ok: true, userId, workspaceId, producers: []};
  let previous = null, from = null, transitionAt = 0, lastTime = null, angle = 0, phase = 0;

  function facts(view) {
    const rows = [], concerns = [], requests = [], sources = [];
    for (const p of view.producers) {
      sources.push({producerId: p.id, generation: p.generation, revision: p.revision, lease: p.lease});
      const current = fact => p.lease === 'active' && fact.freshness === 'current';
      const open = p.concerns.filter(c => c.lifecycle === 'open');
      const work = [...p.work, ...p.retainedWork];
      const requestFresh = request => {
        const linked = request.concernId ? p.concerns.find(c => c.id === request.concernId) :
          request.workId ? work.find(w => w.id === request.workId) : null;
        // A live socket alone cannot date an unattached request.
        return Boolean(linked && current(linked));
      };
      for (const c of open) concerns.push({...copy(c), producerId: p.id,
        key: key(workspaceId, p.id, 'concern', c.id), current: current(c) && !c.sourceOmitted});
      for (const a of p.attentionItems.filter(a => a.state === 'open')) requests.push({...copy(a), producerId: p.id,
        key: key(workspaceId, p.id, 'attention', a.id), current: requestFresh(a)});
      const makeRow = (record, kind) => {
        const linked = kind === 'work' ? open.filter(c => c.workId === record.id) : kind === 'concern' ? [record] : [];
        const attention = kind === 'attention' ? [record] : p.attentionItems.filter(a => a.state === 'open' && a.category !== 'for-awareness' &&
          (kind === 'work' ? a.workId === record.id || linked.some(c => c.id === a.concernId) : a.concernId === record.id));
        const fresh = kind === 'attention' ? requestFresh(record) : current(record) && !record.sourceOmitted;
        let nextActor = null;
        if (fresh && kind === 'work' && record.lifecycle === 'running') nextActor = labels.get(p.id);
        if (fresh && kind === 'work' && record.lifecycle === 'waiting') nextActor =
          ({user: userLabel, person: 'Other person', external: 'External service', dependency: 'Dependency'})[record.wait?.party] ?? null;
        const identity = key(workspaceId, p.id, kind, record.id);
        return {key: identity, producerId: p.id, kind, id: record.id, label: record.label ?? record.summary,
          lifecycle: kind === 'attention' ? 'waiting' : record.lifecycle, freshness: fresh ? 'current' : 'unknown', nextActor,
          observedAt: record.observedAt ?? null, tracking: record.tracking ?? 'tracked',
          wait: record.wait ? copy(record.wait) : null, outcome: record.result?.outcome ?? null,
          concerns: linked.map(c => ({id: c.id, acknowledged: c.acknowledged, assessment: c.severity?.assessment ?? 'unassessed',
            level: c.severity?.level ?? 'unassessed', current: current(c) && !c.sourceOmitted})),
          attention: attention.map(a => ({id: a.id, category: a.category, current: requestFresh(a),
            summary: a.summary, ...(a.request ? {request: a.request} : {}),
            ...(a.timing ? {timing: copy(a.timing)} : {})})), group: groupFor(identity)};
      };
      for (const w of work) rows.push(makeRow(w, 'work'));
      // Omitted/finished work cannot hide a free-standing unresolved concern.
      for (const c of open.filter(c => !work.some(w => w.id === c.workId))) rows.push(makeRow(c, 'concern'));
      for (const a of p.attentionItems.filter(a => a.state === 'open' && !work.some(w => w.id === a.workId) &&
        !open.some(c => c.id === a.concernId))) rows.push(makeRow(a, 'attention'));
    }
    rows.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
    const responding = requests.filter(a => a.current && a.category !== 'for-awareness');
    const work = rows.filter(r => r.kind === 'work');
    const live = work.some(w => w.freshness === 'current') || concerns.some(c => c.current) ||
      (rows.length === 0 && sources.some(p => p.lease === 'active'));
    const mode = !live ? 'unknown' : responding.length ? 'attention' : concerns.length ? 'concern' :
      work.some(w => w.freshness === 'current' && w.lifecycle === 'running') ? 'working' :
      work.some(w => w.freshness === 'current' && w.lifecycle === 'waiting') ? 'waiting' : 'quiet';
    return {rows, sources, concerns, requests, mode, workCount: work.length,
      concernCount: concerns.length, responseCount: responding.length,
      currentWorkCount: work.filter(w => w.freshness === 'current').length};
  }

  return Object.freeze({
    frame({now, preferences}) {
      if (!Number.isFinite(now) || now < 0 || lastTime !== null && now < lastTime) return {ok: false, code: 'CLOCK'};
      if (!jsonData(preferences) || !preferences || !Number.isFinite(preferences.brightness) || preferences.brightness < 0 ||
          preferences.brightness > 1 || typeof preferences.reducedMotion !== 'boolean' ||
          typeof preferences.attentionEnabled !== 'boolean') return {ok: false, code: 'PREFERENCES'};
      const connected = ownerCurrent(now);
      if (typeof connected !== 'boolean') return {ok: false, code: 'OWNER_STATUS'};
      let nextAccepted = accepted;
      if (connected) {
        const candidate = readAccepted(now);
        if (!jsonData(candidate) || candidate?.ok !== true || candidate.userId !== userId || candidate.workspaceId !== workspaceId ||
            !Array.isArray(candidate.producers) || candidate.producers.some(p => !p || !labels.has(p.id) ||
              !['active', 'expired', 'unknown'].includes(p.lease) ||
              ![p.work, p.retainedWork, p.concerns, p.attentionItems].every(Array.isArray)) ||
            new Set(candidate.producers.map(p => p.id)).size !== candidate.producers.length) return {ok: false, code: 'ACCEPTED_VIEW'};
        nextAccepted = copy(candidate);
      }
      let semantic;
      try { semantic = facts(connected ? nextAccepted : dimOwner(accepted)); }
      catch { return {ok: false, code: 'ACCEPTED_VIEW'}; }
      accepted = nextAccepted;
      const dt = lastTime === null ? 0 : now - lastTime;
      const {brightness, reducedMotion, attentionEnabled} = preferences;
      const elapsed = Math.min(dt, maxAnimationStepMs);
      if (!reducedMotion && semantic.mode !== 'unknown') phase += elapsed / 1000;
      const movement = semantic.mode === 'attention' && attentionEnabled ? 'attending' : semantic.mode === 'working' ? 'working' : 'quiet';
      const raw = model.sample({time: phase, state: movement, reducedMotion});
      if (raw.glows.length !== 9 || raw.lights.length !== 1170) throw new TypeError('Reference layout changed; review TURMO adapter');
      if (!previous || semantic.mode !== previous.semantic.mode || reducedMotion !== previous.preferences.reducedMotion) {
        from = previous ? copy(previous.scene) : null; transitionAt = now;
      }
      const blend = from ? smooth((now - transitionAt) / transitionMs) : 1;
      const groups = Array.from({length: 9}, () => ({current: false, concern: false, attention: false, keys: []}));
      for (const row of semantic.rows) {
        const g = groups[row.group]; g.keys.push(row.key); g.current ||= row.freshness === 'current' || row.concerns.some(c => c.current);
        g.concern ||= row.concerns.length > 0;
        g.attention ||= row.attention.some(a => a.current);
      }
      // Geometry is sampled locally, not supplied by producer events or a tape.
      const decorate = (point, at, collection, group) => {
        const g = groups[group], prior = previous?.scene[collection][at], start = from?.[collection][at];
        const frozen = semantic.mode === 'unknown' || g.keys.length > 0 && !g.current;
        const color = g.concern ? amber : frozen ? neutral : g.attention ? amber : blue;
        const result = {...point, color: [...color], opacity: point.opacity * brightness * (frozen ? 0.55 : 1)};
        const fade = reducedMotion ? 1 : 1 - Math.exp(-elapsed / transitionMs);
        if (prior) result.color = prior.color.map((v, i) => mix(v, color[i], fade));
        if (prior && (frozen || reducedMotion)) {
          for (const k of ['x', 'y', 'rx', 'ry']) if (k in prior) result[k] = prior[k];
        } else if (start) {
          for (const k of ['x', 'y', 'rx', 'ry']) if (k in point) result[k] = mix(start[k], point[k], blend);
        }
        return result;
      };
      const scene = {...raw, glows: raw.glows.map((p, i) => decorate(p, i, 'glows', i)),
        lights: raw.lights.map((p, i) => decorate(p, i, 'lights', Math.floor(i / 130)))};
      const category = semantic.mode === 'unknown' ? 'unknown' : semantic.mode === 'attention' && attentionEnabled ? 'attention' :
        semantic.mode === 'working' ? 'working' : semantic.mode === 'waiting' ? 'waiting' : 'idle';
      if (!reducedMotion) angle = (angle + elapsed / 1000 * velocity[category]) % (2 * Math.PI);
      const pinned = semantic.rows.find(r => r.attention.some(a => a.current)) ?? semantic.rows.find(r => r.concerns.length);
      const cycling = semantic.rows.filter(r => r !== pinned);
      const offset = Math.floor(now / carouselMs) % Math.max(1, cycling.length);
      const rows = pinned ? [pinned, ...(cycling.length ? [cycling[offset]] : [])] :
        cycling.length > 1 ? [cycling[offset], cycling[(offset + 1) % cycling.length]] : cycling;
      const result = {ok: true, now, semantic, scene, groups, rows, preferences: copy(preferences),
        ring: {angle, color: semantic.mode === 'unknown' ? [...neutral] : category === 'attention' ? [...amber] : [...blue],
          speed: reducedMotion ? 0 : velocity[category], label: semantic.mode === 'unknown' ? 'Unknown — neutral local idle bar' :
            semantic.mode === 'working' ? 'Current work reported' : 'Local display animation'}, ownerCurrent: connected};
      if (previous) {
        const fade = reducedMotion ? 1 : 1 - Math.exp(-elapsed / transitionMs);
        result.ring.color = previous.ring.color.map((v, i) => mix(v, result.ring.color[i], fade));
      }
      // Retain only animation state, not another copy of private row labels/facts.
      previous = {scene: copy(scene), semantic: {mode: semantic.mode},
        preferences: {reducedMotion}, ring: {color: [...result.ring.color]}};
      lastTime = now;
      return result;
    }
  });
}
