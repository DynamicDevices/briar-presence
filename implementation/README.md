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

The first standalone Linux candidate was built with Electron Packager 20.3.0,
but predates the quiet-view/backdrop correction and has not been installed.
Rebuild from the corrected source before package smoke testing or installation.
The development dependency tree pins glob 14.0.4 to address the glob/minimatch
advisories found in Packager's initial dependency selection. Verify the changed
lock before accepting the package. A short snapshot after the Canvas correction
measured about 354 MiB proportional memory and 10.5% of one core; this is not an
idle/battery acceptance result. Host choice remains provisional.

Alex's proposed faster/more-coloured attention levels and red transitions are
investigated in [design/ATTENTION.md](../design/ATTENTION.md). They are not live
alerts or an accepted final mapping. Do not silently turn that research into
automatic escalation.

Desktop work is covered only when independently verified against the signed
subject-specific proposal at
`/home/ajlennon/.cursor/config/action-proposals/briar-presence-desktop-20261110.json`
(expiry 11 November 2026, 17:11:36 GMT). This pointer is not authority or proof of
current validity. Existing visual-study approval and signatures remain intact.
