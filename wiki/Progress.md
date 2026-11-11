# Current progress and trying the preview

[Wiki home](Home.md)

## Where the work stands

11 November native resize result: Alex reports “that worked” with the face
preview running through native Wayland, with transparency restored. X11 face and
plain-window comparisons both flashed. The opt-in launch command, centred Briar
name, upstream issue and limits are recorded in [Native Wayland resizing](Godot-Wayland-Resize.md).
The installed app remains unchanged. Alex subsequently selected preferring
native Wayland when its socket is available, with an X11 resize warning when
not; explicit backend options remain. Other native interaction
checks and independent review are still open; earlier evidence below identifies
its original candidate/backend rather than superseding this observation.

Follow-up: native Wayland stay-above and dialog-size checks failed. Alex selected
standard logical dialog sizing on Wayland; the revised sizing passes policy and
headless checks, but its native question timed out and readability remains open.
Godot does not document its always-on-top flag as implemented on Wayland. These
limits prevent a complete replacement/installation acceptance claim.

Separate cross-build repair: signed build source
`46e8f26dce156e98e3ce0c07084c11e2433fe969` in
[PR #13](https://github.com/DynamicDevices/briar-presence/pull/13) passed
[DD-runner CI43036127144](https://github.com/DynamicDevices/briar-presence/actions/runs/43036127144).
Linux x64, Windows x64 and macOS universal source-bearing unsigned artifacts and
checksums were uploaded. The macOS mismatch was a generated application name;
only staged project naming changed, not strict archive validation. This build
branch is separate from PR #14: its packages do not include the latest desktop
menu/backend/dialog changes. Native Windows/macOS testing and independent review
are still open. A cross-export is not a native platform acceptance test.

An [opt-in API-recording adapter for the Godot candidate](Godot-API-Recording.md)
now exists. It uses canonical accepted scenes and leaves the default/installed
display alone. Its expiry regression exposed and corrected a synthetic demo
lease error; actual native display acceptance remains outstanding.

Transport/device work is split into [MQTT #11](https://github.com/DynamicDevices/briar-presence/issues/11)
and [LVGL/ESP32 subscriber #12](https://github.com/DynamicDevices/briar-presence/issues/12).
Both belong to API parent #3; the device's agreed view contract depends on MQTT.
These are tracked implementation targets, not installed broker/device support.

Overnight next-step candidate: [the six-step plan](Baseline-Next-Steps.md) now
links a separate work-inspection mock-up, proposed harness event mapping and
executable synthetic producer/API examples. These do not connect live data or
replace the accepted face/installed display. Inspection design and independent
code review still need Alex's verdict.

11 November visual acceptance: Alex asked to lock in the shown synthetic
preview as the baseline to build on. [The recorded decision](Embedded-API-Preview.md#accepted-baseline--11-november-2026)
identifies the source and preserves the quiet clustered-light direction.
This is not a substitute for independent code review or approval to deploy.

11 November implementation update: the [embedded synthetic API-to-face
candidate](Embedded-API-Preview.md) now exists, with a recorded looping preview
and an isolated development CI workflow. The planning notes below describe the
earlier design stages. The installed display remains unchanged; local review,
genuine CI and visual acceptance are not implied by implementation.

API planning update, 10 November 2026: Alex approved the comprehensive
[visual-language API review](Visual-Language-API.md). [Parent issue #3](https://github.com/DynamicDevices/briar-presence/issues/3)
and seven sub-issues (#4–#10) track vocabulary, contract/reliability, aggregation,
safeguards, extensions, offline validation and the separately scoped first
integration. This records direction and future work, not an implemented API or
deployment approval. No runtime or installed launcher changed.

Next-step work: [issue #4's vocabulary/scenarios](Visual-Language-Vocabulary.md)
now records Alex's selected design decisions and 21 synthetic acceptance
scenarios. Human readability checks and unselected semantics remain open.
[Issue #5's input-contract draft](API-Contract-Draft.md) proposes records,
snapshot ordering, session fencing, freshness and interaction boundaries. Alex
selected retaining omitted open concerns while accepting otherwise valid changes,
with separate freshness/warnings, and renewed attention for an acknowledged
concern's changed impact/response need. Fields and technical details still need
review. Severity is selected as minor/significant/critical; attention is For
awareness/Needs you/Time-sensitive. New time-sensitive requests and significant/
critical concerns get the brief stronger cue by default, within user preferences;
ordinary requests and minor concerns get a quieter indication. These are design
choices, not implemented grading or animations. A first [static schema/fixture
draft](../design/api/0.1-draft/README.md) now covers producer snapshots and separate
focus/acknowledgement. It includes shape checks and separately described semantic
scenarios. An isolated offline reducer now exercises them; there is still no
listener or live integration.

Latest example review selects a fresh cue for confirmed previously provisional
critical impact, explicit user closure of user-raised concerns, and shared
real-time focus/acknowledgement. Rejoining displays take current accepted state,
not replay superseded choices. Eleven semantic scenarios now specify these
requirements and now execute against the [offline state handler](../implementation/core/STATE.md).
The full local suite now passes 49/49 tests, including those eleven scenarios and
all 21 positive/negative schema fixtures. Trusted identities are synthetic;
there is no live authentication, display sync or renderer integration. Independent
review and CI remain open; issues #3, #5 and #9 now link the offline evidence. The renderer and launcher
are unchanged by this work.

Alex initially selected Preloop + test CI, then directed **local review because
of Preloop problems**. The [review plan](Review-and-CI-Plan.md) records that change;
Preloop setup is deferred. [Local self-review](Local-State-Review.md) found and
fixed four transition defects with failing regressions before repair. No new
reviewer, workflow or publication permission has been enabled. Self-review is
not independent approval, and local tests do not satisfy the separate CI gate.

Alex selected performing the independent review locally. The
[review package](Alex-Local-Review.md) supplies scope, reading order, checks and
result fields without filling in Alex's verdict. The
[inactive test CI draft](../design/api/0.1-draft/CI-Readiness.md) records the
no-secret job design and missing activation evidence; no workflow is enabled.

Following Alex's request to continue overnight using sensible assumptions,
[embedded-first is the working proposal](../design/api/0.1-draft/EMBEDDED-PROPOSAL.md),
not a settled transport or live endpoint. A
[concrete inactive CI candidate](../design/api/0.1-draft/ci/README.md) now includes
pinned Node24 actions, integrity/hash-locked test dependencies and explicit
failure instead of skipped Canvas checks. YAML, shell syntax, dependency closure
and present/missing-Canvas preflight checks pass locally. No package was installed,
workflow enabled, listener opened or runtime adapter implemented.
The candidate's exact Node/TAP test command also passes locally: 49 tests,
zero skipped/cancelled, about 18.46 seconds. This reuses the existing installed
test dependencies; it does not establish clean-runner installation or a real
Actions result. Questions are queued for Alex's return rather than blocking
reversible proposal work overnight.

| Area | Current evidence | Still open |
| --- | --- | --- |
| Portable light behaviour | Separate seeded scene generator, Canvas renderer, synthetic-state input and desktop host | Future adapters and wider platform tests |
| Godot input validation | 81 runtime boundary checks pass; invalid seeds/samples return an empty scene and explicit `validation_error`, without changing valid subsequent samples | Future hosts must show invalid/missing input explicitly, not treat an empty scene as healthy; no API listener or live producer exists |
| Existing light appearance | 28 sampled offline frames match the earlier accepted v6 preview exactly | New portrait-derived face formation needs its own study |
| Godot target | Alex selected “Take Godot forward” in the desktop host decision; pinned project-local Godot 4.7.2 passes 21 behaviour reference scenes and native renderer/control studies | Candidate development, not final host/install acceptance. Engine selected X11/XWayland, not native Wayland; real pointer interaction, footprint, accessibility and visual acceptance remain open; current launcher unchanged |
| Native desktop preview | Local Electron candidate runs on GNOME/Wayland with sandboxing and context isolation reported by its renderer | Electron is not the accepted final toolkit |
| Quiet view and soft backing | Only the image is visible at rest; backing is more rounded and softly feathered | Human review of comfort and legibility |
| Gentle settings | Separate pale, non-modal settings window; the face keeps rendering | Compositor may ignore the requested side placement; reported bounds overlap, so non-obscuring placement is not proven |
| Moving Briar | Clicking the image enables its native drag region while settings are open; closing settings restores click mode | Real pointer dragging and keyboard/window-manager comfort need Alex's check |
| Corner resizing | Godot study now routes corner presses to native resize, with cursor-only hover and aspect-preserving content; four layout/edge policy tests pass | Actual pointer/compositor resizing needs checking. Electron documents transparent windows as non-resizable, so the existing overlay has not been changed or given a fake resize control |
| Attention | Research and alternatives documented | No graded attention rates or cycling red alert have been adopted or implemented |
| Packaging | Updated standalone Linux candidate `334edbb305440da7` is staged under the user-level releases directory; packaged and staged native smoke tests pass; installer conflict/recovery and verified rollback tests pass | Default launcher switch, review and human desktop acceptance remain open |
| Godot standalone candidate | Local bundle `godot-0810e6a3f0bd915b` runs from `/tmp` without Node/npm or the checkout at runtime; byte manifest verifies unchanged after running | Not installed or publicly released. Full standard engine, about 140 MiB on disk; review and desktop/visual acceptance remain open. Existing installer is Electron-specific |
| Resource use | One 3-second current-preview sample: 353.7 MiB proportional memory and 13% of one core across six app processes | Not an idle/battery result or accepted footprint; Electron remains provisional |
| Development dependencies | Electron/Packager are pinned; patched glob/minimatch overrides; latest npm audit reports zero known vulnerabilities | An audit is not a complete security review or release gate |

These are partial checks, not production readiness, accessibility certification,
cross-platform acceptance or proof that all desktop compositors honour the API.
There is no live harness connection, telemetry, auto-start, screen-wide capture,
microphone/camera access, monitoring service, hardware implementation or VR client.

### Standalone Godot candidate (local, not installed)

Run `node scripts/package-godot.mjs` from `implementation/` with the pinned
engine and matching licence, copyright and author notices already present.
The builder downloads nothing, exports an app-only PCK through Godot's standard
exporter, and bundles the unmodified verified engine, shell launcher, source and
GPL/upstream notices. It builds in a separate workspace and excludes test scripts
from the runtime pack. Existing candidate paths are preserved, not overwritten.

Current local bundle: `implementation/dist/godot-0810e6a3f0bd915b`.
Run its `briar-presence` executable without Node, npm, a server or the checkout.
It still requires Linux x86_64 system graphics/window libraries. This uses the
full standard engine, not a minimal export-template build: 146,681,991
manifest-listed bytes, approximately 140 MiB. The manifest checks inventory,
bytes and executable bits; it is not an authority signature or sandbox.

The bundle ran from `/tmp`, completed 34 light draws / 115 process frames in
3.222 seconds, retained transparent corners, display-relative sizing and the
stay-above request, and exited cleanly. Rendered host/renderer hashes match the
included source. All 34 bundled files verified unchanged after running. Runtime
and smoke output were redirected outside the bundle into project-owned paths.
Native evidence: `implementation/test-artifacts/godot-packaged-0810e6a3f0bd915b/`.
Build receipt: `implementation/test-artifacts/godot-package-build.log`.
The bundle's `PACKAGE-MANIFEST.json` records its source digest.

Normal runs use the user's Briar data directory or `BRIAR_PRESENCE_RUNTIME`;
keep that outside the bundle. No launcher, desktop entry, startup setting or
network service is installed. The current interactive study was not replaced.
Default installation still needs Alex's acceptance and required review and
integration gates. The Electron-specific installer cannot install this format.

### Godot quiet controls (candidate only)

Local follow-up after Alex found resizing better but still wanted it smoother:
resize now transforms retained vector circle/texture commands between model
updates instead of reconstructing every light for every window-size event.
Godot forces Node2D draw callbacks during resizing, so the retained commands use
a separately owned child canvas item, freed when the renderer is destroyed.
Normal model updates rebuild at the actual new dimensions; this is not a scaled
screenshot. The isolated 16-step native test recorded zero vector-command
rebuilds, kept current geometry/backing coverage and verified native-size reset
on the next scene update. The two settled reference captures at 400 × 520 and
960 × 1240 match the original direct drawing API with zero changed channels.
This does not prove every state/time or compositor drag frame identical.
Evidence: `godot-resize-redraw.json`, `godot-retained-appearance.json` and
`godot-retained-appearance.log` under `implementation/test-artifacts/`.
The previously built standalone bundle predates this follow-up; the checkout
preview contains it. Alex responded “good - lock this in - update the skills /
repo / wiki”, accepting this resize direction on 10 November 2026. This does
not establish flash-free behaviour on every compositor or final host/install
acceptance. Empty-scene clearing also passes. The reusable implementation and
verification guidance is in the [project skill](../.agents/skills/briar-presence/SKILL.md).

Latest interaction revision, following Alex's resize-flashing report and dialog
screenshot: presentation is capped at 60 Hz independently of the model's
approximately 12 Hz maximum sampling cadence. Resize events immediately redraw
the existing normalized scene at its new dimensions. A 16-step programmatic
native resize test passed with backing coverage and current light geometry at
every captured frame; this cannot prove the compositor never flashes during a
real pointer drag. Evidence: `implementation/test-artifacts/godot-resize-redraw.json`
and `godot-resize-redraw.log` in the same directory. No backend/session changes
or alternate light layout were introduced.

Settings now scale their text, vector switch artwork, margins and buttons from
the display's usable height, bounded to fit the screen. On this display the
native panel is about 868 × 650 at scale 2.167, rather than 360 × 320. It is
borderless, transparent at its rounded corners, and movable by dragging the
heading. Placement prefers a non-overlapping side and is clamped to the display.
Focused check-button text stays dark; the screenshot's disappearing label is
corrected. The updated native controls test passes with a clean engine log and
a fresh app-only panel capture. X11 rejected an independently stay-above child
that was also transient; the child now follows its parent without that redundant
flag. Actual window placement and human corner-drag smoothness still need checking.

Alex subsequently requested stay-on-top and better fidelity when enlarged.
The Godot candidate now defaults to stay-above, while retaining the toggle.
The native controls test passes for the default and both toggle directions;
actual compositor stacking remains a human check. The previous study had
already closed when checked; the updated interactive candidate was then opened
and reached its first draw with `alwaysOnTop: true`. The Electron launcher was
not changed.

The resize diagnostic showed that the framebuffer already followed window
size, but the glow texture stayed fixed at 128 × 128. The renderer now grows
that texture in powers of two to cover the largest glow extent and reuses it
on shrink. Native-size rendering is explicit; the original vector circles,
scene layout and animation are unchanged. Native tests pass at 400 × 520 and
960 × 1240 with matching framebuffer sizes and sufficiently resolved glow
textures (256 × 512 and 512 × 1024 in this run). This verifies resource sizing,
not subjective image quality or physical-pixel scaling by XWayland/compositor.
Evidence: `implementation/test-artifacts/godot-resize-fidelity.json`,
`godot-fidelity-native.log` and `godot-fidelity-400.png` / `godot-fidelity-960.png`
in the same directory. The enlarged result still needs Alex's visual check.

Following Alex's feedback that the fixed study was too small, initial sizing now
uses 30% of the current display's usable height. On the tested 3606 × 2340 usable
display, the native study opened at 554 × 702, with a roughly 537 × 686 face,
rather than the old 196 × 246 window. The face and rounded backing keep their
proportions. Runtime display-area changes trigger resizing, preserving the
user's manually chosen relative face height and keeping the window in bounds.
There is no extra size control and no second DPI multiplier. These are
session-only adjustments, not saved preferences.

The pure sizing policy passes six display cases, including high-resolution,
portrait, small screens and negative monitor coordinates. The native smoke
passed 38 frames with a transparent corner on the actual reported display.
Actual movement between monitors and perceived physical size remain human
checks. Evidence: `implementation/godot/display_sizing_test.gd`,
`implementation/test-artifacts/godot-display-sizing.log` and
`implementation/test-artifacts/godot-display-native.log`.

To launch the updated candidate without changing the installed default, run
`npm run start:godot` from the repository's `implementation/` directory. The
project-local pinned engine must already be present; this command does not
download dependencies or install anything. The launcher verifies the exact
executable SHA-256 and confines Godot's XDG runtime directories to `.tools/`.
This is file placement, not an application sandbox.
`node scripts/launch-godot.mjs --check` verifies without launching;
`npm run test:godot-desktop` runs the finite
native smoke with a 15-second cutoff. Unsupported arguments and a changed or
linked engine executable are rejected. Normal interactive launches run until
the user quits; they do not create a monitoring service.

The candidate launcher passes two focused tests (argument/environment mapping
and rejection of a changed/linked engine). Its native smoke completed 39 frames
in 3.083 wall-clock seconds with transparent corners and a clean engine log.
The study now supplies monotonic elapsed time to the model instead of summing
Godot's clamped frame deltas; animation time at capture was 3.048 seconds.
This corrects timeline slowdown under delayed frames, not frame scheduling or
overall CPU use. Evidence: `implementation/test-artifacts/godot-launch-native.log`
and `godot-study.json` in the same directory.

Alex chose **Take Godot forward** in this chat's desktop decision dialog. The
choice directs candidate development, not a default-launcher switch. The
original circle renderer remains in use; the altered batched rendering is not
adopted.

The updated study has no controls at rest. A click opens a separate pale,
non-modal settings window; a drag beyond six pixels requests native movement.
Corner presses still request native resizing directly, with no grip or button.
Settings provide reduced motion, optional stay-above, Done and Quit Briar.
F1 opens settings; M toggles reduced motion; T toggles stay-above. Escape hides
settings when they have focus, or quits from the face; Ctrl+Q quits from either.
These are window-local shortcuts, not global desktop bindings. Preferences are
session-only in this study.

The finite native controls test passed: settings are a separate non-embedded
window; the first control has keyboard focus; the face lost native focus while
its frame counter advanced from 2 to 13; reduced-motion light data stayed
identical after the setting was applied; stay-above could be requested and
restored; Escape hid settings without closing the face; the quit signal fired.
Reduced motion now updates the scene immediately, rather than leaving the
preceding moving scene until the next process callback. The test calls control
signals/keyboard handlers programmatically: it does not prove real mouse
dragging, OS key routing, compositor stacking or screen-reader usability.
Side placement is a request, not a guarantee that no compositor will overlap
the settings and face. The previously opened interactive study was not replaced
by this finite test, and the installed launcher remains unchanged.

Evidence: `implementation/godot/controls_test.gd`,
`implementation/test-artifacts/godot-controls-study.json`,
`godot-controls-native.log` and `godot-settings-study.png` in the same directory.

### Godot input boundary

The behaviour port now validates seeds at runtime rather than using a debug-only
assertion. Non-numeric, fractional, non-finite and out-of-range seeds cannot
generate a scene. Samples reject non-dictionaries, missing fields, invalid time,
unknown states and non-boolean reduced-motion values. Rejections return `{}`
with a non-empty `validation_error`; valid samples clear the sample error.
An invalid seed requires a new valid model, not a silent fallback seed. Hosts
must expose invalid data as invalid/unknown, never assume a quiet healthy state.
`godot/validation_test.gd` passes 81 checks, including valid recovery without
state mutation. After this change, all 21 reference samples still pass 173,565
numeric comparisons (maximum error approximately 2.93e-12). Local evidence:
`implementation/test-artifacts/godot-validation.log` and
`implementation/test-artifacts/godot-conformance.log`. These are pure behaviour
checks, not transport security, arbitrary-input resource limits or desktop
acceptance.

### Optional Godot drawing study (local, not the default)

The `--instanced-study` option batches the light circles using MultiMesh and a
circle shader. The normal study still uses the original circle renderer; the
installed Electron launcher is unchanged. The corner-resize preview already open
for Alex was not restarted or replaced.

A finite native X11/XWayland run completed 39 frames in 3.040 wall-clock seconds,
with transparent corners and no errors in the captured engine log. Mean model
sampling was 9.646 ms/frame; renderer preparation was 2.112 ms/frame (including
1.506 ms packing), and glow draw-command generation was 0.029 ms/frame. These
are script timings, not GPU timings, CPU utilisation, battery measurements or a
matched host benchmark. Earlier animation elapsed time is not wall-clock time;
the current smoke report measures both separately.

Packed instance inputs pass the existing seven-state float32 comparison test.
The app-only capture shows clustered lights and the rounded backing, but shader
edge coverage is not proven pixel-equivalent to the original circles. Visual
acceptance, actual corner dragging and total resource use remain open. No host
or visual change has been accepted on the strength of these results.

Local evidence: `implementation/test-artifacts/godot-instanced-study.json`,
`godot-instanced-study.png` and `godot-instanced-native.log` in the same directory.
The report includes renderer, shader, packing and study source hashes. The first
run exposed a missing parent initialisation; that was corrected before this run,
along with cleanup of the unused renderer instance.

The normal circle renderer also passed a native run after adding the optional
selection: 39 frames in 3.092 wall-clock seconds, transparent corners, and a
clean engine log (`godot-circle-native.log`). A native viewport test cannot run
headlessly; the study now rejects that invocation immediately with exit code 2,
rather than waiting for a frame that the headless renderer never produces.

#### Same-frame visual comparison

The finite smoke option `--reference-frame` holds the quiet scene at 17.3 seconds
with the same seed, viewport and host source for each renderer. Both native runs
completed cleanly. The comparison script
`implementation/scripts/compare-godot-reference.mjs` found 4,838 changed pixels
out of 48,216 (196 × 246), mean absolute RGBA channel difference 1.246/255 and
maximum channel difference 129/255. This is one sampled frame, not a tolerance
or approval threshold. The batched lights appear finer and dimmer in these
captures. The original renderer therefore remains the default; batching is not
accepted as an appearance-preserving replacement.

Local evidence: `godot-study-reference.png`,
`godot-instanced-study-reference.png`, their JSON reports and native logs, plus
`godot-reference-comparison.json` and `godot-reference-difference.png`, all under
`implementation/test-artifacts/`. The comparison records both image hashes;
the difference image amplifies RGB differences fourfold. Concurrent captures
are for image comparison, not a matched performance measurement.

Latest integrated check: all 23 JavaScript tests pass, including Godot launcher/manifest checks, reference export,
rollback, preservation and cache invalidation. The standalone app rendered 19 → 44 frames while
unfocused in its finite Wayland test, retained sandboxing, and restored its
quiet view after closing settings. Test evidence is in
`implementation/test-artifacts/packaged-334edbb305440da7/test-artifacts/desktop-smoke.json`.
This does not verify real pointer dragging, stacking or comfortable placement.

## How to try the local preview

Launch **Briar Presence (preview)** from the application launcher, or run
`briar-presence`. Click the image for display settings. While settings are open,
drag the image itself to move the native window. **Done**, Escape or closing the
settings window returns to the quiet view. **Quit Briar** exits the application.

The current launcher still uses the development checkout. It is not the final
standalone installation. If the compositor places settings inconveniently, its
normal title bar can move that separate window; do not claim automatic side
placement has been solved. No tray icon or global input hook is required.


Godot's sampled behaviour conformance and finite rendered study are described in [Godot support](../design/GODOT.md). These are not full desktop-host acceptance.

The staged binary predates the GPL licensing change. It is not a public binary
release. Before distribution, rebuild with project licensing and provide matching
Corresponding Source, build/install instructions and complete third-party notices.

(Briar helped draft this.)
