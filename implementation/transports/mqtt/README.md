# MQTT5 accepted-state and display candidate

This integrates the existing primary-checkout MQTT source into the isolated API
delivery branch. Primary originals remain untouched. Modules do not connect a
broker, install a client library, start timers or grant publisher/display access.
They require an already authenticated, explicitly configured host client.

## Boundaries

- `view-schema.mjs` composes the complete accepted-view envelope from the existing
  input vocabulary. Producer snapshots remain unchanged.
- `view-wire.mjs` publishes original source observation/lease deadlines and a
  separate owner epoch, sequence and deadline. The receiver requires fresh
  nonce-bound bootstrap, fixed scope, complete schema validation, conservative
  clock checks and monotonic expiry. Retained inputs/views are not bootstrap.
- `accepted-bridge.mjs` routes only fixed producer/sync topics to host-admitted
  ports. No arbitrary reply topic or user-action route is accepted. Identical
  producer retries do not publish a new view or renew the producer lease.
- `client-host.mjs` attaches MQTT.js-style callbacks. Require MQTT5, clean
  sessions, zero session expiry, explicit reconnect ownership and disabled
  offline/resubscribe queues. Host-provided payload/in-flight limits are checked;
  MQTT5 negative PUBACKs, failed subscriptions and disconnects are not success.
- `receipt.mjs` binds application results to the exact producer snapshot bytes.
  The [producer/recovery contract](PRODUCER.md) describes the `.2` receipt format,
  accepted cache, explicit retry, session fencing and fresh restart admission.
- `display-handoff.mjs` supports the existing portable presentation plans.
- `turmo-host.mjs` reuses the same receiver/subscriptions for the new locally
  animated TURMO scene. It does not transmit light geometry over MQTT.

The embedded user facade adds `exportAccepted(now)` and
`flushAnnouncements(now)`. Read/export does not renew source leases.
Flush once at the bridge; displays consume their own receiver's announcements.
ISO-unrepresentable clock values/deadlines are rejected, not thrown as exceptions.

## Host integration

Construct a `createViewReceiver()` with explicit authenticated user/workspace,
full `createViewSchema(inputSchema)` validator and measured clock/owner limits.
Pass that receiver, an MQTT5 client and trusted local projection policy into
`attachTurmoDisplayClient()`; give it an `onFrame` sink for Canvas/another local
consumer. The host supplies clock, nonce generation, display preferences,
fixed topic tokens and payload/in-flight limits. `sample()` advances the local
animation and checks expiry even without a new message. `stop()` detaches the
callbacks and ends the client by default; no internal reconnect loop exists.

Broker mutual TLS, publisher identity/ACL enforcement, credential provisioning,
subscriber routing and nonce unpredictability are independent host obligations.
Topic strings and payload labels do not prove who published a message. The
test-only Python schema oracle is not a production validator service.

## Evidence and remaining work

Offline tests exercise the real reducer, complete schemas, independently scoped
producer ports, receivers and actual TURMO pixels. MQTT EventEmitter doubles
exercise callback contracts, backpressure, negative PUBACKs and reconnect—not
TCP, a broker, TLS, ACLs or independently running remote producers.

Producer acceptance now requires a matching correlated application receipt, not
a PUBACK. The in-memory adapter retains pending bytes on ambiguous delivery and
requires explicit host re-admission for fenced/stale/conflicting sessions. This
does not implement durable receipt/cache storage. Outbound view capacity failure can follow reducer acceptance; the bridge
reports that separately and still emits the producer's accepted receipt. This
does not establish atomic end-to-end delivery to every subscriber.

Live independent local/remote interoperability and physical-display cadence
acceptance remain outstanding. No new broker, remote deployment, private chat
source or physical display handover is implemented/authorised by these modules.
The accepted TURMO alpha/player remains separate and unchanged by API tests.

Assisted-by: Briar.
