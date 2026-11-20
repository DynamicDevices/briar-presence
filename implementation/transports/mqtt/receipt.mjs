// Node MQTT host correlation, not authentication or a producer payload extension.
import {createHash} from 'node:crypto';

const positive = n => Number.isSafeInteger(n) && n > 0;
const exact = (value,keys) => value && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every(k=>Object.hasOwn(value,k));
export function requestIdentity(payload) {
  if (typeof payload !== 'string') return null;
  let message;
  try { message=JSON.parse(payload); } catch { return null; }
  if (!message || message.kind !== 'producer.snapshot' || message.version !== '0.1-draft' ||
      typeof message.session !== 'string' || !message.session.trim() || !positive(message.revision)) return null;
  // MQTT preserves opaque bytes. Hash the exact UTF-8 JSON bytes, avoiding
  // cross-language canonical-number/key-order assumptions in producer SDKs.
  return {revision:message.revision,digest:createHash('sha256').update(payload,'utf8').digest('hex')};
}
export function receiptFor(payload,result) {
  return {kind:'presence.receipt',version:'0.1-draft.2',request:requestIdentity(payload),
    accepted:result.ok === true,duplicate:result.duplicate === true,code:result.ok ? 'ACCEPTED' : result.code};
}
export function parseReceipt(payload) {
  if (typeof payload !== 'string') return null;
  let value;
  try { value=JSON.parse(payload); } catch { return null; }
  if (!exact(value,['kind','version','request','accepted','duplicate','code']) ||
      value.kind !== 'presence.receipt' || value.version !== '0.1-draft.2' ||
      typeof value.accepted !== 'boolean' || typeof value.duplicate !== 'boolean' ||
      typeof value.code !== 'string' || !value.code ||
      value.accepted !== (value.code === 'ACCEPTED') || (value.duplicate && !value.accepted)) return null;
  if (value.request !== null && (!exact(value.request,['revision','digest']) ||
      !positive(value.request.revision) || typeof value.request.digest !== 'string' || !/^[a-f0-9]{64}$/.test(value.request.digest))) return null;
  if (value.accepted && value.request === null) return null;
  return value;
}
export const sameRequest = (a,b) => Boolean(a && b && a.revision === b.revision && a.digest === b.digest);
