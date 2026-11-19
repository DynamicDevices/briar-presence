# Platform capabilities and review

[Wiki home](Home.md) · [Current progress](Progress.md) · [API direction](API.md)

Reviewed 10 November 2026. Distinguish upstream capabilities, actual prototype
evidence and untested proposals. A desktop host, a renderer, an XR runtime and
a source of work information are different layers—not interchangeable platforms.

## Use each surface well

| Target | Useful capabilities | Design use | Important limit |
| --- | --- | --- | --- |
| Laptop desktop | Pointer, keyboard, readable explanations, native windows | Quiet face at rest; deliberate access to concerns and settings; native movement | GNOME/Wayland controls positioning, focus and stacking; do not depend on an always-above overlay |
| Godot | Native 2D/3D scenes, shaders, instanced drawing, XR integration | Reusable light scene; subtle depth; local animation independent of the input producer | New host and accessibility work needed; lower resource use is not yet demonstrated |
| Browser | Easy access, Canvas/WebGL, semantic HTML, reduced-motion preferences | Shared design review, demonstration and a companion view | Hidden/background pages may throttle or pause; browser window management is not a dependable desktop-overlay API |
| Desk device | Peripheral visibility and possible physical controls | Legible grouped lights, room-appropriate dimming, deliberate acknowledgement | Hardware is not selected; resolution, colour, power, sensing and input capabilities are unknown |
| VR | Spatial placement, depth, controller input and optional hand interaction | Place Briar comfortably beside the work; reveal detail deliberately | Headset/runtime not selected; presence inside our own application is different from an overlay over unrelated applications |

The Briar headless harness is one possible **producer of information**, not a
required rendering platform. The planned API should also support other producers.

## Desktop host comparison

- **Electron:** strongest current reference for JavaScript/Canvas reuse and
  semantic HTML controls. The renderer reports sandboxing and context isolation;
  animation continued while unfocused. A three-second sample used 353.7 MiB
  proportional memory and 13% of one core across six processes. This is not an
  idle/battery benchmark. Actual pointer dragging, comfortable placement and
  visual stacking remain unverified. Keep the narrow host bridge and local assets.
- **Godot 4.7.2:** the behaviour port passes 21 sampled scenes and a finite
  native renderer study draws the lights and transparent corners. The engine
  selected X11 under the existing Wayland session: this is XWayland evidence,
  not native Wayland proof. Full settings, focus continuity, accessibility,
  reduced-motion UI and resource use remain untested. See [the study](../design/GODOT.md).
- **Tauri / GTK-WebKit:** assessed alternatives, not selected targets. They
  could reuse the JavaScript renderer and system webview. Available GTK/WebKit
  runtimes are not the same as installed build prerequisites. Neither has a
  measured prototype footprint; a system webview does not guarantee low total
  process/GPU cost. Do not build another shell without a concrete reason.

Godot documents transparency and native dragging on Wayland, subject to runtime
capabilities. Its always-on-top flag is documented for Linux X11, macOS and
Windows, not Wayland. Electron also documents limits on programmatic placement
and focus. A lack of supported stacking must lead to a usable reopen/move route,
not repeated focus stealing, compositor changes or an assumed workaround.

## Capability-specific presentation

**Depth and particles:** Godot can use shaders/instancing if profiling justifies
them. Preserve independent motion and occasional face formation; do not add
depth merely because the renderer supports it. Canvas remains a reference, not
a requirement that every renderer produce identical pixels.

**Accessibility:** colours are not the only signal. Provide text, keyboard
interaction and reduced-motion alternatives. Godot has accessibility properties
and screen-reader capability APIs, but a Node2D drawing does not provide useful
semantics automatically. Test actual assistive technology, not just API presence.

**Backing and translucency:** distinguish the face without relying on a
platform-specific live desktop blur. A friendly soft backing is the fallback.
Do not promise click-through from transparent pixels.

**VR comfort:** render at the headset/runtime cadence even when the expression
changes slowly; do not transfer the desktop 12-FPS cap into XR. Prefer a stable,
comfortable position over a face-following HUD, abrupt approach or flashing.
OpenXR is the proposed native interoperability route; WebXR is a possible browser
route with limited browser/device availability. Neither runtime is selected.

**Physical displays:** reduce detail to meaningful groupings rather than trying
to reproduce 1,170 points on every device. Keep concern meaning consistent and
provide a route to readable details elsewhere. Physical acknowledgement must
not imply that a problem was resolved. Sound, vibration or proximity sensing are
possible hardware choices, not adopted features or permission to collect data.

## Shared meaning, different presentations

Keep work state, need for attention, work identity and information freshness
separate. A desk light may indicate a concern; a laptop can explain it; a VR
view may associate it with a work surface. Unknown/disconnected information must
not look like verified healthy idle. Each host must provide quiet/stillness,
brightness and a reliable exit, appropriate to that surface.

## Recommended next evidence

1. Measure Godot's actual process-tree cost for the renderer study; compare
   qualifications as well as numbers. No claim that it is lighter yet.
2. Test native interaction, full gentle controls, unfocused animation and
   accessibility on the laptop before choosing the default host.
3. Keep hardware and XR choices open until specific devices/runtime and their
   comfort, performance and privacy requirements are agreed.

This recommendation is not an accepted host switch. No live integration,
hardware, XR implementation or monitoring was performed during this review.

## Sources

- [Electron BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window).
- [Godot DisplayServer](https://docs.godotengine.org/en/stable/classes/class_displayserver.html), with relevant flags checked against the pinned 4.7.2 source.
- [Godot Control accessibility](https://docs.godotengine.org/en/stable/classes/class_control.html).
- [Godot OpenXR settings](https://docs.godotengine.org/en/stable/tutorials/xr/openxr_settings.html).
- [Browser animation behaviour](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame).
- [WebXR availability](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API).
- [Tauri process model](https://v2.tauri.app/concept/process-model/) and [build prerequisites](https://v2.tauri.app/start/prerequisites/).

Assisted-by: Briar
