# Godot support

Alex requested Godot support in this chat on 10 November 2026. This is an explicit
design target, not a claim that a Godot client exists or permission to install an
engine. Preserve the current laptop preview and accepted light behaviour.

## Shared design, separate renderers

Keep input, behaviour, scene and host separate. Canvas and Godot should interpret
the same light scene, rather than independently inventing expressions or states.

The existing `implementation/core/presence.mjs` is the executable reference for
seeded motion and face gatherings. Its scene version 1 already contains:

- `aspect`: width/height (`360/460`), plus `state` and sampled `time`.
- `lights`: normalized `x`, `y`, radius relative to width, RGB colour in 0–255,
  opacity and a halo flag.
- `glows`: normalized centres and x/y radii, RGB colour and opacity.

These are plain serializable data, with no DOM or native-window objects. Preserve
the coordinate and alpha conventions; Godot uses different colour representations.
Do not send every animation frame over a service or introduce a broker for this.
The host should animate locally. Future harness input stays separately scoped.

## Godot implementation route — proposal

1. **Renderer study:** load exported synthetic reference scenes into a Godot 4
   `Node2D`. Draw the small lights and soft glows; check proportions, colour,
   feathering and scaling against the Canvas reference. Start simple; consider
   `MultiMeshInstance2D` for batching only if measurement justifies it. Avoid one
   node per grain. Do not claim Canvas pixel equality across different renderers.
2. **Local animation:** port the existing pure behaviour to GDScript, retaining
   the reference JavaScript implementation. Use shared seed/time/state fixtures
   to test positions, radii, colours, opacity, static states and face gatherings.
   Specify uint32 overflow, random-number calculations and floating-point
   tolerances explicitly; matching a seed alone does not prove matching motion.
   Re-sampling earlier times and long-running sessions must work in both ports.
3. **Godot desktop host study:** use native window dragging, transparent corners,
   the friendly backing, quiet resting view, gentle separate controls and an
   obvious quit/recovery route. Test the real GNOME/Wayland session, continued
   unfocused animation, reduced motion, keyboard access and monitor scaling.
   Cap rendering deliberately; do not run a 60 Hz game loop by default for a
   quiet presence. Measure the complete process and GPU cost before choosing it.
4. **Compare before switching:** compare Godot with the existing Electron
   candidate on visual quality, interaction, resources and packaging. Preserve
   the working launcher until the replacement is accepted. Godot may become a
   renderer used by another application, the desktop host, or both.

Godot's `JavaScriptBridge` exists only in web exports; it is not a way to run
the current JavaScript core in a stock native desktop export. Embedding a JS
runtime or a webview plugin adds dependencies and maintenance; neither is adopted.
A port needs conformance tests to prevent two diverging visual languages.

## Reference scenes available now

Run `node scripts/export-reference-scenes.mjs` from `implementation/`. It writes
`implementation/test-artifacts/reference-scenes-v1.json`: 21 synthetic snapshots
across three seed cases, including uint32 zero/maximum, motion/face sample times,
backward seeking, all seven existing states and reduced-motion comparisons.
The export records the exact JavaScript core SHA-256. Each case contains an
ordered sequence of `{input, scene}` samples; replay that sequence with one
fresh model for its seed. Do not reseed each frame or substitute Godot's RNG.

This export uses full JSON numbers, not a video or rounded display coordinates.
`x` and `y` are fractions of the view box and may be outside it; clipping belongs
to the renderer. Light radius is relative to width; glow x/y radii are relative
to width/height respectively. Colour channels are sRGB-style 0–255 values in the
reference renderer, with separate straight opacity, not premultiplied RGB.
Preserve offscreen and zero-alpha points in behaviour comparisons. The desktop
point-size/gain and soft backing are host display treatments, not fixture data.

The exporter has local tests for deterministic serialization, scene identity,
state coverage and static/seek cases. These tests do not prove a Godot renderer
or port works; neither exists yet. The file is an offline study artifact, not a
live transport contract or claim of exhaustive animation coverage. Keep the
engine-neutral scene contract custom and versioned rather than inventing a new
network protocol.

## Later surfaces

A reusable `Node2D` scene could render into a `SubViewport` for a 3D/VR surface.
That is a future reuse route, not an implemented VR feature. World scale,
comfort, input and accessibility need their own study. Physical desk devices
reuse the behaviour specification and suitable light representations, not the
Godot window layer. Other users must not inherit Alex's private work context.

## Evidence and limits

Godot is not currently on the checked command path (`godot` or `godot4`). No engine
was installed or launched. No Godot performance result or exact engine version
has been accepted. Pin and review the actual engine/export-template release,
licences, bundled notices, advisories and update path before implementation.

Official documentation checked on 10 November 2026:

- [DisplayServer](https://docs.godotengine.org/en/stable/classes/class_displayserver.html):
  transparency and interactive dragging support Linux X11/Wayland; availability
  still depends on the driver and compositor. Always-on-top is documented for
  Linux X11, macOS and Windows, not Wayland. Do not promise it here.
- [JavaScriptBridge](https://docs.godotengine.org/en/stable/classes/class_javascriptbridge.html):
  web-export-only bridge.
- [MultiMeshInstance2D](https://docs.godotengine.org/en/stable/classes/class_multimeshinstance2d.html):
  instanced 2D meshes; potential rendering optimisation, not measured savings.

These links describe upstream capabilities, not proof on Alex's laptop. The
current signed desktop-development grant names Electron and packaging tooling;
a Godot implementation/install needs its own applicable coverage before work.

(Briar helped draft this.)
