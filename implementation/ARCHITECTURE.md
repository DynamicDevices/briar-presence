# Desktop overlay and portable visual behaviour

Proposed on 10 November 2026 in response to Alex's request to make the current
visual prototype easy to overlay on the desktop while supporting other platforms.
This is an architecture proposal, not acceptance of a toolkit or authorisation
to install packages, launch services or connect the harness. The v6 prototype
remains the visual reference; preserve it during extraction.

## Separate four concerns

1. **Input adapters:** a synthetic demo first; a future read-only harness adapter
   supplies an explicit snapshot of observable work, freshness and concerns.
   User/task scope belongs here. No projects or personal labels in the visual code.
2. **Meaning and visual behaviour:** plain data and pure functions, with no DOM,
   OS, network or harness imports. Interpret attention, work, waiting, concerns,
   urgency and missing information; generate a normalised light scene using a
   clock and random seed supplied by the caller. Do not interpret model activity
   as feelings or measured progress. Random motion never changes reported state.
3. **Renderers:** Canvas first, consuming light positions, radii, colours and
   intensity. Future VR and physical displays can render that scene differently.
   Small LED displays may need a simpler mapping, not a promise of identical art.
4. **Platform hosts:** browser preview, desktop shell and future device/VR hosts.
   Own window placement, transparency, drag, display scaling, visibility,
   interaction and accessible explanations. They do not define what states mean.

Data flow: input snapshot → meaning/animation → light scene → renderer.
Platform host supplies time, preferences and capabilities around that flow.
Keep any future action request separate from status input; clicking a concern
must not grant execution authority. No transcript or private reasoning is needed.

Use a small versioned JSON-compatible contract, validated at the boundary. This
is a custom application model, not a new transport standard. Choose transport
only when the harness integration is actually scoped; do not add a broker or
publish every animation frame over the network. Platforms animate locally.

## Desktop shell recommendation

Start with a disposable **Electron** feasibility prototype using local packaged
assets, not a localhost server. It reuses the current JavaScript/Canvas approach
and supplies a consistent Chromium renderer. Its memory and packaging overhead
are real costs to measure, not assumed acceptable.

**Tauri** is the main alternative: a smaller-bundle approach using system
webviews, with Rust/native tooling and platform-specific rendering differences.
Do not implement two shells. Keep the host adapter narrow enough to change it
if the first shell fails the laptop tests. No dependency/version has been adopted;
pin a supported release and verify provenance, licence obligations, relevant
advisories and update/rollback support before adoption. Electron is MIT-licensed;
Tauri is MIT/Apache-2.0 dual-licensed; distributions and bundled dependencies still
need their own notice/licence checks.

The current session reports **GNOME on Wayland**. Electron documents limits on
programmatic window movement, placement, resizing and focus there. Transparent
pixels also do not automatically pass clicks to the application below. Test
transparency, native drag, staying above ordinary windows and input behaviour on
this actual laptop before promising a desktop overlay. Do not change compositor
security, switch Alex's desktop session or force a display backend as a workaround.
If a compositor-specific adapter is needed, present it as a separate choice.

## First desktop experience

- A transparent, frameless light presence: no oval, badge or opaque rectangle.
- User-controlled native drag and a way to adjust size, brightness and movement.
- An optional stay-above mode, only if supported and demonstrated here; no focus
  stealing, auto-start or all-workspace behaviour by default.
- Deliberate interaction mode for inspecting concerns. Defer click-through until
  a reliable, tested way to recover controls exists; never make the face
  unmanageable. Do not depend only on a tray icon or global shortcut: GNOME may
  not expose them. Retain a normal launch/reopen route that restores controls.
- Respect reduced motion and display scaling. Save only local display preferences
  when persistence is agreed; keep credentials and work content out of them.
- Local trusted assets only. Renderer has no Node access, arbitrary shell bridge,
  remote navigation or broad filesystem access. Use an isolated, narrow validated
  host bridge for necessary display operations. No screen capture, microphone,
  monitoring service or live harness connection in this feasibility step.

## Small iterations and proof

1. Extract the current visual behaviour without changing the look. Check seeded
   replay, independent motion, abstract-face gatherings, static modes and existing
   colour meanings. Keep human visual review separate from automated checks.
2. Prove the desktop window on this laptop with synthetic states: transparency,
   native dragging, optional stay-above, keyboard access, safe recovery and quit.
   Check that it remains animated while another app is focused and pauses when
   appropriate. Measure idle CPU/memory and behaviour across scale/monitor changes;
   record results rather than inventing a resource budget now.
3. Package an easily launched local app after choosing the shell from that proof.
   Keep uninstall/rollback straightforward; do not enable startup automatically.
4. Separately agree the harness adapter: real event sources, explicit work scope,
   missing/stale data, per-user privacy and concern explanations. A connection
   failure must never look like healthy idle blue.

VR, desk hardware and additional users reuse the meaning/scene boundary, but
their integrations are future work, not part of the first desktop build.

## Official references checked

- [Electron BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window)
  — Wayland restrictions and native window controls.
- [Electron custom window styles](https://www.electronjs.org/docs/latest/tutorial/custom-window-styles)
  — transparency/input limitations.
- [Tauri window API](https://v2.tauri.app/reference/javascript/api/namespacewindow/)
  — window, dragging and input-control surface; API presence alone is not proof
  that a compositor supports the desired behaviour.

Status update: a project-local Electron feasibility shell has now been installed
and exercised on the laptop. See [current evidence and limits](README.md). The
toolkit choice and standalone package remain unaccepted; the proposal above is
not a claim of cross-platform or desktop acceptance.
