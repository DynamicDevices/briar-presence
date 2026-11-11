# Building on the accepted visual baseline

[Wiki home](Home.md) · [Accepted baseline](Embedded-API-Preview.md)

Alex adopted these six steps on 11 November 2026. He selected **synthetic data
overnight**, with the exact live-connection proposal prepared for his return.
The clustered-light face at source `3748f93` is the visual baseline, not a
throwaway prototype. Design proposals and implementation evidence stay separate.

Alex subsequently requested **MQTT as an API transport** for multiple publishers
and subscribers. [The MQTT review/profile](../design/api/0.1-draft/MQTT-TRANSPORT.md)
is part of steps 3 and 6, linked to contract issue #5 and integration issue #10.
It does not replace the embedded API or authorise a broker/network connection.

The [offline MQTT rehearsal](../design/api/0.1-draft/MQTT-OFFLINE-REHEARSAL.md)
now exercises multiple producer namespaces and shared accepted-state reads.
It also identifies retained/session-queue and per-display-controller requirements;
no broker interoperability or actual subscription delivery is claimed.

Alex also requested an LVGL implementation for an ESP32-class MQTT-subscribing
display, then asked for separate issues. These are now
[MQTT transport #11](https://github.com/DynamicDevices/briar-presence/issues/11)
and [LVGL/ESP32 display #12](https://github.com/DynamicDevices/briar-presence/issues/12),
both under API parent #3. The device target depends on the MQTT/view contract;
its [design requirements](../design/api/0.1-draft/LVGL-ESP32-DISPLAY.md) are separate
from any firmware, broker or hardware execution.

| Step | Deliverable and acceptance | Dependency / current boundary |
| --- | --- | --- |
| 1. API review | Alex records exact reviewed source, findings and verdict; demonstrated defects are corrected and retested | Review package exists; visual approval and green CI are not independent code review |
| 2. Work inspection | Separate mock-up of clicking the face to find tasks, concerns and requests; Alex reviews clarity and unobtrusiveness | Proposed design, not accepted replacement interaction |
| 3. Harness connection design | Event mapping, source identity, privacy, freshness, disconnect/reconnect and bounded live-access proposal | Public/synthetic project material only; actual harness interface remains unverified |
| 4. One live integration | Named producer on an approved host drives an uninstalled preview; accepted state and failure behaviour verified | Requires exact live source/data scope and verification; a simulator is not live acceptance |
| 5. Overlay candidate | Separate uninstalled host preserves face drag, corner resize, fidelity, display sizing, smoothness and stay-on-top | Synthetic data/headless checks first; actual desktop acceptance and installed replacement are separate |
| 6. Reusable API | Executable examples, compatibility rules, honest capability/error reporting and portable host boundaries | Draft remains draft until review; no implemented device/VR support claimed |

## Order of work

While Alex is away, Briar can work on design, synthetic adapter/examples,
headless development-host checks and documentation. Keep each design proposal
labelled and preserve the accepted default. Do not wait idly for the code review
when independent authorised work remains, and do not mark the review complete.

The existing [API parent issue #3](https://github.com/DynamicDevices/briar-presence/issues/3)
and its issues #4–#12 remain the work tracker. This page is the agreed sequence,
not a new competing backlog. Issue #10 owns first-integration scope; issue
acceptance must retain real review, actual-platform and live-data boundaries.

## Current development evidence

The separate [work-inspection proposal](../design/inspection/0.1-proposal/DESIGN.md)
and its self-contained mock-up generator now exist. Generate it with
`node scripts/inspection-mockup.mjs` from `implementation/`; the output is
`test-artifacts/inspection-mockup.html`. It is not an accepted UI replacement.

The [harness mapping proposal](../design/api/0.1-draft/HARNESS-CONNECTION.md)
states unknown raw event/source boundaries explicitly. The
[API module guide](../implementation/api/README.md) includes the implemented
synthetic producer adapter and runnable example, compatibility limits and host
responsibilities. This is progress on steps 2, 3 and 6, not live completion of
step 4 or actual overlay acceptance in step 5.

New regressions cover recorded-state provenance, task grouping, unassigned
facts, keyboard interaction, Canvas execution, atomic producer caching and
success/acknowledgement/closure/expiry semantics. The accepted visual model,
facade, projection and Canvas renderer remain unchanged. The later
[Godot recording adapter](Godot-API-Recording.md) reuses those scenes and
corrects the preview generator's source-expiry fixture.

The design/producer batch `ab83cec` passed 81 tests locally and in genuine CI
run42935804700. The later overlay-recording candidate passes **83 Node tests**
locally, zero fail/skip/cancel, and **20 headless Godot checks each** against
sample and full recordings. Its own exact-source CI remains to be recorded.
These results are not Alex's independent review or actual-native acceptance.

## Questions for Alex's return

- Does the work-inspection proposal help locate the affected task without
  turning the quiet face into a dashboard that is always visible?
- What exact Briar headless-harness producer/interface and development host
  should the first live connection use, and what minimal data may leave it?
- Independent code review and later desktop acceptance remain Alex's steps.

No completion date is promised. Whole-delivery effort and timing are unknown
until the live interface, review findings and actual-platform work are known.

Assisted-by: Briar
