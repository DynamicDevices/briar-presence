// Invented trial data only. No harness stores, sockets, credentials or broker
// startup. The separately admitted trusted host supplies the MQTT5 client.
import {createEmbeddedPresence} from '../../api/embedded.mjs';
import {createAcceptedBridge} from './accepted-bridge.mjs';
import {attachBridgeClient, attachProducerClient} from './client-host.mjs';

export const syntheticScope = Object.freeze({workspaceId:'synthetic-workspace',userId:'synthetic-user'});
export const syntheticProducers = Object.freeze(['producer-a','producer-b']);
export const syntheticDisplays = Object.freeze(['display-a','display-b']);
export const syntheticSession = role => {
  if (!syntheticProducers.includes(role)) throw new TypeError('Synthetic producer role required');
  return `synthetic-session-${role}`;
};
export function syntheticSnapshot(role, revision, wallNow) {
  const session = syntheticSession(role);
  if (!Number.isSafeInteger(revision) || revision < 1 || !Number.isFinite(wallNow)) throw new TypeError('Synthetic revision and clock required');
  const observedAt = new Date(wallNow).toISOString();
  const first = role === 'producer-a';
  return {kind:'producer.snapshot',version:'0.1-draft',session,revision,observedAt,
    // Deliberately colliding IDs: isolation must come from producer scope.
    work:Array.from({length:5}, (_,i) => ({id:`chat-${i}`,label:`Synthetic ${first ? 'design' : 'build'} chat ${i+1}`,
      lifecycle:first ? 'running' : 'waiting',observedAt,
      ...(first ? {} : {wait:{party:'dependency',reason:'Synthetic dependency check is pending'}})})),
    concerns:[{id:first ? 'review-needed' : 'build-worry',workId:'chat-0',revision,observedAt,
      origin:'producer',lifecycle:'open',summary:first ? 'Synthetic review needs attention' : 'Synthetic build concern',
      severity:{level:'significant',assessment:'established',impact:'Recoverable rework in this invented example',evidence:'Synthetic demonstration only'}}],
    attentionItems:[]};
}
export function createSyntheticOwner({config, epochMs, ownerEpoch, validateInput, validateView, validateSync}) {
  if (!config.capacity || !config.ingressRate) throw new TypeError('Explicit trial capacity and per-route rate required');
  const api = createEmbeddedPresence({...syntheticScope,validate:validateInput,capacity:config.capacity,
    policy:{epochMs,observationTtlMs:config.observationTtlMs,futureSkewMs:config.futureSkewMs,groupWindowMs:config.groupWindowMs},
    presentation:{seed:0x5eed1234,cueDurationMs:1000,cueSpeedMultiplier:1.6}});
  const producerBindings = syntheticProducers.map(producerId => {
    const admitted = api.admitProducer({producerId,session:syntheticSession(producerId),generation:1,leaseMs:config.sourceLeaseMs},0);
    if (!admitted.ok) throw new Error('SYNTHETIC_ADMISSION_FAILED');
    return {producerToken:producerId,port:admitted.port};
  });
  const bridge = createAcceptedBridge({api,
    workspaceToken:syntheticScope.workspaceId,userToken:syntheticScope.userId,producerBindings,
    displayTokens:syntheticDisplays,validateView,validateSync,ownerEpoch,
    ownerLeaseMs:config.ownerLeaseMs,maxPayloadBytes:config.maxPayloadBytes,ingressRate:config.ingressRate});
  return Object.freeze({api,bridge});
}

