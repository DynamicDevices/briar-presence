// MQTT.js callback attachment. No connection initiation or timers; stop detaches listeners.
// TLS identity and broker ACLs remain an independently verified host obligation.
// Topic names do not authenticate publishers; these adapters cannot prove ACLs.
const token = x => typeof x === 'string' && /^[A-Za-z0-9_-]+$/.test(x);
const positive = x => Number.isSafeInteger(x) && x > 0;
const failure = code => ({ok: false, code});
const decoder = new TextDecoder('utf-8', {fatal: true});

function attachSession({client, topics, maxPayloadBytes, maxInFlight, onMessage, onReady, onLost, onStatus}) {
  if (!positive(maxPayloadBytes) || !positive(maxInFlight) || typeof onStatus !== 'function' ||
      !client || !['on', 'removeListener', 'subscribe', 'publish', 'end'].every(k => typeof client[k] === 'function'))
    throw new TypeError('Explicit client, measured budgets and status sink required');
  // Disable hidden reconnect/resubscribe/offline behaviour. The finite trial
  // supervisor owns reconnection and expiry. QoS1 still requires a host bound.
  const opts = client.options;
  if (opts?.protocolVersion !== 5 || opts.clean !== true || opts.reconnectPeriod !== 0 ||
      opts.resubscribe !== false || opts.queueQoSZero !== false || opts.properties?.sessionExpiryInterval !== 0)
    throw new TypeError('Clean MQTT5 client with explicit reconnect ownership required');
  let ready = false, generation = 0, closed = false;
  const pending = new Set();
  function lost(code) {
    ready = false;
    generation++;
    pending.clear();
    onLost();
    onStatus({code}); // Never expose client errors, certificates or raw payloads.
  }
  function publish(publications) {
    if (!ready || !client.connected || closed) return failure('CLIENT_NOT_READY');
    if (!Array.isArray(publications) || pending.size + publications.length > maxInFlight) {
      lost('PUBLICATION_BACKPRESSURE');
      return failure('PUBLICATION_BACKPRESSURE');
    }
    for (const p of publications) {
      if (typeof p.payload !== 'string' || Buffer.byteLength(p.payload) > maxPayloadBytes ||
          typeof p.topic !== 'string' || p.qos !== 1 || p.retain !== false) {
        lost('PUBLICATION_INVALID');
        return failure('PUBLICATION_INVALID');
      }
    }
    const attempt = generation;
    for (const p of publications) {
      if (!ready || attempt !== generation || !client.connected) return failure('CLIENT_NOT_READY');
      const id = {};
      pending.add(id);
      try {
        client.publish(p.topic, p.payload, {qos: 1, retain: false}, (err, packet) => {
          if (closed || attempt !== generation) return;
          pending.delete(id);
          // MQTT5 PUBACK errors may be represented by reasonCode, not err.
          if (err || (packet?.reasonCode ?? 0) >= 128) lost('PUBLICATION_FAILED');
        });
      } catch { lost('PUBLICATION_FAILED'); }
    }
    return attempt === generation ? {ok: true} : failure('PUBLICATION_FAILED');
  }
  const handlers = {
    connect() {
      if (closed) return;
      ready = false;
      pending.clear();
      const attempt = ++generation;
      onLost(); // Reconnect never preserves a previously healthy display.
      try {
        client.subscribe(topics, {qos: 1, rap: true, rh: 2}, (err, granted) => {
          if (closed || generation !== attempt || !client.connected) return;
          if (err || !Array.isArray(granted) || granted.length !== topics.length ||
              topics.some(t => !granted.some(g => g.topic === t && g.qos === 1))) {
            lost('SUBSCRIPTION_FAILED');
            return;
          }
          ready = true;
          onStatus({code: 'CLIENT_READY'});
          onReady();
        });
      } catch { lost('SUBSCRIPTION_FAILED'); }
    },
    message(topic, payload, packet) {
      if (!ready || !client.connected || closed) return;
      if (!topics.includes(topic) || !Buffer.isBuffer(payload) || payload.length > maxPayloadBytes ||
          typeof packet?.retain !== 'boolean') {
        onStatus({code: 'INPUT_METADATA_OR_LIMIT'});
        return;
      }
      let text;
      try { text = decoder.decode(payload); }
      catch { onStatus({code: 'INPUT_UTF8'}); return; }
      onMessage(topic, text, packet.retain);
    },
    close: () => lost('CLIENT_CLOSED'),
    offline: () => lost('CLIENT_OFFLINE'),
    error: () => lost('CLIENT_ERROR'),
    end: () => lost('CLIENT_ENDED')
  };
  for (const [event, handler] of Object.entries(handlers)) client.on(event, handler);
  return Object.freeze({
    publish,
    available: () => ready && client.connected && !closed ? maxInFlight - pending.size : 0,
    stop({endClient = true} = {}) {
      if (closed) return;
      closed = true;
      lost('CLIENT_STOPPED');
      for (const [event, handler] of Object.entries(handlers)) client.removeListener(event, handler);
      if (endClient) client.end(true); // A supervisor may own confirmed teardown.
    }
  });
}

