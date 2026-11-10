# API direction

[Wiki home](Home.md) · [Platform capabilities](Platforms.md) · [Architecture](../implementation/ARCHITECTURE.md)

Alex's direction, 10 November 2026: enable people to use Briar Presence through
an API, driven by the Briar harness **or in other ways**. Producer independence
is agreed direction. The interface details below are proposals, not implemented
endpoints, a frozen protocol or authority to start a service.

## What the API should do

Accept bounded descriptions of observable work and attention needs. A producer
could be the Briar harness, another assistant, a build system or a user's own
application. The visualisation should not require access to their editor,
transcripts, model internals or privileged execution environment.

The consumer interprets those descriptions into the shared visual language.
Each platform renders and animates locally. Do not stream every light position
or raw animation frame over a network as the normal integration model.

## Proposed separation

| Boundary | Responsibility |
| --- | --- |
| Producer adapter | Translate the source's observable state into a versioned public model |
| Input API | Validate identity/scope, version, ordering, freshness and payload; accept only bounded data |
| Meaning and behaviour | Combine work/attention information and generate the local light scene |
| Renderer | Canvas, Godot or a future hardware-appropriate representation |
| Platform host | Movement, controls, accessibility, preferences and supported native features |

The existing scene version 1 and synthetic state selector are **not** a complete
public integration API. Preserve their reference behaviour while designing the
new input boundary explicitly.

## Information to define

- A stable producer identity and user/workspace scope, with separate work IDs.
- Observable work state, distinct from attention priority and reasons.
- A short human-readable summary and a safe route to relevant details.
- Observation time, ordering/revision and an explicit freshness policy.
- Whether a concern is open, acknowledged or resolved—these are different.
- Producer connection health, distinct from whether the work itself is healthy.

Never interpret a producer's silence as healthy idle. On expiry/disconnection,
show stale/unknown state deliberately. A task being acknowledged does not mean
it succeeded. Do not invent percentages or infer the user's emotions.

## Transport proposal, not a selection

Start by specifying the data model and examples. A small JSON-over-HTTP interface
documented with OpenAPI is a candidate for broad client access. Local IPC or
streaming can be separate adapters where justified; transport must not leak
into animation code. No broker, listener, endpoint paths, remote service or
authentication scheme has been selected or deployed.

Support a simple snapshot-first integration before adding a complicated event
system. Define idempotency, competing producer ownership, ordering, disconnects
and schema-version handling before promising interoperability. A future remote
API requires its own authenticated, encrypted and scoped deployment design;
localhost alone is not an authentication model.

## Privacy and authority

Default to one user's explicit scope; never broadcast Alex's work to other users.
Treat labels/reasons as untrusted plain text, not HTML, script or commands.
Define bounded payloads from actual consumer capacity. Keep secrets out of
display state and logs. Do not pass API credentials to the visual scene model.

The initial input API should not grant action/execution authority. Any later
acknowledgement or action-request interface needs a separate design; clicking
the face or submitting a concern must not authorise work in the producer's system.

## Licence and current status

Original project source is **GPL-3.0-or-later**, as selected by Alex. Third-party
engines/libraries retain their own licences and notices. GPL's distribution
obligations are not AGPL-style network-use obligations; this page does not promise
that offering a hosted API alone requires publishing server modifications.

Current implementation: synthetic inputs, Canvas/Electron preview, Godot study
and offline reference scenes. **No input API, live harness adapter, other producer
integration, authentication service or network listener exists yet.** Public
source availability is separate from production readiness and a hosted service.

Assisted-by: Briar
