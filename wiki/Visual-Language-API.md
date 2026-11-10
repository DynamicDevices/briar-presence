# A visual language for Briar: API review and work plan

[Wiki home](Home.md) · [API overview](API.md) · [Design](Design.md)

On 10 November 2026 Alex requested a comprehensive review of a flexible,
extensible API, then approved it: “lock this into the wiki and setup an issue
and set of sub issues to look at this work”. This is the approved planning
direction, not a frozen schema or permission to implement/deploy all the work.

**Clients describe what is happening and what needs attention; Briar Presence
decides how to express it.** The model must support the Briar harness or other
producers without requiring private transcripts, model internals or one renderer.
Animation runs locally, not as streamed particle positions or raw frames.
Random movement must not change reported facts.

## Three distinct interfaces

| Interface | Responsibility | Example |
| --- | --- | --- |
| Work and interaction input | Observable activity, results and concerns | Two builds running; one decision needed |
| User interaction | Inspect, focus, acknowledge and quiet | Show which build is waiting |
| Presentation preferences | User-controlled expression/accessibility | Reduced motion, brightness and surface |

Acknowledgement does not authorise work in a producer's system. Preferences do
not resolve concerns or change reported severity. Any later action-taking
interface requires a separate authority and security design.

## Information model to specify

### Producers and scope

Authenticate producers; bind permissions to explicit user/workspace scope and
record ownership. A producer ID in a payload is not authentication. Define
conflicting writers and any shared records explicitly. Isolate users' data and
preferences; do not hard-code personal project names or shared conversation history.

### Work

Work items need stable IDs, producer ownership, optional parent/group, a short
label/explanation, lifecycle, activity, waiting reason and safe details reference.
Proposed lifecycle values: queued, running, waiting, completed, failed, cancelled.
Activity may describe researching, building or checking independently. Names and
fields remain subject to contract review. Progress is optional and needs evidence.

Activity, outcome and attention are different: a failed build may need no
intervention; a successful check may leave a decision. Completion must not invent
user acceptance or erase an unresolved concern.

### Concerns

Concerns are first-class records, not just a red task state. Give each an ID,
related work, plain explanation, source, lifecycle and evidence/details reference
where useful. Distinguish a user-expressed concern, a producer-reported concern,
and a concern awaiting evidence or a decision. Do not infer emotion.

Open, acknowledged and resolved are separate facts; user-controlled snoozing is
separate again. Define who may change each fact and preserve attribution.
Acknowledgement may quiet repetition but must not resolve a concern. Disconnects
must not erase unresolved concerns. Severity and requested attention are distinct,
not unrestricted animation instructions.

### Interaction and freshness

Represent observable interaction: focus on an item, a response/result ready,
a question awaiting the user, or a wait on another person/external event. Do not
claim continuous listening, measure feelings or expose private reasoning. Focus
is not producer authority and must not leak between users.

Separate transport connectivity, authentication state and work health. Specify
observation time, accepted revision, expiry and clock-skew handling. Preserve
last-known information with an explicit stale/unknown treatment when updates
stop. Silence must never become reassuring healthy idle.

## Meaning becomes visual language

| Information | Expression to test, not a frozen design |
| --- | --- |
| Several active work items | Distinct independently moving groupings |
| User focus | Gentle gathering towards the shared abstract face |
| Concern on one item | Local change with a route to its explanation |
| Related concerns | Grouped indication, not competing alarms |
| Missing information | Distinct uncertainty with plain explanation |
| Result ready | Restrained transition followed by quiet presence |

Do not assign a permanent cluster to every task: that becomes unreadable at
scale. Stable identity belongs in the model; presentation may group, prioritise
and simplify while inspection retains names/reasons/details. Define stable
grouping, focus selection, overflow and return-to-overview behaviour.

An important concern must not be averaged away by healthy items. Several concerns
must not create frantic competing animations. Apply user-controlled motion and
intensity limits; unattended time alone must not escalate indefinitely. Specific
mappings and red cycling still need visual testing. Preserve the accepted quiet
lights, abstract-face gatherings and supportive, unobtrusive interaction.

## Extensibility

Provide controlled boundaries for producer adapters, additional activity types,
visual profiles and platform adapters. Keep the core vocabulary small. Desktop,
Canvas, Godot, desk devices and VR may express meaning differently; small devices
need not reproduce every particle or desktop control.

Use namespaced extensions, declared schemas and documented fallbacks. Unknown
optional extensions may be ignored; unsupported required features must produce
explicit incompatibility. Define version negotiation, stable IDs, deprecation
and extension-data preservation where appropriate. Capability discovery describes
actual consumer support and limits. Extensions must not redefine resolution,
hide stale input or override accessibility preferences.

Incoming data must not supply executable shaders/scripts or arbitrary downloaded
assets. Deliberately installed visual profiles are a separate extension mechanism,
not code carried by status messages.

## Contract and transport proposal

Start with complete atomic producer-scoped snapshots. Define omission explicitly:
removal is not success or resolution. Define deletion/tombstones and concern
retention where necessary. Reject outdated revisions; make retries idempotent.
Restart/session-generation handling must prevent an old producer process
overwriting a newer one. Specify conflicts, validation errors and atomic rejection.

| Proposed operation | Purpose |
| --- | --- |
| Read capabilities | Versions, features and actual limits |
| Replace producer snapshot | Atomic validated current view within owned scope |
| Read combined view | Inspect accepted information, including freshness |
| Subscribe to changes | Update inspection clients without repeated fetching |

