// Existing MQTT5 receiver lifecycle -> live TURMO, not a geometry wire format.
import {attachDisplayClient} from './client-host.mjs';
import {createReceivedTurmo} from '../../api/turmo-received.mjs';

export function attachTurmoDisplayClient({client, receiver, projection, onFrame, ...host}) {
  if (typeof onFrame !== 'function') throw new TypeError('Local TURMO frame sink required');
  const display = createReceivedTurmo({...projection, receiver});
  const handoff = {capture(input) {
    const frame = display.frame(input);
    return frame.ok ? {ok:true, plan:frame} : frame;
  }};
  const controller = attachDisplayClient({...host,client,receiver,handoff,onPlan:onFrame});
  return Object.freeze({
    // Caller owns the local animation cadence. No network traffic is needed
    // between accepted-state messages; expiry is checked at every sample.
    sample() {
      const result = controller.refresh();
      return result.ok ? result.plan : result;
    },
    stop: controller.stop
  });
}
