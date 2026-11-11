# Embedded API and synthetic face preview

[Wiki home](Home.md) · [Local review](Alex-Local-Review.md)

Alex selected an embedded library as the first integration. This candidate
connects the existing state handler to a separate presentation adapter and the
unchanged clustered-light renderer. It does not connect to the live harness or
replace the installed desktop display.

## Accepted baseline — 11 November 2026

After viewing the recorded preview, Alex said: “I like this work very much
K+++++ - lock this in we can build on this”. This records acceptance of the
shown visual prototype as the basis for further iterations, not a request to
replace it with a different visual direction.

The baseline is the synthetic API-to-face implementation at
`3748f9303e8a34b317ce2c8a76f46e5d7584305f`; `0031bf1` only corrects the
review documentation. Preserve the clustered-light face, wandering motion,
quiet default presence and bounded attention cues as we build on this work.
Keep work, concern, acknowledgement, resolution and unknown source state
distinct. Future changes should make their differences from this baseline
clear and remain supportive and unobtrusive.

This is visual-direction approval of the preview, not a recorded independent
code review, exhaustive usability/accessibility acceptance, merge or deployment
approval. The installed desktop display remains unchanged. Keep the portable
state/presentation boundary separate from platform hosts for future work.

## Try the recorded demonstration

From `implementation/`, run `node scripts/embedded-preview.mjs`, then open
`test-artifacts/embedded-api-preview.html` in a browser. No server or local
dependency installation is needed; generation uses the existing Python
JSON Schema oracle. Playback is self-contained and uses no network requests.

The 26-second loop shows accepted synthetic work, a provisional serious concern,
confirmed impact, acknowledgement, explicit user resolution and an expired
source. Blue, amber and rose distinguish these meanings. Stronger motion and
colour are brief; acknowledgement leaves an unresolved concern visible. An
expired source is unknown, not healthy idle. Click the face to pause. Browser
reduced-motion preference is respected. The shown browser prototype is accepted
as a visual baseline; broader usability, accessibility and desktop/VR/device
acceptance still need their own checks.

## Library boundary

`implementation/api/embedded.mjs` exports `createEmbeddedPresence`. The host
supplies user/workspace scope, a complete schema validator, explicit time policy
and presentation policy. Admitted producer ports submit snapshots; the bound
user port reads accepted state, focuses work, acknowledges a concern, explicitly
resolves a user-raised concern and requests a presented frame with preferences.

`presentation.mjs` preserves inspectable work/concern/request IDs, focus,
uncertainty and stale/omitted facts. Nine groups currently map onto the reference
renderer’s 1,170 lights; collisions do not discard semantic records. This layout
is an explicit reference-adapter restriction, not a portable scene standard.

Capabilities deliberately report synthetic-only, no live authentication,
persistence, subscriptions or cross-display delivery. Trusted host binding is
not authentication. No network transport is implemented. Python validation runs
only in the synthetic Node host, never in the pure core or browser playback.

## Evidence and remaining gates

Local integrated result, 11 November: **73 tests pass, zero fail/skip/cancel**
with the existing real Canvas and Python JSON Schema environments. The reduced
test log is kept locally at `implementation/test-artifacts/embedded-full-tests.log`.

The eleven semantic scenarios run through the facade, real schema oracle,
accepted state, projection and renderer. Additional regressions cover atomic
rejection, scope, exact acknowledgement, bounded/replay-safe cues, reduced
motion, brightness, inspectable collisions and recorded playback/pause/replay.
Canvas checks exercise actual pixels; playback tests use a simulated DOM, not
an actual browser acceptance test.

The isolated development workflow is `.github/workflows/offline-tests.yml`.
Its existence is not proof of a successful GitHub run. Alex’s independent local
review and genuine CI results remain separate delivery gates. No merge,
deployment or issue acceptance is claimed here.
