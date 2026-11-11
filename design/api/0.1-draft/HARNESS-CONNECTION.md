# Harness connection — proposed mapping, not a live adapter

The exact Briar headless-harness event interface and execution host have not
been inspected or selected. This document proposes the normalisation boundary;
the rows below are meanings to map, not a claim that these raw events exist.
Alex selected synthetic-only overnight work. No private harness store or
transcript is read and no listener/subscription is running.

Alex also requested MQTT as a transport for multiple publishers/subscribers.
[Its draft profile](MQTT-TRANSPORT.md) separates input publishers from the
accepted-state owner and display subscribers. Assess it as an alternative
host transport, retaining the embedded core; no broker/source is selected yet.

| Observed meaning | Proposed accepted API facts | What must not be inferred |
| --- | --- | --- |
| A real workload starts | Work lifecycle `running`, independent observation timestamp | Wrapper launch or queued work is not proof the real workload is running |
| Work waits | `waiting` with wait party/reason | Waiting for Alex alone is not time-sensitive or critical |
| Work finishes successfully | Finished work and explicit successful result | Unresolved concerns remain open; evidence is not user closure |
| Work fails | Finished work with failure result; factual evidence | Exit code does not establish impact/severity or justify a red cue |
| A concern is raised | Separate concern ID/revision, origin, summary, impact/evidence if known | Unknown severity is unassessed; provisional harm is not confirmed harm |
| A response is needed | Distinct awareness/needs-you/time-sensitive attention item | A concern and its request are not two independent problems; timing needs a basis and delay consequence |
| Alex notices a concern | Exact-revision acknowledgement from the bound user path | A producer event cannot impersonate Alex or resolve the concern |
| Alex closes a user-raised concern | Explicit revision-checked closure from the bound user path | Producer evidence or work success cannot close it |
| Source disappears | Lease expiry plus retained fact freshness | Silence is unknown, never healthy idle or success |
| Source reconnects | New admitted generation/session, current complete snapshot | Old sessions, queued focus choices and stale attention are not replayed |

## Boundary before live work

Name the exact producer repository/interface, development execution host and
user/workspace. Bind identity at admission, not from event text/session strings.
Source honesty and authentication remain separate from schema validity. Producer
and user operations use separate capabilities; “Needs you” is not an approval
grant and the face must never bypass an authority verifier.

Default data proposal: opaque stable task IDs, short user-approved labels,
lifecycle and explicit concern/request fields. Do not copy raw prompts,
transcripts, paths, secrets or tool output. Collect no inspection history or
cross-device preference data. Retention, rate/payload/queue capacity and actual
delivery transport require source-specific decisions, not guessed constants.

The adapter must send complete ordered snapshots, preserving original timestamps
for unchanged observations. Rejected input must not advance its accepted cache.
Do not retry blindly after an ambiguous effect: reconcile exact session/revision
and idempotency first. Use bounded lifecycle/startup tests; no model polling.

## Implemented synthetic sample, explicitly not live

`implementation/api/synthetic-producer.mjs` turns normalised synthetic work,
concern and attention reports into complete snapshots submitted through an
already-admitted port. The existing full schema validator and state handler
decide acceptance. Cache/revision advance only on success. The sample has no
network, timers, discovery, private-data access or user-action capability.

The synthetic sample does not prove the raw harness mapping, real authentication,
backpressure, persistence, live reconnect, actual desktop delivery or privacy
under real payloads. Step 4 stays incomplete until a named live integration is
separately authorised and tested.

## Exact decisions for Alex's return

1. Which producer implementation/interface and development host are in scope?
2. Which minimised fields may it emit, and which labels/evidence need redaction?
3. What admission/authentication and stop/retention boundaries apply there?
4. Which uninstalled display host and actual-platform checks should receive it?

These are requirements for a concrete live-access proposal, not a request for
blanket access to all Briar activity. No new grant is needed for already covered
synthetic development; do not repeat settled overnight/embedded choices.

Assisted-by: Briar
