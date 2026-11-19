// Offline state core. No I/O, ambient clock, renderer or live authentication.
// The caller must supply a real validator and trusted, already-authenticated context.
const copy = value => JSON.parse(JSON.stringify(value));
const text = value => typeof value === 'string' && value.trim().length > 0;
const normal = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
const integer = value => Number.isSafeInteger(value) && value > 0;
const rank = level => ({minor: 1, significant: 2, critical: 3})[level] ?? 0;
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
export function jsonData(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || ancestors.has(value)) return false;
  if (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
  ancestors.add(value);
  const keys = Reflect.ownKeys(value);
  const valid = keys.every(key => {
    if (Array.isArray(value) && key === 'length') return true;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return typeof key === 'string' && descriptor.enumerable && 'value' in descriptor && jsonData(descriptor.value, ancestors);
  }) && (!Array.isArray(value) || value.length === keys.length - 1);
  ancestors.delete(value);
  return valid;
}
function unique(items) { return new Set(items.map(x => x.id)).size === items.length; }
function requestSignature(items, concernId) {
  return canonical(items.filter(x => x.state === 'open' && x.concernId === concernId).map(x => ({
    id: x.id, category: x.category, request: normal(x.request ?? ''),
    workId: x.workId ?? null, concernId: x.concernId ?? null,
    timing: x.timing ? {basis: normal(x.timing.basis), consequenceOfDelay: normal(x.timing.consequenceOfDelay), deadline: x.timing.deadline ?? null} : null
  })).sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function createStateHandler({userId, workspaceId, validate, policy}) {
  if (!text(userId) || !text(workspaceId) || typeof validate !== 'function') throw new TypeError('Explicit scope and schema validator required');
  if (!policy || !Number.isFinite(policy.epochMs) || !Number.isFinite(policy.observationTtlMs) || policy.observationTtlMs <= 0 ||
      !Number.isFinite(policy.futureSkewMs) || policy.futureSkewMs < 0 || !Number.isFinite(policy.groupWindowMs) || policy.groupWindowMs < 0) {
    throw new TypeError('Explicit synthetic clock/freshness/grouping policy required');
  }
  policy = copy(policy);
  let state = {now: 0, producers: [], focus: null, viewRevision: 0, acknowledgements: [], closures: [], receipts: [], pending: null, announcements: []};
  const producer = (s, id) => s.producers.find(p => p.id === id);
  const acknowledged = (s, producerId, id, revision) => s.acknowledgements.some(a => a.producerId === producerId && a.id === id && a.revision === revision);
  // Cue eligibility remembers that the user has seen this concern. The view
  // still reports acknowledgement only for the exact revision actually seen.
  const previouslyAcknowledged = (s, producerId, id) => s.acknowledgements.some(a => a.producerId === producerId && a.id === id);
  const closed = (s, producerId, id) => s.closures.find(c => c.producerId === producerId && c.id === id);
  const userContext = context => context?.kind === 'user' && context.userId === userId && context.workspaceId === workspaceId;
  const error = code => ({ok: false, code});
  function clock(now) {
    if (!Number.isFinite(now) || !Number.isFinite(policy.epochMs + now) || now < state.now) return false;
    state.now = now;
    return true;
  }
  function transaction(now, operation) {
    if (!clock(now)) return error('CLOCK');
    const draft = copy(state);
    const result = operation(draft);
    if (!result.ok) return result;
    state = draft;
    return copy(result);
  }
  function announce(s, item) {
    if (!s.pending) s.pending = {firstAt: s.now, dueAt: s.now + policy.groupWindowMs, items: []};
    const existing = s.pending.items.findIndex(x => x.producerId === item.producerId && x.kind === item.kind && x.id === item.id);
    if (existing < 0) s.pending.items.push(item); else s.pending.items[existing] = item;
  }
  function removePending(s, producerId, concernId) {
    if (!s.pending) return;
    s.pending.items = s.pending.items.filter(x => !(x.producerId === producerId && x.kind === 'concern' && x.id === concernId));
    if (!s.pending.items.length) s.pending = null;
  }
  function semanticChecks(s, p, message, context) {
    // No optional feature is implemented by this offline core yet. Optional
    // extension data stays inert; a required capability must fail closed.
    if (message.requiredFeatures?.length) return 'UNSUPPORTED_FEATURE';
    if (![message.work, message.concerns, message.attentionItems].every(unique)) return 'DUPLICATE_ID';
    for (const w of message.work) {
      if (w.progress && w.progress.completed > w.progress.total) return 'PROGRESS';
      const visited = new Set([w.id]);
      let cursor = w;
      while (cursor.parentId) {
        if (visited.has(cursor.parentId)) return 'PARENT_CYCLE';
        visited.add(cursor.parentId);
        cursor = message.work.find(x => x.id === cursor.parentId);
        if (!cursor) return 'REFERENCE';
      }
    }
    for (const c of message.concerns) {
      const old = p.concernHistory.find(x => x.record.id === c.id);
      if (c.workId && !message.work.some(w => w.id === c.workId)) return 'REFERENCE';
      if (old && c.origin !== old.record.origin) return 'ORIGIN_CONFLICT';
      if (old && (c.revision < old.record.revision || (c.revision === old.record.revision && canonical(c) !== canonical(old.record)))) return 'CONCERN_REVISION';
      if (c.origin === 'user' && !old && !context.userRaisedConcernIds?.includes(c.id)) return 'USER_PROVENANCE';
      if (c.origin === 'user' && c.lifecycle === 'resolved' && !closed(s, p.id, c.id)) return 'USER_RESOLUTION_REQUIRED';
      if (c.origin === 'user' && closed(s, p.id, c.id) && c.revision > closed(s, p.id, c.id).revision) return 'USER_CLOSED_REVISION_CONFLICT';
    }
    const effectiveConcerns = [...message.concerns, ...p.concerns.filter(c => c.record.lifecycle === 'open' && !message.concerns.some(x => x.id === c.record.id)).map(c => c.record)];
    for (const a of message.attentionItems) {
      if (a.workId && !message.work.some(w => w.id === a.workId)) return 'REFERENCE';
      if (a.concernId && !effectiveConcerns.some(c => c.id === a.concernId)) return 'REFERENCE';
    }
    const timestamps = [message.observedAt, ...message.work.map(w => w.observedAt), ...message.concerns.map(c => c.observedAt)];
    if (timestamps.some(t => !Number.isFinite(Date.parse(t)) || Date.parse(t) > policy.epochMs + s.now + policy.futureSkewMs)) return 'OBSERVATION_TIME';
    return null;
  }
  function acceptSnapshot(s, message, context) {
    const p = producer(s, context.producerId);
    if (context.kind !== 'producer' || context.workspaceId !== workspaceId || !p || context.generation !== p.generation || message.session !== p.session) return error('SCOPE_OR_SESSION');
    const bytes = canonical(message);
    if (message.revision === p.revision) return bytes === p.canonical ? {ok: true, duplicate: true} : error('REVISION_CONFLICT');
    if (message.revision < p.revision) return error('STALE_REVISION');
    const invalid = semanticChecks(s, p, message, context);
    if (invalid) return error(invalid);
    const oldAttention = p.attentionItems;
    const nextConcerns = [];
    for (const c of message.concerns) {
      const old = p.concerns.find(x => x.record.id === c.id);
      const previous = p.concernHistory.find(x => x.record.id === c.id);
      const entry = {record: copy(c), lastReportedAt: s.now, sourceOmitted: false, knownRevisions: previous ? [...previous.knownRevisions] : []};
      if (!entry.knownRevisions.includes(c.revision)) entry.knownRevisions.push(c.revision);
      nextConcerns.push(entry);
      const closure = closed(s, p.id, c.id);
      if (c.lifecycle !== 'open' || closure) { removePending(s, p.id, c.id); continue; }
      const changedImpact = old && (c.severity?.level !== old.record.severity?.level || normal(c.severity?.impact ?? '') !== normal(old.record.severity?.impact ?? ''));
      const changedRequest = old && requestSignature(oldAttention, c.id) !== requestSignature(message.attentionItems, c.id);
      const confirmedCritical = old && old.record.severity?.level === 'critical' && old.record.severity?.assessment === 'provisional' && c.severity?.level === 'critical' && c.severity?.assessment === 'established';
      const wasAcknowledged = old && previouslyAcknowledged(s, p.id, c.id);
      const significant = rank(c.severity?.level) >= 2;
      if ((!old && significant) || (old && (significant || wasAcknowledged) && (changedImpact || changedRequest || confirmedCritical))) {
        announce(s, {kind: 'concern', producerId: p.id, id: c.id, revision: c.revision, reason: confirmedCritical ? 'critical-confirmed' : old ? 'impact-or-response-changed' : 'new-concern'});
      }
    }
    for (const old of p.concerns) {
      if (nextConcerns.some(c => c.record.id === old.record.id) || old.record.lifecycle !== 'open') continue;
      nextConcerns.push({...copy(old), sourceOmitted: true});
      if (!closed(s, p.id, old.record.id) &&
          (rank(old.record.severity?.level) >= 2 || previouslyAcknowledged(s, p.id, old.record.id)) &&
          requestSignature(oldAttention, old.record.id) !== requestSignature(message.attentionItems, old.record.id)) {
        announce(s, {kind: 'concern', producerId: p.id, id: old.record.id, revision: old.record.revision, reason: 'impact-or-response-changed'});
      }
    }
    for (const a of message.attentionItems) {
      const old = oldAttention.find(x => x.id === a.id);
      if (a.state === 'open' && a.category === 'time-sensitive' && (!old || old.state !== 'open' || requestSignature([old], old.concernId) !== requestSignature([a], a.concernId))) {
        announce(s, {kind: 'attention', producerId: p.id, id: a.id, reason: old ? 'timing-or-request-changed' : 'new-time-sensitive'});
      }
    }
    const retainedWork = [];
    for (const w of [...p.work, ...p.retainedWork]) {
      if (w.lifecycle !== 'finished' && !message.work.some(x => x.id === w.id) && !retainedWork.some(x => x.id === w.id)) retainedWork.push(copy(w));
    }
    for (const c of nextConcerns.filter(c => c.sourceOmitted && c.record.workId)) {
      const id = c.record.workId;
      if (message.work.some(w => w.id === id) || retainedWork.some(w => w.id === id)) continue;
      const w = [...p.work, ...p.retainedWork].find(w => w.id === id);
      if (w) retainedWork.push(copy(w));
    }
    p.work = copy(message.work); p.retainedWork = retainedWork; p.concerns = nextConcerns;
    // Visibility and validation history have different lifetimes. Omitting a
    // resolved record must not reset its revision/origin fence.
    for (const entry of nextConcerns) {
      const history = {record: copy(entry.record), knownRevisions: [...entry.knownRevisions]};
      const index = p.concernHistory.findIndex(x => x.record.id === entry.record.id);
      if (index < 0) p.concernHistory.push(history); else p.concernHistory[index] = history;
    }
    p.attentionItems = copy(message.attentionItems); p.revision = message.revision; p.canonical = bytes;
    p.receivedAt = s.now; p.leaseUntil = s.now + p.leaseMs;
    if (s.pending) {
      s.pending.items = s.pending.items.filter(item => {
        if (item.producerId !== p.id) return true;
        if (item.kind === 'attention') return p.attentionItems.some(a => a.id === item.id && a.state === 'open' && a.category === 'time-sensitive');
        const c = p.concerns.find(c => c.record.id === item.id)?.record;
        if (!c || c.lifecycle !== 'open' || closed(s, p.id, c.id)) return false;
        if (item.reason === 'new-concern' && rank(c.severity?.level) < 2) return false;
        if (item.reason === 'critical-confirmed' && (c.severity?.level !== 'critical' || c.severity?.assessment !== 'established')) return false;
        item.revision = c.revision;
        return true;
      });
      if (!s.pending.items.length) s.pending = null;
    }
    return {ok: true, duplicate: false, retainedConcerns: nextConcerns.filter(c => c.sourceOmitted).map(c => c.record.id)};
  }
  function applyUser(s, message, context) {
    if (!userContext(context)) return error('SCOPE_OR_ACTOR');
    const bytes = canonical(message);
    const receipt = s.receipts.find(r => r.id === message.requestId);
    if (receipt) return receipt.canonical === bytes ? {ok: true, duplicate: true, viewRevision: receipt.viewRevision} : error('REQUEST_CONFLICT');
    if (message.expectedViewRevision !== s.viewRevision) return error('VIEW_CONFLICT');
    if (message.kind === 'user.focus') {
      if (message.target) {
        const p = producer(s, message.target.producerId);
        const exists = message.target.kind === 'work' ? p && [...p.work, ...p.retainedWork].some(w => w.id === message.target.id) : p?.concerns.some(c => c.record.id === message.target.id);
        if (!exists) return error('TARGET_UNAVAILABLE');
      }
      s.focus = copy(message.target);
    } else {
      const p = producer(s, message.concern.producerId);
      const c = p?.concerns.find(x => x.record.id === message.concern.id);
      if (!c || !c.knownRevisions.includes(message.concernRevision)) return error('TARGET_UNAVAILABLE');
      if (!acknowledged(s, p.id, c.record.id, message.concernRevision)) s.acknowledgements.push({producerId: p.id, id: c.record.id, revision: message.concernRevision, at: s.now});
      // Acknowledging an older revision cannot silence a newer unseen announcement.
      if (message.concernRevision === c.record.revision) removePending(s, p.id, c.record.id);
    }
    s.viewRevision++;
    s.receipts.push({id: message.requestId, canonical: bytes, viewRevision: s.viewRevision});
    return {ok: true, duplicate: false, viewRevision: s.viewRevision};
  }
  function freshness(p, observedAt, now) {
    const ageMs = Math.max(0, policy.epochMs + now - Date.parse(observedAt));
    return {ageMs, freshness: p.leaseUntil !== null && now < p.leaseUntil && ageMs < policy.observationTtlMs ? 'current' : 'stale'};
  }
  return Object.freeze({
    // Trusted host admission, not a producer-accessible wire operation.
    admitProducer({producerId, session, generation, leaseMs}, now) {
      if (!text(producerId) || !text(session) || !integer(generation) || !Number.isFinite(leaseMs) || leaseMs <= 0) return error('ADMISSION');
      return transaction(now, s => {
        let p = producer(s, producerId);
        if (p && (generation <= p.generation || p.sessions.includes(session))) return error('ADMISSION_CONFLICT');
        if (!p) { p = {id: producerId, work: [], retainedWork: [], concerns: [], concernHistory: [], attentionItems: [], sessions: []}; s.producers.push(p); }
        Object.assign(p, {session, generation, leaseMs, revision: 0, canonical: null, receivedAt: null, leaseUntil: null});
        p.sessions.push(session);
        return {ok: true};
      });
    },
    receive(message, context, now) {
      try {
        if (!jsonData(message) || !jsonData(context)) return error('JSON_DATA');
        message = copy(message); context = copy(context);
      } catch { return error('JSON_DATA'); }
      let result;
      try { result = validate(copy(message)); } catch { return error('VALIDATOR_FAILURE'); }
      if (result?.valid !== true) return error('SCHEMA');
      if (message.kind === 'producer.snapshot') return transaction(now, s => acceptSnapshot(s, message, context));
      if (!['user.focus', 'user.acknowledge'].includes(message.kind)) return error('MESSAGE_KIND');
      return transaction(now, s => applyUser(s, message, context));
    },
    // Trusted authenticated UI closure; deliberately not an added wire/API message.
    resolveConcern({producerId, id, revision, reason, expectedViewRevision}, context, now) {
      if (!userContext(context)) return error('SCOPE_OR_ACTOR');
      if (!text(reason) || !integer(revision)) return error('RESOLUTION');
      return transaction(now, s => {
        if (expectedViewRevision !== s.viewRevision) return error('VIEW_CONFLICT');
        const c = producer(s, producerId)?.concerns.find(x => x.record.id === id);
        if (!c || c.record.origin !== 'user' || c.record.revision !== revision) return error('TARGET_UNAVAILABLE');
        if (closed(s, producerId, id)) return error('ALREADY_RESOLVED');
        s.closures.push({producerId, id, revision, reason: reason.trim(), at: s.now});
        removePending(s, producerId, id); s.viewRevision++;
        return {ok: true, viewRevision: s.viewRevision};
      });
    },
    flush(context, now) {
      if (!userContext(context)) return error('SCOPE_OR_ACTOR');
      return transaction(now, s => {
        if (!s.pending || now < s.pending.dueAt) return {ok: true, announcements: []};
        const announcement = {...copy(s.pending), emittedAt: now, sequence: s.announcements.length + 1, presentation: 'brief-then-steady'};
        s.announcements.push(announcement); s.pending = null;
        return {ok: true, announcements: [announcement]};
      });
    },
    read(context, now) {
      if (!userContext(context)) return error('SCOPE_OR_ACTOR');
      if (!clock(now)) return error('CLOCK');
      const view = {ok: true, userId, workspaceId, viewRevision: state.viewRevision, focus: copy(state.focus), acknowledgements: copy(state.acknowledgements), announcements: copy(state.announcements), producers: []};
      for (const p of state.producers) {
        view.producers.push({id: p.id, generation: p.generation, revision: p.revision, lease: p.leaseUntil === null ? 'unknown' : now < p.leaseUntil ? 'active' : 'expired',
          work: p.work.map(w => ({...copy(w), ...freshness(p, w.observedAt, now)})),
          retainedWork: p.retainedWork.map(w => ({...copy(w), tracking: 'last-known-reference', ...freshness(p, w.observedAt, now), freshness: 'unknown'})),
          concerns: p.concerns.map(c => {
            const closure = closed(state, p.id, c.record.id);
            const lifecycle = closure ? 'resolved' : c.record.lifecycle;
            return {...copy(c.record), lifecycle, sourceOmitted: c.sourceOmitted, lastReportedAt: c.lastReportedAt,
              ...freshness(p, c.record.observedAt, now), severityAssessment: c.record.severity?.assessment ?? 'unassessed',
              acknowledged: acknowledged(state, p.id, c.record.id, c.record.revision), cue: lifecycle === 'open' ? 'steady-visible' : 'none',
              ...(closure ? {userResolution: copy(closure)} : {})};
          }), attentionItems: copy(p.attentionItems)});
      }
      return view;
    }
  });
}
