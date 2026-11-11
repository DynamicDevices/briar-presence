# MQTT transport — review item and draft profile

Alex requested MQTT on 11 November 2026 so multiple publishers and subscribers
can connect to the visualisation API. This is an additional proposed transport,
not a replacement for the embedded library, a selected broker or an implemented
network connection. Synthetic overnight scope remains unchanged.

Dedicated work item: [MQTT transport #11](https://github.com/DynamicDevices/briar-presence/issues/11).
The [LVGL/ESP32 subscriber #12](https://github.com/DynamicDevices/briar-presence/issues/12)
is separate and depends on the agreed view contract.

## Proposed architecture

Multiple admitted producer clients publish **inputs**. One accepted-state owner
per user/workspace admits sources, validates complete snapshots and applies the
existing ordering, freshness, focus and acknowledgement rules. Multiple display
clients subscribe to that owner's **accepted views**. User operations travel
through a separately bound user path. Producers must not publish authoritative
views or impersonate user commands.

MQTT distributes messages; it is not the state reducer, source admission or
conflict-resolution authority. Several independent reducers on the same topics
would create split-brain focus/acknowledgement. Multiple active owners, failover
and persistence require a separately designed ownership protocol, not merely
MQTT shared subscriptions or another subscriber.

```text
producer clients --> input topics --> admitted bridge + existing state handler
                                                 |
bound user commands -----------------------------+
                                                 |
                                         accepted-view topic
                                                 |
                                desktop / Godot / other subscribers
```

## Candidate MQTT 5 profile — for review

Use the OASIS MQTT 5.0 standard as the first profile to assess. It supplies
message/session expiry, response/correlation properties and delivery controls;
these do not themselves supply application permissions or exactly-once effects.
MQTT 3.1.1 compatibility may be useful, but needs an explicit reduced profile
and interoperability tests rather than an untested fallback claim.

Illustrative topic layout (not yet a frozen public contract):

| Topic under `briar-presence/v0.1/<workspace>/` | Writer | Reader |
| --- | --- | --- |
| `in/producer/<producer>/snapshot` | Admitted producer identity only | Accepted-state bridge |
| `in/user/<user>/command` | Bound user client only | Accepted-state bridge |
| `out/view/<user>` | Accepted-state bridge only | Authorised displays for that user/workspace |
| `out/receipt/<user>/<client>` | Accepted-state bridge only | That authorised client |
| `status/<bridge>` | Bound bridge/status mechanism | Authorised displays |

Map logical IDs onto host-approved topic tokens; reject MQTT separators and
wildcards in tokens. A topic prefix, client ID, payload workspace, session string
or TLS connection alone is not admission. Broker credentials/ACLs and the bridge
must bind actual producer/user/workspace scope. Do not trust publisher-selected
actor IDs. TLS, credential custody, ACL administration and server identity need
exact deployment scope before connection. No anonymous writable broker or broad
wildcard subscription to other users' data is proposed.

## Delivery and reconnect rules to specify

- Start by assessing QoS 1: duplicates are expected. Existing producer
  session/generation/revision and exact user request IDs/revisions still govern
  effects. MQTT QoS 2 is not a substitute for application idempotency or scope.
  Cross-publisher arrival order is not a global application order.
- Never retain producer inputs or user commands. Reconnecting must not replay
  an old acknowledgement/focus/closure as a new deliberate user action. Consider
  broker session queues and expiry as well as the MQTT retained flag.
- A retained accepted view can help a new subscriber, but only if its fields,
  privacy, authoritative revision, original fact times, source leases and
  expiry/unknown display behaviour are specified. Delivery time cannot refresh
  an old observation. A retained “connected” message must not imply health.
  Whether to retain any views remains a review decision, not a default here.
- A broker Last Will/status message can hint that a client disconnected, but
  does not prove work failure/success, expire a source lease by itself or resolve
  a concern. Broker loss and accepted-state-owner loss need explicit unknown
  handling at subscribers, independent of producer lease handling.
- MQTT Message Expiry and application observation/lease expiry have different
  meanings. Neither establishes a human deadline or consequence of delay.
  Broker Session Expiry controls session lifetime, not accepted-state retention.
- Receipts need bounded correlation and a fixed authorised response destination.
  Do not blindly honour an arbitrary publisher-supplied Response Topic. Correlation
  data is not identity, permission or a reusable capability.
- Separate full view snapshots from optional deltas. The current draft schema
  covers producer/user input, **not a frozen accepted-view wire format**. Define
  an explicit versioned view/receipt/status envelope and unsupported-feature
  behaviour; reconnect requires a current authoritative full view, not guessing
  from missing deltas. Preserve original semantics across embedded/MQTT hosts.
- Decide payload/record/rate/queue/backpressure bounds from the named producer,
  broker and display capacity. Reject atomically and report overload explicitly;
  do not silently drop unresolved concerns. No arbitrary capacity limit is
  selected by this design note.

## Privacy and implementation choices

Use only minimised structured work/concern/request data. Broker queues, retained
records, logs, topic names and subscriptions all affect exposure/retention. Keep
raw prompts, transcripts, secrets, approval records and private paths out of
topics/examples. Multi-user ACLs and revocation need negative tests.

Assess maintained open-source clients such as MQTT.js for Node and Eclipse Paho
for Python, plus an isolated Eclipse Mosquitto development broker if approved.
These are candidates, not installed/selected dependencies. Before adopting one,
pin the exact release/integrity, inspect licence/transitive obligations and
security/maintenance evidence, then test two independent client implementations.
Do not implement a new MQTT protocol stack or fork an existing one by default.

Authoritative standard:
[OASIS MQTT Version 5.0](https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html).
Candidate implementations:
[MQTT.js](https://github.com/mqttjs/MQTT.js),
[Paho Python](https://github.com/eclipse-paho/paho.mqtt.python),
[Mosquitto](https://github.com/eclipse-mosquitto/mosquitto).
Source availability/metadata is discovery evidence, not protocol conformance,
security clearance or licence acceptance.

## Tracked review and implementation sequence

1. Review and implement this profile under dedicated issue #11, linked to API
   contract #5, first-integration #10 and the six-step baseline plan. Alex's request adds MQTT to the
   work; specific topic/owner/retention choices remain proposals.
2. Specify and offline-test versioned envelopes, topic/scope mapping, duplicate/
   out-of-order handling and reconnect/unknown rules using synthetic fixtures.
   Keep embedded operation independent of MQTT dependencies.
3. Select an exact isolated development broker/host, clients, TLS/admission and
   minimised data scope, with required signed coverage before installation or
   network connection. Existing no-listener synthetic scope is not that coverage.
4. Demonstrate multiple producers and subscribers, user scope isolation,
   rejection/receipt handling, duplicate delivery, queued/retained stale data,
   broker/bridge interruption and reconnect without stale focus replay or false
   healthy state. Record real broker/client versions and actual results.
5. Only after that evidence, integrate the reviewed transport adapter into the
   uninstalled display/harness candidate. Do not mark MQTT implemented or live
   integration complete from an offline envelope test.

Assisted-by: Briar
