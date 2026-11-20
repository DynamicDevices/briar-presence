# Finite synthetic producer/owner actors

`synthetic-actors.mjs` prepares the revision-1 interoperability trial without
opening a network connection or reading a harness's chats. It reuses the primary
checkout's earlier synthetic actor design, updated for the admitted-session and
correlated receipt `.2` contract. The primary files remain untouched.

`runSyntheticActor()` accepts an injected, manually connected MQTT5-style client,
explicit clocks, full input/view/sync validators, control input and status/stop
sinks. The trusted host supplies `config`:

- `syntheticOnly:true`, `role` (`bridge`, `producer-a` or `producer-b`),
  absolute `deadlineUnixMs`, `tickMs`, `maxPayloadBytes`, `maxInFlight`.
- For the bridge: `ownerLeaseMs`, `sourceLeaseMs`, `observationTtlMs`,
  `futureSkewMs`, `groupWindowMs`; plus separate `epochMs` and `ownerEpoch`.

Configure capacity and cadence for the named host; these parameters are not a
capability grant, credential validator or deployment-readiness claim. The actor
uses only the `synthetic-workspace` / `synthetic-user` namespace and fixed role
sessions. It cannot choose an arbitrary live producer identity. There is no
broker launcher, TLS configuration loader, credential reader or remote deployer
in this module. Starting a real trial retains its separate authority and
verified client identity/ACL/capacity/retention requirements.

Each producer publishes five invented chats. Their IDs (`chat-0` through
`chat-4`) deliberately overlap, testing isolation by producer rather than title
or ID alone. The complete face consumes all ten chats even though only two rows
are visible. `producer-a` reports running work; `producer-b` reports dependency
waits. Each has one invented open concern. These are fixtures, not observations
of real local or remote harnesses.

The controller provides `tick()`, explicit producer `retry()`, isolated
`readProducer()`, `running()`, `stop()` and the bridge's `owner` object for trusted
host/test use. Waiting for a correlated application receipt is ordinary
backpressure: ticks neither stop the actor nor create another snapshot.
`retry()` resends the exact saved bytes; PUBACK alone cannot advance the cache.
An accepted duplicate reconciles receipt loss without renewing source time.
Stale revision, conflict or session fencing stops this actor and requires a
fresh trusted host binding; it never guesses another session. Startup uses
generation 1 only. This is not persistent owner/producer recovery.

The host deadline is armed before connecting. Deadline expiry, parent control
pipe loss, invalid control or connection/publication failure ends this finite
trial actor without a hidden reconnect/retry. The only control line is
`{"kind":"shutdown"}` followed by newline. Logs contain codes, not source
payloads or client exception strings. Config values are copied before starting.
The host owns process supervision and must treat startup rejection as failure.

`test/mqtt-synthetic-actors.test.mjs` uses an explicitly unauthenticated callback
transport double, the real reducer/schema validators, correlated receipts and
two independently configured live semantic TURMO consumers. It checks ten
colliding chat IDs, independent display preferences/local animation, mixed
freshness, receipt loss/retry, session fencing with concern retention, malformed
receipts and fail-closed actor shutdown. No test here proves broker ACLs, TLS,
cross-host delivery, durable restart or physical light-pipe cadence.

Assisted-by: Briar
