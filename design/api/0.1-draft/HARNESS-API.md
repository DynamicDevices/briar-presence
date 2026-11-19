# Multi-harness visualisation API — accepted specification, revision 1

19 November 2026. Alex requested an API before live-chat integration so multiple
harnesses, local or remote, can drive the visualisation. This document defines
the agreed interoperability boundary using the existing API vocabulary. It
does not deploy a service, admit producers, connect real chats or change the
accepted TURMO alpha.

Alex accepted this specification on 19 November 2026: “makes sense - lets lock
this in as a spec”. Revision 1 fixes the producer/state-owner/display separation,
scoped identity, snapshot and accepted-view contracts, freshness/recovery rules,
read-only display boundary, TURMO mapping and MQTT 5 as the first network binding.
Implementation must follow these requirements; material changes need explicit
review. Existing wire version strings and this directory name stay unchanged.
Acceptance does not claim a stable published SDK or working remote integration,
authorise deployment/publication, or settle items explicitly left open below:
exact source/host admission, operational capacity and timing limits, persistence,
owner failover, and detailed display colour/speed thresholds.

## One contract, independent producers and displays

```text
local harness ── adapter ──┐
remote harness ─ adapter ──┼─> scoped state owner ─> accepted view ─> TURMO
other producer ─ adapter ──┘                                  └─> other displays
```

Each harness reports observable facts, not animation commands. One state owner
per authorised user/workspace validates and combines producer snapshots. Each
display consumes the same accepted facts but owns its animation clock, layout,
accessibility settings and physical update scheduler. Multiple harnesses do not
mean multiple competing owners of the same accepted view. Owner failover is not
specified or implemented by this specification.

The API carries no raw prompts, transcripts, private reasoning, credentials,
hardware approval proofs or pixel streams. Display data never grants execution
authority. A producer that reports a need for approval cannot approve itself.

## Contracts and existing implementation

