# Desktop feasibility build

See [the desktop and portability architecture](ARCHITECTURE.md). A local Electron
feasibility app now exists; Electron is not yet an accepted production dependency.
There is no live harness integration. The browser v6 prototype remains preserved.

The source is split into `core/presence.mjs` (seeded, platform-independent scene
generation), `renderers/canvas.mjs`, `inputs/demo.mjs` and `desktop/` (the native
host and its controls). The scene uses normalised coordinates and RGB/opacity
values. Other surfaces can consume the scene or provide a different renderer;
no hardware or VR adapter has been implemented.

The intended first product is a quiet, glanceable laptop display. Shared meaning
should be portable to possible desk-device and VR surfaces and other headless
harness users. This is a design constraint, not an instruction to create a
cross-platform framework now.

Before live integration: agree the laptop behaviour; specify
observable event sources, freshness/disconnection handling, privacy, per-user
scope and accessible navigation. No state or light can grant execution authority.

## Launch and controls

Search the application launcher for **Briar Presence (preview)**, or run
`/home/ajlennon/.local/bin/briar-presence`. At rest, only the lights and their
soft rounded backing are shown. Click the image to open a separate, light-toned,
non-modal display-settings window. While it is open, the image becomes a native
drag region: drag Briar directly to move the face window. **Done**, Escape or the
settings window's ordinary close control returns to quiet click mode. **Quit
Briar** exits. Relaunching an existing instance opens settings; no tray icon or
global shortcut is required. Actual pointer dragging and compositor placement
still need a human check.

The background is transparent and the window is frameless. Transparent pixels
do not imply click-through: click-through is deliberately off. No auto-start,
compositor change, forced display backend or sandbox disabling is used.

Alex asked for a more friendly rounded shape and no black window over the face.
**Soft backdrop** is on by default: a softly feathered, more-rounded translucent
backing distinguishes the area without an oval head outline. It is not a blur of
the applications underneath. The face continues animating while its separate
settings window is open. Side placement is only a compositor hint; the last test
reported overlapping bounds, so non-obscuring placement is not proven. Existing
brightness, size and motion settings are preserved when migrating older
preferences. The desktop Canvas backing size
now follows the displayed size and pixel density rather than oversampling at
720×920; the reference renderer and portable scene are unchanged.

This launcher points to the current checkout and its project-local runtime. It
is **not a standalone package** and will break if the checkout is moved. Packaging
and the final host choice remain open. Display-only settings are saved in
`/home/ajlennon/.config/briar-presence/display.json`.

To remove the preview launcher, run `npm run remove:preview` from this directory.
It moves only unchanged generated launchers into a task-owned recovery folder
and prints that location. Edited or conflicting files are preserved. Source,
dependencies and display preferences are not removed.

### Standalone candidate staging and installation

`node scripts/install-package.mjs --stage PACKAGE_DIRECTORY` copies a verified
candidate into `~/.local/share/briar-presence/releases/SOURCE_DIGEST`, checks the
copy against its manifest and leaves the launcher alone. An existing release is
reused only if its full contents match. No Node/npm or checkout is needed to run
the copied `briar-presence` executable.

After native interaction and toolkit acceptance,
`node scripts/install-package.mjs --install PACKAGE_DIRECTORY` switches only
unchanged managed launchers. Exact previous launchers and their receipt are
copied into the printed recovery directory. Unrelated/edited launchers and
symlink paths are refused. No running app is stopped by the installer.

`node scripts/install-package.mjs --remove` moves unchanged standalone launchers
and their receipt to recovery. Releases and display preferences remain; removal
does not silently reactivate an earlier preview. The installer currently requires
Node and the checkout; the installed application itself does not. Recovery files
are retained. `node scripts/install-package.mjs --rollback` restores the previous
generated launchers and their receipt, or returns to no launcher after a first
installation. It checks the recovery inventory before changing anything and
refuses missing or edited backups. The outgoing launchers are also kept in
recovery. It does not stop or relaunch applications.

Candidate `334edbb305440da7` has been staged and smoke-tested from its user-level
release directory. The default launcher has deliberately not been switched:
real pointer dragging, visual placement and toolkit/resource acceptance remain
unproven. Installation conflict/recovery behaviour is covered by local fixture
tests, not a claim of completed end-user installation.

### Godot and other renderers

Godot is now an explicit support target, with the proposed route in
[design/GODOT.md](../design/GODOT.md). A pinned project-local Godot 4.7.2 engine
now starts headlessly and runs a separate synthetic renderer study.
Generate offline shared reference scenes with
`node scripts/export-reference-scenes.mjs`; the command prints the output path,
SHA-256 and sample count without dumping light data. The current export contains
21 synthetic samples, source identity and ordered seed/input cases. It leaves
the application, default launcher and accepted animation unchanged. The two
reference-export tests pass. The headless Godot `godot/reference_test.gd` also
imports all 21 scenes (24,570 lights) and validates source identity, seed bounds,
colour and coordinate conversion. Report: `test-artifacts/godot-reference-import.json`.
Separate tests now compare `godot/presence.gd` with all 21 reference samples:
173,565 numeric values pass with maximum difference about `2.93e-12`, and exact
colours. See `test-artifacts/godot-conformance.json`.