export function attachBridgeClient({client, bridge, clock, maxPayloadBytes, maxInFlight, onStatus}) {
  if (typeof clock !== 'function' || maxInFlight < 2 || bridge?.requiresAuthenticatedBroker !== true)
    throw new TypeError('Trusted bridge and clock required; capacity must fit view plus receipt');
  const session = attachSession({client, topics: [...bridge.topics.inputs, ...bridge.topics.sync],
    maxPayloadBytes, maxInFlight, onStatus, onReady() {}, onLost() {},
    onMessage(topic, text, retained) {
      const needed = bridge.topics.inputs.includes(topic) ? 2 : 1;
      // Refuse before acceptance when this host cannot even send its outcome.
      if (session.available() < needed) { onStatus({code: 'BRIDGE_BUSY'}); return; }
      const result = bridge.handle(topic, text, {retained, now: clock()});
      if (result.publications.length) session.publish(result.publications);
      if (!result.ok) onStatus({code: result.code});
    }});
  return Object.freeze({
    tick() {
      if (session.available() < 1) return failure('CLIENT_NOT_READY');
      const result = bridge.tick(clock());
      return result.ok ? session.publish(result.publications) : result;
    },
    stop: session.stop
  });
}

export function attachDisplayClient({client, receiver, handoff, workspaceToken, userToken, displayToken,
  clock, nonce, preferences, onPlan, onStatus, maxPayloadBytes, maxInFlight}) {
  if (![workspaceToken, userToken, displayToken].every(token) ||
      ![clock, nonce, preferences, onPlan].every(f => typeof f === 'function'))
    throw new TypeError('Fixed display scope, local clock/preferences and plan sink required');
  const prefix = `briar-presence/v0.1/${workspaceToken}`;
  const viewTopic = `${prefix}/out/view/${userToken}`;
  const replyTopic = `${prefix}/out/sync/${userToken}/${displayToken}`;
  const requestTopic = `${prefix}/in/display/${displayToken}/sync`;
  let syncPending = false;
  function emitPlan() {
    const result = handoff.capture({...clock(), preferences: preferences()});
    if (result.ok) onPlan(result.plan);
    else onStatus({code: result.code});
    return result;
  }
  function sync() {
    const value = nonce();
    const result = receiver.beginSync(value);
    if (!result.ok) { onStatus({code: result.code}); return; }
    syncPending = true;
    const sent = session.publish([{topic: requestTopic, payload: JSON.stringify({kind: 'presence.sync', version: '0.1-draft.1', nonce: value}), qos: 1, retain: false}]);
    if (!sent.ok) { receiver.disconnect(); syncPending = false; emitPlan(); }
  }
  const session = attachSession({client, topics: [viewTopic, replyTopic], maxPayloadBytes, maxInFlight, onStatus,
    onReady: sync,
    onLost() { receiver.disconnect(); syncPending = false; emitPlan(); },
    onMessage(topic, text, retained) {
      let envelope;
      try { envelope = JSON.parse(text); }
      catch { onStatus({code: 'VIEW_JSON'}); return; }
      const result = receiver.receive(envelope, {...clock(), retained, route: topic === viewTopic ? 'view' : 'sync'});
      if (!result.ok) {
        onStatus({code: result.code});
        if (result.code === 'SYNC_REQUIRED' && !syncPending) { emitPlan(); sync(); }
        return;
      }
      if (result.bootstrap) syncPending = false;
      if (!result.duplicate) emitPlan();
    }});
  return Object.freeze({refresh: emitPlan, stop: session.stop});
}

export function attachProducerClient({client, workspaceToken, userToken, producerToken,
  makeSnapshot, validateInput, maxPayloadBytes, maxInFlight, onStatus}) {
  if (![workspaceToken, userToken, producerToken].every(token) ||
      typeof makeSnapshot !== 'function' || typeof validateInput !== 'function')
    throw new TypeError('Fixed producer binding and complete snapshot validator required');
  const prefix = `briar-presence/v0.1/${workspaceToken}`;
  const receiptTopic = `${prefix}/out/receipt/${userToken}/${producerToken}`;
  const session = attachSession({client, topics: [receiptTopic], maxPayloadBytes, maxInFlight, onStatus,
    onReady() {}, onLost() {}, onMessage(_topic, text, retained) {
      let receipt;
      try { receipt = JSON.parse(text); } catch { onStatus({code: 'RECEIPT_INVALID'}); return; }
      const fields = ['kind', 'version', 'accepted', 'duplicate', 'code'];
      if (retained || !receipt || Object.keys(receipt).length !== fields.length || !fields.every(k => Object.hasOwn(receipt, k)) ||
          receipt.kind !== 'presence.receipt' || receipt.version !== '0.1-draft.1' || typeof receipt.accepted !== 'boolean' ||
          typeof receipt.duplicate !== 'boolean' || typeof receipt.code !== 'string' ||
          (receipt.accepted !== (receipt.code === 'ACCEPTED')) || (receipt.duplicate && !receipt.accepted)) {
        onStatus({code: 'RECEIPT_INVALID'}); return;
      }
      // A PUBACK is not reducer acceptance. Only a fixed-route reducer receipt
      // reports that outcome; neither is a user acknowledgement or resolution.
      onStatus({code: receipt.accepted ? 'PRODUCER_ACCEPTED' : 'PRODUCER_REJECTED'});
    }});
  return Object.freeze({
    tick() {
      if (session.available() < 1) return failure('CLIENT_NOT_READY');
      let snapshot;
      try { snapshot = makeSnapshot(); if (validateInput(snapshot)?.valid !== true) return failure('PRODUCER_SCHEMA'); }
      catch { return failure('PRODUCER_SCHEMA'); }
      return session.publish([{topic: `${prefix}/in/producer/${producerToken}/snapshot`,
        payload: JSON.stringify(snapshot), qos: 1, retain: false}]);
    },
    stop: session.stop
  });
}