These are sketches, not implemented endpoints. Acknowledgement/focus operations
need separate ownership/concurrency rules. Embedding or local IPC can adapt the
same semantics without HTTP. Add incremental events only for a real integration
need. Streams need reconnect/resume, gap detection, snapshot recovery, bounded
buffering/retention, backpressure and slow-consumer handling. Animation stays local
when transport is quiet; stale information stays visibly stale.

### Standards reviewed

- [OpenAPI](https://spec.openapis.org/oas/latest.html) for HTTP documentation.
  Latest reported 3.2.1 during this review; pin a supported revision when selecting tools.
- [JSON Schema 2020-12](https://json-schema.org/draft/2020-12) for validation;
  check validator support and OpenAPI compatibility before adoption.
- [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html) for
  structured errors without private state or implementation traces.
- [Server-Sent Events](https://html.spec.whatwg.org/multipage/server-sent-events.html)
  as a candidate for one-way subscriptions, with authentication/recovery specified.
- [CloudEvents](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md)
  and [AsyncAPI](https://www.asyncapi.com/docs/reference/specification/latest)
  if broader event interoperability is needed, not prerequisites for local input.

WebSockets are not currently required. No broker, framework, authentication
scheme, transport or dependency is selected. Check maintained implementations,
licences, supply chain, platform fit and actual interoperability before adoption.
The meaning model remains a custom application contract; standard transport alone
does not establish whole-system conformance.

## Privacy, security and accessibility

- Authenticate local clients too: localhost is not authentication. Bind reads
  and writes to producer/user/workspace scope, including the combined view.
- Treat labels/reasons as untrusted plain text. Validate details links; never
  execute supplied commands or open external resources automatically.
- Keep credentials outside scene data. Minimise work content/logs; no transcripts,
  secrets or private reasoning required. Define retention/deletion and a
  shared-screen mode that hides sensitive labels.
- Derive payload, record-count, rate, queue and retention limits from consumer
  capacity. Reject excess explicitly; malformed input must not show healthy idle.
- Preserve reduced motion, brightness limits, text equivalents, non-colour cues,
  keyboard access and user control over attention regardless of producer urgency.

Remote access needs its own authenticated/encrypted deployment scope. Offline
abuse-case tests do not authorise remote testing, a listener, telemetry or actions.

## Staged work and acceptance

Tracking: [parent issue #3](https://github.com/DynamicDevices/briar-presence/issues/3).

| Sub-issue | Outcome | Prerequisites |
| --- | --- | --- |
| [#4 Vocabulary and scenarios](https://github.com/DynamicDevices/briar-presence/issues/4) | Plain meanings and synthetic acceptance stories | Starting point |
| [#5 Contract and reliability](https://github.com/DynamicDevices/briar-presence/issues/5) | Snapshot model, ownership, recovery, validation/errors | #4 |
| [#6 Visual aggregation](https://github.com/DynamicDevices/briar-presence/issues/6) | Grouping, focus, overflow and concern expression | #4 |
| [#7 Safeguards](https://github.com/DynamicDevices/briar-presence/issues/7) | Privacy, trust boundaries and accessible attention | #4; develop alongside #5 |
| [#8 Extensions and capabilities](https://github.com/DynamicDevices/briar-presence/issues/8) | Versioning, profiles and platform fallback | #5, #7 |
| [#9 Offline playback/conformance](https://github.com/DynamicDevices/briar-presence/issues/9) | Synthetic end-to-end evidence and human readability | #5–#8; scenario design can start earlier |
| [#10 First integration scope](https://github.com/DynamicDevices/briar-presence/issues/10) | One explicitly chosen producer/display integration | #9 and separate execution/deployment scope |

The parent is not delivered merely because these records exist. Whole-delivery
effort, staffing/capacity and dates remain unestimated; do not double-count parent
and child work. Each issue records its own observable acceptance conditions.

1. **Vocabulary/scenarios:** ordinary work, parallel work, focus, expressed
   concerns, decisions, completion and disconnection in plain language.
2. **Contract:** schemas/examples, ownership, revisions, freshness, concern
   lifecycles, errors and extension/capability rules. No listener.
3. **Offline playback:** synthetic multi-work scenarios through a shared meaning
   layer; refine readability while preserving accepted light motion.
4. **First bounded integration:** agree one producer, one display and runtime/
   security scope before implementation or connection. A later milestone.

Parallel design covers visual aggregation, safeguards and platform extensions.
The linked issues define acceptance/dependencies, not staffing or date promises.
Creating an issue does not authorise its implementation. Review/CI and real-platform
acceptance remain distinct from examples and successful offline playback.

Test duplicates/reordering, producer restart, clock skew, partial disconnection,
conflicting writers, many items, unknown extensions, malformed/oversized input,
reduced motion and acknowledged-but-open concerns. Include atomic rejection,
snapshot omission, stale late updates, stream recovery where selected and isolation
between users/producers. Keep scenarios synthetic until integration is authorised.

Human acceptance: can someone glance at Briar, understand whether something needs
them and find the relevant work without distraction or false reassurance?

## Current limits

The prototype accepts one synthetic state at a time; the existing light-scene
contract is not this public input API. No listener, authentication service, live
harness adapter, telemetry, startup, hardware or VR implementation exists here.
Existing GPL-3.0-or-later licensing and third-party notices remain unchanged.

Assisted-by: Briar
