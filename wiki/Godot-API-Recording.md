# Synthetic API recording in the uninstalled Godot candidate

[Wiki home](Home.md) · [Six-step plan](Baseline-Next-Steps.md)

This development adapter feeds **actual accepted synthetic API scenes** to the
existing Godot renderer. It is not a live producer connection, MQTT transport,
installed replacement or device implementation. The default study launch still
uses its existing visual path; playback is explicitly opt-in.

## Prepare now, launch only when wanted

From `implementation/`:

```sh
node scripts/api-overlay-recording.mjs
node scripts/launch-godot.mjs --api-recording
```

The first command creates a local recording without opening a window. The
second explicitly opens the separate candidate using the already pinned local
engine; it does not install/download an engine or replace the user's launcher.
No visible launch is performed while Alex is away.

The 26-second recording loops through work, possible and confirmed concern,
acknowledgement without resolution, explicit user closure and source expiry.
The host keeps its existing drag, native corner resize, display-sizing,
stay-above and retained-rendering paths. Actual native behaviour/appearance
still need platform checks with this mode; headless tests do not prove them.

## Boundary and fidelity

The existing synthetic Node host performs complete schema validation, state
acceptance and presentation. Both browser playback and recording generation
share `createAcceptedDemoTrace()`; no HTML parsing, script evaluation or parallel
fake reducer is used. Godot reads the resulting scene tape, not producer input.
The reader's structural checks protect this development scene format; they are
not a replacement for the existing producer/user JSON Schema validator.

Each record includes the reference scene and an independently generated
reduced-motion scene. The engine retains the current record plus look-ahead
rather than loading the whole tape. It rejects malformed/unordered/incomplete
recordings, incompatible layout and known-state scenes paired with unknown
semantics. Failure does not fall back to a reassuring quiet scene.

The full local artifact has 312 frames at the candidate's 12 Hz sampling rate,
including 1,170 reference lights and nine glows. It is approximately 101 MiB
on disk. This is a **temporary fidelity-test bridge**, deliberately not a
production transport or efficient storage format. It is ignored by Git and
must not be streamed over MQTT or used as the ESP32 payload. A future live
bridge/device uses the separately reviewed compact view/presentation contract.
No native frame-rate, memory benchmark or desktop pixel equivalence is claimed.

## Fixture correction found by this integration

The earlier preview labelled its final frame “source expired”, but later
snapshots had renewed the 22-second lease past that frame. The new Godot test
checked the accepted state and failed: that frame was not actually unknown.
The synthetic lease is now 14 seconds, so the last snapshot at 8 seconds expires
at 22 seconds, before the final frame at 22.5 seconds. Observation TTL remains
22 seconds. These are demonstration policies, not API defaults.

This corrects the fixture's meaning, not the chosen face design. The core,
embedded facade, presentation and Canvas renderer remain unchanged. Browser
and recording tests now assert actual expired/unknown state rather than merely
checking the label. The preview builder was also separated from its trace
factory to avoid concurrent tests overwriting the same generated HTML; its
HTML was byte-identical before/after that extraction with the corrected fixture.

## Evidence limits

Node regressions cover canonical scenes, independent reduced-motion frames,
JSONL structure/count/order and actual expiry. The verified local Godot engine
checks the sample and full tape headlessly, including replay, semantic transitions,
truncation, contradictory unknown scenes and structural rejection. The study
script is also compiled headlessly. Inspect the exact candidate/results in the
PR; no independent review, native screenshot or actual-desktop acceptance is
implied. No visible engine/overlay window or installed display was changed.

Assisted-by: Briar