| Boundary | Contract | Status |
| --- | --- | --- |
| Producer → owner | `producer.snapshot`, version `0.1-draft`; [JSON Schema](schema.json) | Existing draft and offline handler |
| Embedded host | `createEmbeddedPresence()`; [module guide](../../../implementation/api/README.md) | Existing synthetic facade, not live authentication |
| Owner → display | `presence.view`, version `0.1-draft.1`; [wire profile](MQTT-FIRST-CONNECTION.md#accepted-view-wire-proposal-01-draft1) | Existing offline wire components, not a released SDK |
| Network binding | [MQTT 5 profile](MQTT-TRANSPORT.md) | Existing trial work; no new broker launch authorised here |
| Accepted view → TURMO | Mapping below | Newly specified; not connected to the alpha player |

These are separate version numbers with separate meanings. `turmo-v0.1.0-alpha.1`
is the synthetic visual release, not an API compatibility claim. Do not silently
rename the existing wire values to match a release tag. Unknown core fields,
unsupported versions and required features reject without changing accepted
state. Optional namespaced extensions are data only, not executable adapters.

## Producer identity, isolation and ownership

The host admits a producer with a bound user, workspace, producer ID, session,
generation and lease policy. Payload labels/session strings are not credentials.
Admission and credentials are provisioned outside this data API. A local process
has no automatic permission merely because it runs on the same laptop.

Work, concern and attention IDs are scoped by producer. A display's stable key is
`(workspaceId, producerId, kind, id)`; `work-1` from two producers is two records.
Labels may coincide and may change without changing identity. No automatic
deduplication by chat title, URL or inferred meaning. A producer must not write
another producer's work. Moving ownership between harnesses requires an explicit
transfer design; do not accept two writers for one logical record by accident.

The same authenticated user may combine several producers within an authorised
workspace. Combining different workspaces/users is a separate explicitly scoped
view, not a wildcard subscription. The first trial targets one user/workspace.

## Producer operation: publish a complete snapshot

A snapshot contains the producer's current tracked work, concerns and attention
items. It is not a patch and does not overwrite other producers' state.

| Field | Required meaning |
| --- | --- |
| `kind`, `version` | `producer.snapshot`, `0.1-draft` |
| `session` | Exactly the admitted opaque session, not producer identity |
| `revision` | Increasing positive safe integer within that generation/session |
| `observedAt` | Snapshot observation time; not permission to refresh every nested fact |
| `work` | Stable ID, short label, own observation time, lifecycle and optional factual activity |
| `concerns` | Independently revisioned concerns with original observation, lifecycle and explicit resolution |
| `attentionItems` | Awareness, needs-you or time-sensitive requests; timing is separate from severity |

See [the example file](HARNESS-API-EXAMPLES.json) for two independent producers.
Each `snapshot` is valid against the existing input schema. The adjacent
`binding` is illustrative host configuration, **not** additional payload fields
or a credential. No `producerId`, bearer token or user authority is smuggled into
the snapshot. Required/optional fields remain owned by `schema.json`.

Lifecycle is `queued`, `running`, `waiting` or `finished`. Waiting requires a
party and reason. Finished requires an explicit outcome: succeeded, failed,
cancelled or unknown. Absence from a complete work list is not successful
completion; retain required last-known references according to the core policy.
Concern omission is not resolution: preserve it, mark omission/freshness and
retain its observation time. An acknowledged concern remains open. Producer
evidence cannot close a user-origin concern; use the separately authorised user
path and its existing provenance/revision checks.

No producer-supplied `urgency: true`, RGB value, pulse speed, brightness setting
or arbitrary animation script is added. Severity, uncertainty, response category
and timing basis use the existing [selected vocabulary](../../../wiki/Visual-Language-Vocabulary.md).
An error exit code alone does not establish critical impact. A request waiting
for the user alone does not establish time sensitivity.

## Ordering, receipts and recovery

1. Admit the authenticated binding; fence older generations/sessions. Session
   changes do not reset permissions, discard concerns or prove completion.
2. Validate the full schema, supported features, IDs/references, ownership and
   semantic constraints before atomic acceptance. Invalid input cannot refresh
   leases, advance revisions or modify the producer's accepted cache.
3. Accept increasing revisions. An identical retry of the same revision must
   have no new effect or renewed attention. Reusing a revision with changed
   content is a conflict; older revisions are stale, not new activity.
4. Delivery acknowledgements are not application acceptance. An adapter advances
   its accepted revision only on an application result. The logical result must
   distinguish accepted, identical duplicate, stale, conflict, invalid,
   unsupported, unauthorised and capacity rejection. Exact result codes remain
   owned by each existing facade/binding; this document invents no receipt topic
   or JSON envelope incompatible with the MQTT trial.
5. After ambiguous delivery, reconcile the admitted session/accepted revision;
   do not blindly replay a different body at the same revision. On restart,
   re-admit/fence, then send a current complete snapshot. Do not replay an old
   stream of user commands or animate an entire backlog of historical events.

Snapshots may coalesce rapid observations before submission, but cannot silently
drop a newly raised concern or its unresolved state. Durable acceptance,
crash/restart retention and producer acknowledgement storage need an explicit
deployment policy; the existing in-memory facade does not promise them.

## Freshness: three independent limits

A source connection being alive does not mean its work observations are current.
Preserve original fact times and distinguish:

- Producer lease: can this source still speak for its current session?
- Fact age: is this particular work/concern observation still current?
- Owner/view validity: can the display still rely on its state connection?

The accepted-view envelope carries source generations/revisions, original lease
deadlines, owner epoch/sequence, validity and observation policy. The display
recomputes expiry locally even when no packets arrive. Arrival of a retained or
duplicate view cannot refresh old facts. Owner heartbeats cannot extend producer
leases or rewrite fact times. New owner epochs require authenticated resync, not
acceptance of any publisher's claim to be the new owner.

Remote clocks require a declared, bounded uncertainty/skew policy for producer
observations and owner/display deadlines. Preserve source timestamps, separately
record trusted receipt time, and use conservative monotonic local deadlines.
Do not assume remote wall clocks are synchronised or re-date facts on arrival.
Excessive future times, backwards clock steps or unknown uncertainty produce
unknown/resynchronisation, not fresh activity. The current same-host wire trial
is not evidence that cross-host timing has been validated.

## Local and remote transport bindings

**Embedded:** a trusted host admits adapters and calls their bound `submit`
ports. Only that host may admit identities; never expose `admitProducer()` as an
unauthenticated public operation. In-process producer validation remains required.
Local cross-process IPC can wrap the same model later; no IPC service is added.

**Network:** use MQTT 5 as the agreed first network binding, following the existing profile,
not a second competing protocol. Producers publish inputs; only the scoped
owner publishes accepted views; displays subscribe read-only. Use the existing
input/view/receipt/status topic and bootstrap profiles. Validate topic identity
against authenticated ACL bindings, not payload assertions or client IDs.
TLS/server validation, scoped credentials, revocation and per-client ACLs are
required for a remote deployment. A tunnel alone does not establish application
authority. Do not use anonymous writable topics or broad cross-user subscriptions.

QoS 1 duplicates are expected; application identity/revision checks still apply.
Do not retain producer inputs or user commands. Reconnect obtains a current full
accepted view through the existing nonce-bound bootstrap, not an arbitrary stale
retained view. Disconnect/expiry retains concerns and makes freshness unknown.
See the MQTT profile for queues, retained views and bounded response routing.

HTTP/OpenAPI can be an additional binding if needed, using the same snapshots,
identity and acceptance rules. It is not selected, implemented or needed to make
the semantic API harness-independent. Do not advertise guessed REST endpoints.

## TURMO projection: facts in, animation local

The alpha currently plays pre-rendered synthetic frames. Its eight demo chat
objects are not a new public wire schema. A future adapter must consume accepted
views and produce a live semantic scene; changing the caption on a canned frame
is not live integration. Keep transport details outside the renderer.

| Accepted facts | Proposed TURMO meaning |
| --- | --- |
| Current `running` work | Ongoing work motion; next actor is the bound producer's display label |
| Current `waiting`, party `user` | Waiting cue; next actor is the configured bound user, not hardcoded Alex |
| Current `waiting`, party `person` / `external` / `dependency` | Waiting cue with that party/reason; do not invent a person's identity |
| `queued` or unknown party | Queued/unknown label; no invented next actor or percentage |
| Explicit `finished` result | Display the stated outcome, keeping unresolved concerns visible |
| Open concern | Persistent concern layer; severity/uncertainty and acknowledgement remain distinct |
| Open needs-you / time-sensitive item | User-attention cue; timing must carry its basis and consequence of delay |
| Expired fact/source/owner | Preserve last-known geometry and concerns, show stale/unknown; separately labelled neutral idle bar |

Every visible row carries a scoped stable identity. The two-row carousel is a
view into the complete authorised producer set. Overall geometry, work count,
concern count and attention state use **all** accepted producers and their work,
not only visible rows. Mixed live/stale producers remain mixed; one stale source
must not freeze valid independent sources or appear healthy because another
source renewed its lease. Do not average away an unresolved concern.

Do not encode the alpha's `urgent` boolean into the public contract. The renderer
derives attention from the selected semantic vocabulary. Exact colour/speed
thresholds remain display policy for review: retain blue activity, amber
attention and neutral unknown as the visual starting point, but do not claim
red distinguishes confirmed from provisional impact without a readable label.
No flashing, unlimited escalation or event-controlled brightness. Respect local
reduced-motion and brightness settings. Decorative bar movement never asserts
that the underlying harness is doing fresh work.

Producer delivery rate is independent of animation cadence. Renders sample the
latest accepted semantic state; smooth mode retargeting and ongoing animation
run locally. Preserve the accepted transfer scheduler: old/new light-pipe arcs
first, status text next, then dirty face patches within remaining time. Do not
queue network events as physical frames or let a large state snapshot block the
serial animation loop. Bridge/state processing must hand over an atomic scene
snapshot without sharing a blocking network call with the display writer.

## Capacity and the first interoperability trial

An admitted host must explicitly configure payload bytes, record counts,
publish rates, queue depth, lease/TTL, skew and retention bounds based on the
named systems. No guessed numeric ceilings are introduced here. Reject overload
atomically and report it; never silently truncate concerns or treat rejection
as renewal. Credentials, capacity and privacy policy are admission properties,
not trusted publisher choices. Do not advertise deployment readiness without
those values and their tests.

Before real access, agree exact source interfaces/hosts, minimised labels,
authorised user/workspace and deployment bindings. Then test at least two
independently identified producers, one local and one remote, with overlapping
work IDs and 5–10 total chats. Verify:

- Both sources contribute to the overall face regardless of carousel position.
- One source cannot edit another, publish views or issue user operations.
- Identical retry is quiet; stale/conflicting revisions do not refresh state.
- Restart fences old sessions, keeps concerns and resynchronises current state.
- Work success, acknowledgement and concern resolution remain different facts.
- Source, owner and network loss expire independently; mixed freshness is honest.
- Remote clock uncertainty fails to unknown rather than fabricating freshness.
- Reconnect does not replay stale user actions or historical animation bursts.
- Large updates preserve light-pipe cadence; measure real transport timing.
- Malformed/overload input has no partial effect; logs contain no private payloads.

These are acceptance requirements, not results. This document and the example
validation do not complete a live trial or revise the accepted alpha archive.

Documentation validation on 19 November: both example snapshots passed the
existing full input-schema oracle with date-time checking. Negative cases for
a spoofed extra producer field, missing wait details, arbitrary urgency and a
finished record without a result were rejected. Local document links resolved.
The deliberately colliding work IDs illustrate producer scoping; schema checks
alone do not prove authenticated isolation, ordering or cross-host operation.

Assisted-by: Briar
