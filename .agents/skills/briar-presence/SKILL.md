---
name: briar-presence
description: Preserve Briar Presence visual behaviour, quiet desktop interaction and Godot resize fidelity when changing this project.
---

# Briar Presence

Use for this project's renderer or desktop interaction changes. Start with
`wiki/Design.md`, `wiki/Progress.md` and `design/GODOT.md` at the repository root.
These distinguish agreed design, tested implementation and future proposals.
This skill supplies project guidance, not execution or publication authority.

## Preserve the quiet interaction

- Independently wandering light clusters can gather into an abstract face.
  Do not replace them with a fixed oval, mask or permanent cartoon features.
- Keep the rounded soft backing, controls hidden until requested, direct face
  dragging and native corner resizing without visible grips or size controls.
- Size both face and borderless gentle settings for the current display.
  Preserve proportions, reduced motion, keyboard access and reversible stay-above.
- Keep input, behaviour, normalized scene, renderer and native host separate.
  Future API, desk-device and VR work must not leak desktop controls into them.

## Godot resize implementation

- Retain circle/texture commands in the renderer-owned child canvas item.
  Native viewport resizing can invoke Node2D draw callbacks even without an
  explicit redraw request; Node2D caching alone did not avoid rebuilding.
- Resize by transforming retained vectors immediately between scene updates.
  A normal model sample rebuilds at the actual dimensions and resets scale.
  Do not stretch a fixed-resolution screenshot or resample behaviour on each
  window-size event. Keep presentation separate from model sampling.
- Clear retained commands before accepting an empty scene; free the owned
  canvas RID when the renderer is destroyed. Preserve glow resolution growth
  and reuse on shrink. Keep original circle appearance as the default; the
  experimental batched shader renderer is not appearance-equivalent.

## Verify affected behaviour

For Linux resize disappearance, see `wiki/Godot-Wayland-Resize.md`. Native
Wayland avoided the symptom in Alex's desktop comparison; X11 still flashed
with runtime transparency off and with a plain window. Do not mistake runtime
transparency flags for disabling the startup per-pixel allowance. Use the
explicit `--inspection-wayland` candidate option where appropriate. Alex selected
preferring an available Wayland socket for interactive launches, otherwise X11
with its resize warning; retain explicit `--inspection-x11` and never silently
retry a failed Wayland launch through X11. Do not change the installed host or
compositor settings. Diagnostic X11 comparisons must keep an explicit backend.
Recheck placement, focus, dragging and actual stay-above on a changed backend;
an engine property alone does not prove compositor behaviour.

Use `implementation/godot/resize_redraw_test.gd` for retained-vector reuse,
backing coverage, current geometry and native-size reset after a fresh scene.
Use `retained_appearance_test.gd` for empty-scene clearing and captures against
the original direct circle API; compare each generated image pair explicitly.
A successful capture alone does not prove the images match. Check engine logs
for errors as well as exit codes. Reuse source-bound evidence where unchanged.

Settled test frames do not prove every state or compositor drag frame identical.
Record actual user feedback separately from automated checks. Preserve the
installed launcher unless a host switch is explicitly accepted; publishing a
development branch is not installation or a binary release.
