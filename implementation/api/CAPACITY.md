# Host capacity and retention

`createEmbeddedPresence()` and `createStateHandler()` accept an explicit
`capacity` object, with all six positive safe-integer fields required:

| Field | Bound |
| --- | --- |
| `maxProducers` | Admitted producer records |
| `maxWorkPerProducer` | Current work plus last-known work retained by concerns |
| `maxConcernsPerProducer` | Visible reported and omitted unresolved concerns |
| `maxAttentionPerProducer` | Current complete attention records |
| `maxMessageBytes` | UTF-8 JSON bytes of an in-process message, before validator/copy |
| `maxRetainedBytes` | UTF-8 JSON bytes of all retained reducer state except its single logical-clock scalar |

There are no deployment defaults. The trusted host must choose values for its
named producers, payload sizes, cadence and retention needs. Test-fixture values
are not recommendations. Legacy offline examples may omit `capacity`; their
`capabilities().capacityConfigured` is false. They are not bounded deployment
hosts. An admitted host must configure limits, not rely on legacy compatibility.

Retained bytes include concern history/known revisions, old sessions, canonical
retry bodies, user receipts, acknowledgements, closures, pending cues and emitted
announcement history. The byte count is a deterministic retained-data bound,
**not a JavaScript heap/RSS limit**. Transient validation, draft copies and trusted
host resources outside the reducer need their own process/resource controls.
For raw MQTT, the bridge/client `maxPayloadBytes` also bounds wire whitespace
and encoding before parsing; the core counts the serialised in-process object.

Every mutation is checked on its draft before commit. Overload returns a
`CAPACITY_PRODUCERS`, `CAPACITY_WORK`, `CAPACITY_CONCERNS`, `CAPACITY_ATTENTION`
or `CAPACITY_RETENTION` code. Oversize in-process messages return
`INPUT_PAYLOAD_LIMIT` before schema validation. No records, revision, source
receipt time, producer lease, user acknowledgement or cue is partially committed.
The monotonic host clock still advances on a rejected transaction, as before;
overload does not rewind time or renew facts. A corrected unaccepted revision
may be submitted again. Existing duplicate handling stays quiet.

There is deliberately **no automatic eviction or TTL deletion of safety
history**. A full retained-state budget can reject snapshots, new admission,
user commands and announcement flushes. It does not hide a concern, forget a
revision fence or reuse a session to make room. The host must surface saturation
and arrange an explicitly designed archival/restart policy before durable
deployment. This implementation remains in-memory; it does not claim crash-safe
retention, durable receipts or a safe automatic compaction procedure.

## MQTT ingress rate

`createAcceptedBridge()` accepts `ingressRate:{maxMessages,windowMs}`, both
positive safe integers. Each fixed admitted producer/display route has its own
window and counter. Known-route attempts—including malformed, retained,
oversize and duplicate traffic—consume that route's budget. Unknown routes
cannot allocate rate-tracking entries. One producer or display cannot consume
another's counter. Clock regression is refused; it cannot reset a window.
The config is copied. Legacy offline bridges may omit it and advertise
`ingressRateConfigured:false`; that is not a deployment-ready rate policy.

Exhaustion returns `INGRESS_RATE_LIMIT` with no publications or reducer effect.
The trusted bridge host reports this code; no rejected payload is logged or
echoed. The limiter does not reflect a receipt per excessive request, avoiding
unbounded output under overload. A producer may therefore retain an uncertain
pending request and must explicitly retry its exact saved bytes when the host
allows it. No automatic timer/replay is added to the producer adapter.

The limiter is an application input bound, not authentication, a broker ACL,
a network denial-of-service guarantee or a guaranteed output rate. Broker
packet/connection limits and authenticated per-role ACLs remain required.
Fixed windows permit a boundary burst. The host also owns owner-tick cadence;
MQTT in-flight bounds and the display's newest-frame sink independently bound
their queues. Source lease/observation TTL never increase because of overload.

The finite synthetic owner requires both capacity and rate configuration.
`test/capacity.test.mjs` checks record/retention saturation, omitted concern/work
accounting, UTF-8 boundary bytes, rollback/corrected revisions, history fences,
user receipt idempotence and independently limited fixed routes. These tests
do not qualify real deployment values or provide a persistence implementation.

Assisted-by: Briar
