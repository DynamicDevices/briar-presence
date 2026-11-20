// Complete wire schema, composed from the existing input vocabulary. No I/O.
export const syncRequestSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object', additionalProperties: false,
  required: ['kind', 'version', 'nonce'], properties: {kind: {const: 'presence.sync'}, version: {const: '0.1-draft.1'}, nonce: {type: 'string', minLength: 1}}
};

export function createViewSchema(inputSchema) {
  const defs = structuredClone(inputSchema.$defs);
  const ref = name => ({$ref: `#/$defs/${name}`});
  const object = (properties, required = Object.keys(properties)) => ({type: 'object', additionalProperties: false, properties, required});
  const array = items => ({type: 'array', items});
  const number = {type: 'number', minimum: 0};
  const positive = {type: 'number', exclusiveMinimum: 0};
  const nullableStamp = {anyOf: [ref('timestamp'), {type: 'null'}]};
  const freshness = {enum: ['current', 'stale', 'unknown']};
  defs.acceptedWork = {...structuredClone(defs.work),
    required: [...defs.work.required, 'ageMs', 'freshness'],
    properties: {...defs.work.properties, ageMs: number, freshness}};
  defs.retainedWork = {...structuredClone(defs.acceptedWork),
    required: [...defs.acceptedWork.required, 'tracking'],
    properties: {...defs.acceptedWork.properties, freshness: {const: 'unknown'}, tracking: {const: 'last-known-reference'}}};
  defs.userResolution = object({producerId: ref('text'), id: ref('text'), revision: ref('revision'), reason: ref('text'), at: number});
  defs.acceptedConcern = {...structuredClone(defs.concern),
    required: [...defs.concern.required, 'sourceOmitted', 'lastReportedAt', 'ageMs', 'freshness', 'severityAssessment', 'acknowledged', 'cue'],
    properties: {...defs.concern.properties, sourceOmitted: {type: 'boolean'}, lastReportedAt: number,
      ageMs: number, freshness, severityAssessment: {enum: ['unassessed', 'provisional', 'established']},
      acknowledged: {type: 'boolean'}, cue: {enum: ['steady-visible', 'none']}, userResolution: ref('userResolution')},
    allOf: [{if: {properties: {lifecycle: {const: 'resolved'}}},
      then: {anyOf: [{required: ['resolution']}, {required: ['userResolution']}]},
      else: {not: {anyOf: [{required: ['resolution']}, {required: ['userResolution']}]}}},
    {if: {required: ['userResolution']}, then: {properties: {origin: {const: 'user'}, lifecycle: {const: 'resolved'}}}}]};
  defs.acknowledgement = object({producerId: ref('text'), id: ref('text'), revision: ref('revision'), at: number});
  defs.announcementItem = object({producerId: ref('text'), kind: {enum: ['concern', 'attention']}, id: ref('text'),
    revision: ref('revision'), reason: {enum: ['critical-confirmed', 'impact-or-response-changed', 'new-concern', 'timing-or-request-changed', 'new-time-sensitive']}},
  ['producerId', 'kind', 'id', 'reason']);
  defs.announcement = object({firstAt: number, dueAt: number, items: array(ref('announcementItem')),
    emittedAt: number, sequence: ref('revision'), presentation: {const: 'brief-then-steady'}});
  defs.acceptedProducer = object({id: ref('text'), generation: ref('revision'), revision: ref('viewRevision'),
    lease: {enum: ['unknown', 'active', 'expired']}, work: array(ref('acceptedWork')),
    retainedWork: array(ref('retainedWork')), concerns: array(ref('acceptedConcern')), attentionItems: array(ref('attentionItem'))});
  defs.acceptedView = object({ok: {const: true}, userId: ref('text'), workspaceId: ref('text'),
    viewRevision: ref('viewRevision'), focus: {anyOf: [ref('target'), {type: 'null'}]},
    acknowledgements: array(ref('acknowledgement')), announcements: array(ref('announcement')), producers: array(ref('acceptedProducer'))});
  defs.sourceTiming = object({producerId: ref('text'), generation: ref('revision'), revision: ref('viewRevision'),
    lastReceivedAt: nullableStamp, leaseValidUntil: nullableStamp});
  return {$schema: 'https://json-schema.org/draft/2020-12/schema', title: 'Synthetic accepted-view transport 0.1-draft.1',
    ...object({kind: {const: 'presence.view'}, version: {const: '0.1-draft.1'}, requiredFeatures: {type: 'array', items: ref('text'), uniqueItems: true},
      userId: ref('text'), workspaceId: ref('text'), ownerEpoch: ref('text'), sequence: ref('revision'),
      generatedAt: ref('timestamp'), ownerValidUntil: ref('timestamp'), sources: array(ref('sourceTiming')),
      view: ref('acceptedView'), freshnessPolicy: object({clockDomain: {const: 'utc-with-monotonic-deadlines'}, observationTtlMs: positive}),
      sync: object({requestNonce: ref('text')})},
    ['kind', 'version', 'requiredFeatures', 'userId', 'workspaceId', 'ownerEpoch', 'sequence', 'generatedAt', 'ownerValidUntil', 'sources', 'view', 'freshnessPolicy']),
    $defs: defs};
}
