// Pure accepted-view publication and receiver. Hosts provide full schema validation,
// authenticated topic bindings, clocks and resource limits. No MQTT/network I/O.
import {jsonData} from '../../core/state.mjs';

const copy = value => structuredClone(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const positive = value => Number.isFinite(value) && value > 0;
const failure = code => ({ok: false, code});
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
function valid(validate, message) {
  try { return jsonData(message) && validate(copy(message))?.valid === true; } catch { return false; }
}

export function createViewPublisher({exportAccepted, validate, ownerEpoch, ownerLeaseMs}) {
  if (typeof exportAccepted !== 'function' || typeof validate !== 'function' || !text(ownerEpoch) || !positive(ownerLeaseMs)) throw new TypeError('Explicit publisher bindings required');
  let sequence = 0;
  return Object.freeze({
    snapshot(now, requestNonce = null) {
      if (sequence >= Number.MAX_SAFE_INTEGER || (requestNonce !== null && !text(requestNonce))) return failure('PUBLICATION_INPUT');
      const exported = exportAccepted(now);
      if (!exported.ok) return exported;
      const generated = Date.parse(exported.generatedAt);
      if (!Number.isFinite(generated) || !Number.isFinite(generated + ownerLeaseMs) || Math.abs(generated + ownerLeaseMs) > 8640000000000000) return failure('CLOCK');
      const envelope = {kind: 'presence.view', version: '0.1-draft.1', requiredFeatures: [],
        userId: exported.view.userId, workspaceId: exported.view.workspaceId, ownerEpoch, sequence: sequence + 1,
        generatedAt: exported.generatedAt, ownerValidUntil: new Date(generated + ownerLeaseMs).toISOString(),
        sources: copy(exported.sources), view: copy(exported.view),
        freshnessPolicy: {clockDomain: 'utc-with-monotonic-deadlines', observationTtlMs: exported.observationTtlMs},
        ...(requestNonce === null ? {} : {sync: {requestNonce}})};
      if (!valid(validate, envelope)) return failure('VIEW_SCHEMA');
      sequence++;
      return {ok: true, envelope};
    }
  });
}

export function createViewReceiver({userId, workspaceId, validate, maxClockSkewMs, maxOwnerLeaseMs}) {
  if (!text(userId) || !text(workspaceId) || typeof validate !== 'function' || !Number.isFinite(maxClockSkewMs) || maxClockSkewMs < 0 || !positive(maxOwnerLeaseMs)) throw new TypeError('Explicit receiver bindings required');
  let online = false, synchronised = false, pendingNonce = null, current = null;
  let lastWall = null, lastMono = null, lastAnnouncement = 0, pendingAnnouncements = [];
  const nonces = new Set();
  function clocks(wallNow, monotonicNow) {
    if (!Number.isFinite(wallNow) || wallNow < 0 || !Number.isFinite(monotonicNow) || monotonicNow < 0 ||
        (lastWall !== null && (wallNow < lastWall || monotonicNow < lastMono || Math.abs((wallNow - lastWall) - (monotonicNow - lastMono)) > maxClockSkewMs))) {
      synchronised = false; pendingNonce = null; pendingAnnouncements = [];
      return false;
    }
    lastWall = wallNow; lastMono = monotonicNow;
    return true;
  }
  function semantics(e, wallNow) {
    if (e.userId !== userId || e.workspaceId !== workspaceId || e.view.userId !== userId || e.view.workspaceId !== workspaceId) return 'VIEW_SCOPE';
    if (e.requiredFeatures.length) return 'UNSUPPORTED_FEATURE';
    const generated = Date.parse(e.generatedAt), until = Date.parse(e.ownerValidUntil);
    if (generated > wallNow + maxClockSkewMs || until <= generated || until - generated > maxOwnerLeaseMs || until <= wallNow + maxClockSkewMs) return 'VIEW_TIME';
    if (new Set(e.sources.map(s => s.producerId)).size !== e.sources.length || e.sources.length !== e.view.producers.length ||
        new Set(e.view.producers.map(p => p.id)).size !== e.view.producers.length) return 'SOURCE_BINDING';
    for (const s of e.sources) {
      const p = e.view.producers.find(p => p.id === s.producerId);
      if (!p || s.generation !== p.generation || s.revision !== p.revision) return 'SOURCE_BINDING';
      if ((s.lastReceivedAt === null) !== (s.leaseValidUntil === null)) return 'SOURCE_TIME';
      if (s.lastReceivedAt !== null && (Date.parse(s.lastReceivedAt) > generated || Date.parse(s.leaseValidUntil) <= Date.parse(s.lastReceivedAt))) return 'SOURCE_TIME';
      for (const collection of [p.work, p.retainedWork, p.concerns, p.attentionItems]) if (new Set(collection.map(x => x.id)).size !== collection.length) return 'DUPLICATE_ID';
      for (const fact of [...p.work, ...p.retainedWork, ...p.concerns]) if (Date.parse(fact.observedAt) > generated + maxClockSkewMs) return 'OBSERVATION_TIME';
      for (const c of p.concerns) if (c.userResolution && (c.userResolution.producerId !== p.id || c.userResolution.id !== c.id || c.userResolution.revision !== c.revision)) return 'RESOLUTION_BINDING';
    }
    const sequences = e.view.announcements.map(a => a.sequence);
    if (sequences.some((n, i) => i && n <= sequences[i - 1])) return 'ANNOUNCEMENT_ORDER';
    return null;
  }
  return Object.freeze({
    beginSync(nonce) {
      if (!text(nonce) || nonces.has(nonce)) return failure('SYNC_NONCE');
      nonces.add(nonce); pendingNonce = nonce; online = true; synchronised = false;
      lastWall = null; lastMono = null; pendingAnnouncements = [];
      return {ok: true};
    },
    disconnect() { online = false; synchronised = false; pendingNonce = null; pendingAnnouncements = []; },
    receive(envelope, {wallNow, monotonicNow, retained = false, route} = {}) {
      if (!online) return failure('DISCONNECTED');
      if (retained || !['view', 'sync'].includes(route)) return failure('VIEW_ROUTE');
      if (!valid(validate, envelope)) return failure('VIEW_SCHEMA');
      const e = copy(envelope), invalid = semantics(e, wallNow);
      if (invalid) return failure(invalid);
      if (!clocks(wallNow, monotonicNow)) return failure('CLOCK');
      const bootstrap = pendingNonce !== null;
      if (bootstrap && (route !== 'sync' || e.sync?.requestNonce !== pendingNonce)) return failure('SYNC_REQUIRED');
      if (!bootstrap && (route !== 'view' || e.sync)) return failure('VIEW_ROUTE');
      if (!bootstrap && (!synchronised || e.ownerEpoch !== current.envelope.ownerEpoch)) {
        synchronised = false; pendingAnnouncements = [];
        return failure('SYNC_REQUIRED');
      }
      const bytes = canonical(e);
      if (current && e.ownerEpoch === current.envelope.ownerEpoch) {
        if (e.sequence < current.envelope.sequence) return failure('VIEW_ORDER');
        if (e.sequence === current.envelope.sequence) return bytes === current.bytes && !bootstrap ? {ok: true, duplicate: true} : failure('VIEW_CONFLICT');
      }
      current = {envelope: e, bytes, receivedWall: wallNow, receivedMono: monotonicNow,
        ownerDeadline: monotonicNow + Math.max(0, Date.parse(e.ownerValidUntil) - wallNow - maxClockSkewMs)};
      if (bootstrap) { lastAnnouncement = Math.max(0, ...e.view.announcements.map(a => a.sequence)); pendingAnnouncements = []; }
      else for (const a of e.view.announcements) if (a.sequence > lastAnnouncement) {
        pendingAnnouncements.push(copy(a)); lastAnnouncement = a.sequence;
      }
      pendingNonce = null; synchronised = true;
      return {ok: true, duplicate: false, bootstrap};
    },
    read({wallNow, monotonicNow}) {
      const clockOk = clocks(wallNow, monotonicNow);
      const freshOwner = Boolean(clockOk && online && synchronised && current && monotonicNow < current.ownerDeadline);
      if (!current) return {ok: true, connection: 'unknown', view: null, announcements: []};
      const e = current.envelope, view = copy(e.view);
      const effectiveNow = clockOk ? Math.max(wallNow, current.receivedWall + monotonicNow - current.receivedMono) + maxClockSkewMs : Infinity;
      for (const p of view.producers) {
        const s = e.sources.find(s => s.producerId === p.id);
        p.lease = !freshOwner ? 'unknown' : s.leaseValidUntil === null ? 'unknown' : effectiveNow < Date.parse(s.leaseValidUntil) ? 'active' : 'expired';
        for (const record of [...p.work, ...p.concerns]) {
          const age = effectiveNow - Date.parse(record.observedAt);
          // Keep JSON finite on clock failure while refusing to call it fresh.
          record.ageMs = Number.isFinite(age) ? Math.max(0, age) : record.ageMs;
          record.freshness = p.lease === 'active' && age < e.freshnessPolicy.observationTtlMs ? 'current' : 'stale';
        }
        for (const record of p.retainedWork) record.freshness = 'unknown';
      }
      const announcements = freshOwner ? pendingAnnouncements.splice(0) : [];
      if (!freshOwner) pendingAnnouncements = [];
      return {ok: true, connection: freshOwner ? 'current' : 'unknown', view, announcements,
        timing: {ownerValidUntil: e.ownerValidUntil, observationTtlMs: e.freshnessPolicy.observationTtlMs,
          sources: copy(e.sources), conservativeClockSkewMs: maxClockSkewMs}};
    }
  });
}
