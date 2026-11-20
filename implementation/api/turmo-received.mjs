// Trusted accepted-view receiver -> locally animated TURMO. No broker or serial I/O.
import {jsonData} from '../core/state.mjs';
import {createTurmoProjection} from './turmo.mjs';

export function createReceivedTurmo({receiver, userId, workspaceId, userLabel,
  producerLabels, seed, transitionMs, carouselMs, maxAnimationStepMs, speeds}) {
  if (typeof receiver?.read !== 'function') throw new TypeError('Bound accepted-view receiver required');
  const empty = {ok: true, userId, workspaceId, producers: []};
  let read = null, lastMono = null;
  const accepted = () => read.view ?? empty;
  const projection = createTurmoProjection({userId, workspaceId, userLabel, producerLabels,
    seed, transitionMs, carouselMs, maxAnimationStepMs, speeds,
    readAccepted: accepted, readLastKnown: accepted, ownerCurrent: () => read.connection === 'current'});
  return Object.freeze({
    frame({wallNow, monotonicNow, preferences}) {
      // Invalid local input must not consume receiver announcements or clocks.
      try {
        if (!jsonData(preferences) || !preferences || !Number.isFinite(preferences.brightness) ||
            preferences.brightness < 0 || preferences.brightness > 1 ||
            typeof preferences.reducedMotion !== 'boolean' || typeof preferences.attentionEnabled !== 'boolean')
          return {ok: false, code: 'PREFERENCES'};
      } catch { return {ok: false, code: 'PREFERENCES'}; }
      if (!Number.isFinite(wallNow) || wallNow < 0 || !Number.isFinite(monotonicNow) || monotonicNow < 0 ||
          (lastMono !== null && monotonicNow < lastMono)) return {ok: false, code: 'CLOCK'};
      read = receiver.read({wallNow, monotonicNow});
      if (!read?.ok) return read;
      const frame = projection.frame({now: monotonicNow, preferences});
      if (frame.ok) lastMono = monotonicNow;
      return frame;
    }
  });
}
