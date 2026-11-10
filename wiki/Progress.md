# Current progress and trying the preview

[Wiki home](Home.md)

## Where the work stands

| Area | Current evidence | Still open |
| --- | --- | --- |
| Portable light behaviour | Separate seeded scene generator, Canvas renderer, synthetic-state input and desktop host | Future adapters and wider platform tests |
| Existing light appearance | 28 sampled offline frames match the earlier accepted v6 preview exactly | New portrait-derived face formation needs its own study |
| Godot target | Pinned project-local Godot 4.7.2: all 21 behaviour reference scenes pass; finite renderer study produces clustered lights, rounded backing and transparent corners | Engine selected X11/XWayland, not native Wayland; full controls, focus/dragging, resources and visual acceptance remain open; current launcher unchanged |
| Native desktop preview | Local Electron candidate runs on GNOME/Wayland with sandboxing and context isolation reported by its renderer | Electron is not the accepted final toolkit |
| Quiet view and soft backing | Only the image is visible at rest; backing is more rounded and softly feathered | Human review of comfort and legibility |
| Gentle settings | Separate pale, non-modal settings window; the face keeps rendering | Compositor may ignore the requested side placement; reported bounds overlap, so non-obscuring placement is not proven |
| Moving Briar | Clicking the image enables its native drag region while settings are open; closing settings restores click mode | Real pointer dragging and keyboard/window-manager comfort need Alex's check |
| Attention | Research and alternatives documented | No graded attention rates or cycling red alert have been adopted or implemented |
| Packaging | Updated standalone Linux candidate `334edbb305440da7` is staged under the user-level releases directory; packaged and staged native smoke tests pass; installer conflict/recovery and verified rollback tests pass | Default launcher switch, review and human desktop acceptance remain open |
| Resource use | One 3-second current-preview sample: 353.7 MiB proportional memory and 13% of one core across six app processes | Not an idle/battery result or accepted footprint; Electron remains provisional |
| Development dependencies | Electron/Packager are pinned; patched glob/minimatch overrides; latest npm audit reports zero known vulnerabilities | An audit is not a complete security review or release gate |

These are partial checks, not production readiness, accessibility certification,
cross-platform acceptance or proof that all desktop compositors honour the API.
There is no live harness connection, telemetry, auto-start, screen-wide capture,
microphone/camera access, monitoring service, hardware implementation or VR client.

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
