# Embedded API — 0.1-draft

MQTT is now an additional transport work item for multiple publishers and
subscribers: see the [draft MQTT review/profile](../../design/api/0.1-draft/MQTT-TRANSPORT.md).
No MQTT client, broker or network adapter is implemented/installed yet.

The [offline MQTT rehearsal](../../design/api/0.1-draft/MQTT-OFFLINE-REHEARSAL.md)
tests application semantics through the real API; it is not an authenticated
network adapter or proof of multiple-display delivery.

The [LVGL/ESP32 subscriber target](../../design/api/0.1-draft/LVGL-ESP32-DISPLAY.md)
is a separate implementation work item, not firmware supplied by this module.

This is a source-module development API, not a published stable SDK or a live
Briar harness connector. The accepted visual baseline remains identifiable;
new inspection interactions live separately under `design/inspection/`.

## Run the examples without installing anything

From `implementation/` with the existing Python `jsonschema` environment:

```sh
node scripts/synthetic-adapter-example.mjs
node scripts/embedded-preview.mjs
node scripts/inspection-mockup.mjs
node scripts/api-overlay-recording.mjs
node scripts/multi-display-example.mjs
```

The first command prints a bounded synthetic trace. The second generates the
accepted face demonstration. The third generates the **proposed** work-inspection
mock-up. Open the respective HTML files in `test-artifacts/`; no server is needed.
These examples use the existing test-only Python schema oracle in the Node host.
They are not production validation, authentication or actual-platform acceptance.

The fourth command exports an ignored local fidelity-test scene tape, with an
opt-in Godot consumer described in [the host guide](../../wiki/Godot-API-Recording.md).
It is not an MQTT/device wire representation; no visible launch is automatic.

The fifth command demonstrates three independent presentation controllers fed
from one accepted synthetic view: normal motion, reduced motion and attention
disabled. Each keeps its own clock, preferences and cue sequence. Acknowledging
a concern is shared state, not resolution; source expiry is unknown everywhere.
This is in-process fan-out, not subscriptions or MQTT delivery. The example's
single host pump calls the existing facade's `present()` before `read()` to flush
announcements; displays must not each consume that facade controller. A real
bridge still needs a reviewed view envelope, owner/expiry rules and reconnect
policy. No production API or accepted renderer is changed by this example.

## Host responsibilities and module boundaries

`embedded.mjs` exports `createEmbeddedPresence({userId, workspaceId, validate,
policy, presentation})`. The trusted host provides scope, a complete synchronous
JSON Schema validator and explicit clock/lease/grouping and cue policies. The
host must implement real admission/authentication before using live data. User
and producer identity are never supplied by arbitrary wire payloads.

```js
import {createEmbeddedPresence} from './api/embedded.mjs';
import {createSyntheticProducer} from './api/synthetic-producer.mjs';
// Host-owned bindings, validator and explicit policy objects are required.
const api = createEmbeddedPresence(hostOptions);
const admitted = api.admitProducer(hostProducerBinding, now);
if (!admitted.ok) throw new Error(admitted.code);
const synthetic = createSyntheticProducer({
  port: admitted.port, session: hostProducerBinding.session,
  epochMs: hostOptions.policy.epochMs
});
const receipt = synthetic.report('work', syntheticWorkRecord, now);
if (!receipt.ok) handleRejectedInput(receipt); // do not pretend success
```

The placeholder names above are integration points, not defined credentials or
defaults. The runnable example supplies concrete synthetic bindings and records.

- Producer port: `submit(completeSnapshot, now)`. The synthetic sample's
  `report('work' | 'concern' | 'attention', record, now)` assembles complete
  snapshots, retaining old observation timestamps and committing its cache only
  after acceptance. It has no user-action route or real event discovery.
- Bound user port: `read(now)`, `focus(message, now)`,
  `acknowledge(message, now)`, `resolveConcern(request, now)` and
  `present({now, preferences})`. Focus/acknowledgement messages require request
  IDs and expected view revisions; closure is explicit and revision-checked.
- `presentation.mjs`: projects accepted state into inspectable semantics and a
  reference renderer scene, preserving IDs, uncertainty, omission and freshness.
  The current nine-group/1,170-light layout is an explicit reference restriction,
  not a universal scene specification.
- `core/state.mjs` and portable presentation use no OS, network or ambient clock.
  Python subprocess validation belongs only to the synthetic Node example/test
  host. Canvas/Godot/window operations stay in host/renderer code.

## Failures and compatibility

Inspect `{ok, code}` results; never turn a rejection into an optimistic display
change. A stale expected view revision requires reading current accepted state
and a new deliberate action, not replaying an old focus choice. Reconcile exact
session/revision after ambiguous effects before retry. Surface thrown
configuration/time-contract errors as host failures, never as healthy idle.

`capabilities()` currently declares synthetic-only embedded transport and no live
authentication, persistence, subscriptions or multi-display delivery. Do not
infer support from a planned field or a method name.

The wire version is **0.1-draft**. Unknown core fields/values and unsupported
required features fail closed under the draft schema/handler. Treat changes to
wire meaning, expected revisions, omission/freshness or acknowledgement as
compatibility changes requiring fixtures and explicit release notes. An additive
extension cannot grant authentication or change core meaning. There is no stable
version/deprecation promise yet and no automatic schema fetching or executable
extension loading. A release/version negotiation scheme remains a proposal until
reviewed; source-module compatibility is not a deployed-client guarantee.

See [the proposed harness mapping](../../design/api/0.1-draft/HARNESS-CONNECTION.md)
and [the six-step plan](../../wiki/Baseline-Next-Steps.md) for remaining gates.

Assisted-by: Briar