The separate `godot/study.tscn` renderer study passed its finite native rendering
test (34 frames, transparent corner); app-only output is in
`test-artifacts/godot-study.png` and `godot-study.json`. It selected X11 on this
GNOME/Wayland session. Native Wayland, actual dragging, focus continuity,
resources and full controls remain unverified. The study has exited, not replaced
the existing preview. These checks do not establish host or visual acceptance.
`node scripts/setup-godot.mjs` verifies/reuses the pinned engine without launching
it. Keep engine runtime XDG config/cache/data under `.tools/runtime/` when testing,
not in global Godot settings. No default launcher switch has occurred.

## Checks and current limits — 10 November 2026

- Seeded core, state/colour/static-mode/input-boundary checks pass. All 28
  sampled Canvas frames match the v6 reference exactly, with zero changed
  channels in the bundled offline Canvas implementation. This is not cross-GPU
  pixel identity or human acceptance.
- Native Electron 45.2.3 test on this GNOME/Wayland session passes: renderer
  reports sandboxing and context isolation, Node globals are absent, app-owned
  pixels change, corners carry zero alpha, and recovery controls open. The final
  run advanced from 18 to 41 rendered frames over the two-second test interval.
- A local render timer replaces requestAnimationFrame in the desktop host after
  the first unfocused test delivered sparse frames. Waiting, unknown, reduced
  motion and hidden/minimised window states stop scheduling animation. Unfocused
  interactive behaviour after this pacing change still needs a human check.
- Window-manager API reports stay-above true when requested; actual stacking,
  native drag, focus behaviour, transparency over other applications, keyboard
  comfort and monitor/scaling changes remain unverified by a person.
- Electron emitted a Wayland/Vulkan warning but completed the test. No suggested
  backend or security workaround was applied.
- Final native-test snapshot: four processes, summed working sets 654340 KiB
  (about 639 MiB). This includes shared pages and test/startup activity and is
  not unique physical memory, an idle-memory result or accepted resource use.
  The downloaded Electron runtime occupies approximately 275 MiB on disk.
  Resource assessment may favour Tauri or a platform-specific shell.
- `npm audit` reported no known vulnerabilities in the locked 13-package
  development dependency tree at this check. Required release notices and the
  broader Chromium/runtime supply chain still need release review.
- Launcher install/recovery/conflict tests and narrow-bridge source checks pass.
  Static source checks alone do not prove runtime enforcement of every denial.

Reproduce core/reference checks with `BRIAR_CANVAS_MODULE` pointing to the existing
bundled `@napi-rs/canvas`, then `npm test`. Without that module the reference-image
test is explicitly skipped. Run `npm run test:desktop` for a finite native test;
it uses an isolated `.test-profile/`, captures only its own synthetic window,
writes `test-artifacts/desktop-smoke.json` and `.png`, and exits.

## Current continuation point

The [project wiki](../wiki/Home.md) is the entry point for agreed design,
portrait-reference requirements and a compact progress summary. Portrait-based
face geometry is recorded as a requirement, not yet implemented. All current
visual states remain synthetic. The latest native test passes separate gentle
settings, image drag-mode activation, continuing face animation, sandboxing,
isolation and returning to quiet mode. These checks do not replace actual pointer
interaction, compositor positioning or human visual acceptance.

Next: Alex tries the native window, especially drag, switching to another app,
stay-above and access to controls. Then measure representative resource use and
choose the host before producing a standalone local package and reviewable PR.
Do not mark the desktop goal achieved on these partial checks. No implementation
commit or PR update has been published yet; baseline PR #1 is unchanged.

The updated standalone Linux candidate was built with Electron Packager 20.3.0:
`dist/334edbb305440da7/BriarPresence-linux-x64`. It includes the contrast correction
and separate settings. Its finite native smoke test passes with sandboxing,
hidden resting controls and continued animation while unfocused; evidence is in
`test-artifacts/packaged-334edbb305440da7/test-artifacts/desktop-smoke.json`.
It has not been installed; the launcher still uses the development checkout.
Build caching now includes the packaging scripts as well as app source and lock.
The development dependency tree pins glob 14.0.4 and minimatch 11.0.5; the updated
lock audits with zero known vulnerabilities. All 13 local tests pass, including
28 unchanged reference frames. Review and human native-window acceptance remain
open. A 3-second current-preview process-tree sample measured 353.7 MiB
proportional memory and 13% of one core across six processes; this is not an
idle/battery acceptance result. Evidence is in `test-artifacts/resource-sample.json`;
the finite helper is `node scripts/measure-preview.mjs EXACT_PREVIEW_PID`.
Host choice remains provisional: this is a substantial footprint for a quiet
desktop presence, not evidence that Electron is lightweight enough.

Alex's proposed faster/more-coloured attention levels and red transitions are
investigated in [design/ATTENTION.md](../design/ATTENTION.md). They are not live
alerts or an accepted final mapping. Do not silently turn that research into
automatic escalation.

Local study approvals are private operational records, not project features or
permissions granted to other users. No public source licence grants access to
the original development laptop, harness, credentials or live work information.