export function runSyntheticActor({client, config, epochMs, ownerEpoch, clock, wallNow,
  validateInput, validateView, validateSync, input, onStatus, onStop}) {
  const remaining = config.deadlineUnixMs - Date.now();
  if (config.syntheticOnly !== true || !['bridge',...syntheticProducers].includes(config.role) ||
      !Number.isSafeInteger(config.deadlineUnixMs) || remaining <= 0 || remaining > 2147483647 ||
      !Number.isSafeInteger(config.tickMs) || config.tickMs <= 0 || config.tickMs > 2147483647 ||
      typeof clock !== 'function' || typeof wallNow !== 'function' || typeof onStatus !== 'function' || typeof onStop !== 'function' ||
      !input || typeof input.on !== 'function' || typeof input.removeListener !== 'function')
    throw new TypeError('Finite synthetic actor, explicit clocks, cadence and sinks required');
  config = Object.freeze({...config});
  let ended = false, controller, owner, interval, control = '', revision = 0;
  function stop(code) {
    if (ended) return;
    ended = true;
    clearTimeout(deadline); clearInterval(interval);
    let finalCode = code;
    try { if (controller) controller.stop(); else client.end(true); }
    catch { finalCode = 'CLIENT_CLEANUP_FAILED'; }
    input.removeListener('data',data); input.removeListener('end',parentLost);
    input.removeListener('close',parentLost); input.removeListener('error',inputFailed);
    onStatus({code:finalCode}); onStop({code:finalCode});
  }
  function status({code}) {
    if (ended) return;
    onStatus({code});
    if (code === 'PRODUCER_REJECTED' && controller?.read().rebindRequired) { stop('PRODUCER_REBIND_REQUIRED'); return; }
    if (['CLIENT_ERROR','CLIENT_OFFLINE','CLIENT_CLOSED','CLIENT_ENDED','SUBSCRIPTION_FAILED',
      'PUBLICATION_FAILED','PUBLICATION_INVALID','PUBLICATION_BACKPRESSURE'].includes(code)) stop(code);
  }
  function operate(method) {
    if (ended) return {ok:false,code:'ACTOR_STOPPED'};
    if (Date.now() >= config.deadlineUnixMs) { stop('TRIAL_DEADLINE'); return {ok:false,code:'TRIAL_DEADLINE'}; }
    let result;
    try { result = controller[method](); }
    catch { stop('ACTOR_TICK_FAILED'); return {ok:false,code:'ACTOR_TICK_FAILED'}; }
    // Application-level backpressure is expected; it is not connection loss.
    if (!result.ok && !['CLIENT_NOT_READY','PRODUCER_AWAITING_RECEIPT','PRODUCER_NO_PENDING'].includes(result.code)) stop(result.code);
    return result;
  }
  const shutdown = '{"kind":"shutdown"}';
  function data(bytes) {
    for (const byte of bytes) {
      if (byte === 10) { stop(control === shutdown ? 'SHUTDOWN' : 'PIPE_CONTROL_INVALID'); return; }
      if (byte > 127 || control.length >= shutdown.length) { stop('PIPE_CONTROL_INVALID'); return; }
      control += String.fromCharCode(byte);
    }
  }
  const parentLost = () => stop('PARENT_PIPE_CLOSED');
  const inputFailed = () => stop('PIPE_INPUT_FAILED');
  const deadline = setTimeout(() => stop('TRIAL_DEADLINE'),remaining);
  input.on('data',data); input.on('end',parentLost); input.on('close',parentLost); input.on('error',inputFailed);
  try {
    const common = {client,maxPayloadBytes:config.maxPayloadBytes,maxInFlight:config.maxInFlight,onStatus:status};
    if (config.role === 'bridge') {
      owner = createSyntheticOwner({config,epochMs,ownerEpoch,validateInput,validateView,validateSync});
      controller = attachBridgeClient({...common,bridge:owner.bridge,clock});
    } else {
      controller = attachProducerClient({...common,workspaceToken:syntheticScope.workspaceId,userToken:syntheticScope.userId,
        producerToken:config.role,admittedSession:syntheticSession(config.role),validateInput,
        makeSnapshot:() => syntheticSnapshot(config.role,++revision,wallNow())});
    }
    if (Date.now() >= config.deadlineUnixMs) stop('TRIAL_DEADLINE');
    else {
      interval = setInterval(() => operate('tick'),config.tickMs);
      client.connect(); // Manual-connect client: handlers/deadline already armed.
      if (!ended) operate('tick');
    }
  } catch { stop('ACTOR_STARTUP_FAILED'); }
  return Object.freeze({stop:() => stop('SHUTDOWN'),tick:() => operate('tick'),
    retry:() => config.role === 'bridge' ? {ok:false,code:'NOT_PRODUCER'} : operate('retry'),
    readProducer:() => config.role === 'bridge' ? null : controller?.read() ?? null,
    owner,running:() => !ended});
}
