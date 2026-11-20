// MQTT application bridge, independent of network library and broker lifecycle.
// The network host MUST enforce mutual-TLS role ACLs before invoking handle().
// Broker topic strings alone do not authenticate the original publisher.
import {createOfflineMqttIngress} from '../../../design/api/0.1-draft/mqtt-offline.mjs';
import {createViewPublisher} from './view-wire.mjs';

const token = value => typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value);
const fail = code => ({ok: false, code, publications: []});
export function createAcceptedBridge({api, workspaceToken, userToken, producerBindings, displayTokens,
  validateView, validateSync, ownerEpoch, ownerLeaseMs, maxPayloadBytes}) {
  if (!token(workspaceToken) || !token(userToken) || !Array.isArray(displayTokens) ||
      !displayTokens.every(token) || new Set(displayTokens).size !== displayTokens.length ||
      !Number.isSafeInteger(maxPayloadBytes) || maxPayloadBytes < 1 || typeof validateSync !== 'function' ||
      typeof api?.user?.flushAnnouncements !== 'function') throw new TypeError('Explicit trusted bridge bindings and payload limit required');
  const ingress = createOfflineMqttIngress({workspaceToken, bindings: producerBindings});
  const publisher = createViewPublisher({exportAccepted: api.user.exportAccepted, validate: validateView, ownerEpoch, ownerLeaseMs});
  const prefix = `briar-presence/v0.1/${workspaceToken}`;
  const viewTopic = `${prefix}/out/view/${userToken}`;
  const inputTopics = new Map(producerBindings.map(({producerToken}) => [ingress.topicFor(producerToken), producerToken]));
  const syncTopics = new Map(displayTokens.map(display => [`${prefix}/in/display/${display}/sync`, display]));
  const encodedLength = value => new TextEncoder().encode(value).length;
  const packet = (topic, value) => ({topic, payload: JSON.stringify(value), qos: 1, retain: false});
  function view(now, nonce = null, target = viewTopic) {
    const flushed = api.user.flushAnnouncements(now);
    if (!flushed.ok) return fail(flushed.code);
    const result = publisher.snapshot(now, nonce);
    if (!result.ok) return fail(result.code);
    const output = packet(target, result.envelope);
    if (encodedLength(output.payload) > maxPayloadBytes) return fail('VIEW_PAYLOAD_LIMIT');
    return {ok: true, publications: [output]};
  }
  return Object.freeze({
    requiresAuthenticatedBroker: true,
    userCommandsSupported: false,
    topics: Object.freeze({view: viewTopic, inputs: Object.freeze([...inputTopics.keys()]), sync: Object.freeze([...syncTopics.keys()])}),
    tick: now => view(now),
    handle(topic, payload, {retained, now} = {}) {
      if (typeof topic !== 'string' || typeof payload !== 'string' || typeof retained !== 'boolean') return fail('BRIDGE_METADATA');
      if (!inputTopics.has(topic) && !syncTopics.has(topic)) return fail('BRIDGE_TOPIC');
      if (encodedLength(payload) > maxPayloadBytes) return fail('INPUT_PAYLOAD_LIMIT');
      if (retained) return fail('MQTT_RETAINED_INPUT');
      if (syncTopics.has(topic)) {
        let request;
        try {
          request = JSON.parse(payload);
          if (validateSync(request)?.valid !== true) return fail('SYNC_SCHEMA');
        } catch { return fail('SYNC_SCHEMA'); }
        return view(now, request.nonce, `${prefix}/out/sync/${userToken}/${syncTopics.get(topic)}`);
      }
      const result = ingress.deliver(topic, payload, retained, now);
      // A receipt reports only the bound producer's outcome; it never accepts
      // an arbitrary reply destination or echoes input data/errors/secrets.
      const receipt = packet(`${prefix}/out/receipt/${userToken}/${inputTopics.get(topic)}`,
        {kind: 'presence.receipt', version: '0.1-draft.1', accepted: result.ok === true,
          duplicate: result.duplicate === true, code: result.ok ? 'ACCEPTED' : result.code});
      const published = result.ok && !result.duplicate ? view(now) : {ok: true, publications: []};
      if (!published.ok) return {...published, accepted: result.ok, publications: [receipt]};
      return {ok: result.ok, ...(result.code ? {code: result.code} : {}), publications: [...published.publications, receipt]};
    }
  });
}
