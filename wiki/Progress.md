# Current progress and trying the preview

[Wiki home](Home.md)

## Where the work stands

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
| Resource use | One 3-second current-preview sample: 353.7 MiB proportional memory and 13% of one core across six app processes | Not an idle/battery result or accepted footprint; Electron remains provisional |
| Development dependencies | Electron/Packager are pinned; patched glob/minimatch overrides; latest npm audit reports zero known vulnerabilities | An audit is not a complete security review or release gate |

These are partial checks, not production readiness, accessibility certification,
cross-platform acceptance or proof that all desktop compositors honour the API.
There is no live harness connection, telemetry, auto-start, screen-wide capture,
microphone/camera access, monitoring service, hardware implementation or VR client.

### Godot quiet controls (candidate only)

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

Latest integrated check: all 20 JavaScript tests pass, including reference export,
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
