# Offline MQTT ingress rehearsal — not a broker adapter

This source-only example prepares application cases for [MQTT issue #11](https://github.com/DynamicDevices/briar-presence/issues/11).
It imports no MQTT library, opens no connection and makes no authentication or
interoperability claim. The illustrative topic convention remains a proposal.

`mqtt-offline.mjs` maps exact host-configured topic tokens to already-admitted
producer ports. It parses synthetic JSON and invokes the **real** embedded API,
full schema validator and state handler. It does not duplicate task/concern
validation, mutate shared focus, implement user-command transport or publish a
view wire format. Topic aliases and session strings are not credentials.

From `implementation/`, run with the existing test environment:

```sh
node --test test/mqtt-offline.test.mjs
```

The six cases establish:

| Case | Actual exercised boundary |
| --- | --- |
| Two producers with matching work IDs | Host-bound ports preserve separate producer namespaces |
| Duplicate and late input | The real reducer accepts exact retry quietly and rejects old revision without changing current records |
| Retained/unknown-topic/invalid input | Rehearsal rejects the passed retained flag and unknown exact topics; real validator rejects user commands on producer ports |
| Two readers | Reads observe one accepted focus and independent output copies, not actual MQTT delivery/subscriptions |
| Expiry/omission | Source expiry is unknown; fresh other work cannot refresh an omitted concern's observation |
| Topic tokens | Proposed aliases reject separators/wildcards and duplicate host bindings |

Broker-delivery metadata is supplied by the synthetic caller. No test authenticates
a publisher or verifies ACL enforcement, TLS, MQTT packet handling, QoS exchanges,
offline queues, retention, bridge failover, actual subscriber delivery or revocation.
The sample explicitly reports `brokerConnected: false` and
`sourceAuthenticated: false`. Do not deploy it as an authenticated ingress.

## Findings for the real adapter design

A message callback's retained flag alone is insufficient to enforce “never
retain input”. Broker forwarding/subscription options affect that flag, and an
ordinary unretained command may still be queued in a persistent session. Review
broker-side retain policy, session queues, expiry and replay rejection; verify
actual behaviour on the selected broker/client versions. The rehearsal tests
only rejection when the synthetic retained flag is true.

The embedded facade currently owns one presentation controller. Two consumers
calling its `present()` share that controller and queue consumption; this is
**not** a multiple-display delivery solution. The accepted-state owner should
publish a reviewed view/announcement stream, while each display owns a separate
presentation clock, preferences and replay-safe cue state. Reconnect adopts the
current accepted focus without replaying old transient cues. This split still
needs its wire/reconnect contract and real transport implementation.

The accepted-view wire format, owner epoch/revision, expiry/clock policy and
receipts remain review work. Do not reuse the user-focus view revision as an
aggregate transport sequence without checking its meaning: producer observations
and user-view changes have different ordering. The temporary Godot scene tape is
not that contract or a payload suitable for MQTT/LVGL.

The current user-raised-concern closure operation is a bound host method, not
a schema-defined MQTT message kind. Specify its deliberate wire representation
and authority/revision checks before claiming all user operations are supported
over a broker; do not route arbitrary method names from message text.

Assisted-by: Briar
