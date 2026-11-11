// Trusted host facade. Ports carry host-bound scope, never wire-chosen identity.
import {createStateHandler, jsonData} from '../core/state.mjs';
import {createPresentation} from './presentation.mjs';

export function createEmbeddedPresence({userId, workspaceId, validate, policy, presentation}) {
  const handler = createStateHandler({userId, workspaceId, validate, policy});
  const display = createPresentation(presentation);
  const user = Object.freeze({kind: 'user', userId, workspaceId});
  function wrongKind(message, expected) {
    try {
      if (!jsonData(message)) return {ok: false, code: 'JSON_DATA'};
      return message?.kind === expected ? null : {ok: false, code: 'MESSAGE_KIND'};
    } catch { return {ok: false, code: 'JSON_DATA'}; }
  }
  return Object.freeze({
    capabilities: () => ({version: '0.1-draft', transport: 'embedded', syntheticOnly: true,
      messageKinds: ['producer.snapshot', 'user.focus', 'user.acknowledge'], requiredFeatures: [],
      persistence: false, liveAuthentication: false, multiDisplayDelivery: false, subscriptions: false}),
    admitProducer({producerId, session, generation, leaseMs, userRaisedConcernIds = []}, now) {
      if (!Array.isArray(userRaisedConcernIds) || !userRaisedConcernIds.every(x => typeof x === 'string' && x.trim())) return {ok: false, code: 'USER_PROVENANCE'};
      const admitted = handler.admitProducer({producerId, session, generation, leaseMs}, now);
      if (!admitted.ok) return admitted;
      const context = {kind: 'producer', workspaceId, producerId, generation, userRaisedConcernIds: [...userRaisedConcernIds]};
      return {ok: true, port: Object.freeze({submit(message, at) {
        const invalid = wrongKind(message, 'producer.snapshot');
        if (invalid) return invalid;
        return handler.receive(message, context, at);
      }})};
    },
    user: Object.freeze({
      read: now => handler.read(user, now),
      focus: (message, now) => wrongKind(message, 'user.focus') ?? handler.receive(message, user, now),
      acknowledge(message, now) {
        const invalid = wrongKind(message, 'user.acknowledge');
        if (invalid) return invalid;
        const result = handler.receive(message, user, now);
        if (result.ok && !result.duplicate) display.acknowledge(message.concern.producerId, message.concern.id, message.concernRevision);
        return result;
      },
      resolveConcern: (request, now) => handler.resolveConcern(request, user, now),
      present({now, preferences}) {
        // Validate presentation input before reading/consuming any state/cues.
        if (!Number.isFinite(now) || now < 0 || !preferences || !Number.isFinite(preferences.brightness) || preferences.brightness < 0 || preferences.brightness > 1 ||
            typeof preferences.reducedMotion !== 'boolean' || typeof preferences.attentionEnabled !== 'boolean') return {ok: false, code: 'PRESENTATION_INPUT'};
        const view = handler.read(user, now);
        if (!view.ok) return view;
        const flushed = handler.flush(user, now);
        if (!flushed.ok) return flushed;
        view.announcements.push(...flushed.announcements);
        return display.frame(view, flushed.announcements, now, preferences);
      }
    })
  });
}
