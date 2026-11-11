# Native Wayland resizing — 11 November 2026

[Wiki home](Home.md)

Alex observed the whole Briar rectangle disappearing and reappearing during
corner resizing. Native Wayland avoided that flashing in his desktop trial,
with the transparent rounded backing and light renderer retained. Alex replied
“that worked” and requested that the result be locked in, committed and pushed.
This is evidence for this desktop/backend, not every Linux compositor or platform.

## Run the verified route

From `implementation/`, with the existing pinned Godot engine already present:

```sh
node scripts/launch-godot.mjs --inspection-wayland
```

This explicitly selects Godot's native Wayland backend and the synthetic
inspection recording. It needs a working Wayland session/socket. It downloads
nothing and does not install, connect live harness data or change the desktop
session. The ordinary `--inspection` option still leaves backend selection to
Godot; there is no silent fallback or default-backend change in this iteration.

Startup reported `displayServer: Wayland`, `transparentWindow: true`,
`transparentViewport: true`, `opaqueResizeTest: false`, and a resizable window.
Its usable display was 2256 × 1504 logical coordinates and initial window
358 × 451. These are compositor-reported coordinates, not physical pixel counts.

## What the comparison established

| Comparison | Alex's observation | Limit |
| --- | --- | --- |
| X11 face with transparency | Whole display disappears and reappears during resizing | Native smooth-resize failure |
| X11 face with runtime transparency off | “that still flashes” | Startup per-pixel allowance remained enabled |
| Plain opaque X11 Godot window, no face renderer or animation | “still flashes” | Face rendering is not required to trigger the symptom; startup allowance remained enabled |
| Native Wayland face, transparency restored | “that worked” | Successful resize comparison on this desktop |

[Godot issue #120113](https://github.com/godotengine/godot/issues/120113)
describes closely matching Linux resize visibility glitches. Comments identify
the [startup per-pixel allowance rather than only the transparent flag](https://github.com/godotengine/godot/issues/120113#issuecomment-4660537062),
and report [native Wayland avoiding the X11 behaviour](https://github.com/godotengine/godot/issues/120113#issuecomment-4694051141).
The report was open when checked. This is a matching upstream report and a
tested workaround, not proof of the exact engine defect or a fix on X11.

Retained developer diagnostics are `--inspection-opaque` and `--plain-resize-test`.
Neither changes normal project transparency settings. Their square opaque
appearance is diagnostic, not the accepted design.

## Name and interaction

Alex first requested “Briar” inside the rectangle at top-left, then requested
top-centre after seeing it. The passive label is now centred inside the upper
rounded backing, scales within bounded font sizes and cannot intercept clicks,
dragging or right-click. It is not a native title bar or a persistent control.
The clustered-light behaviour and face renderer are unchanged.

Earlier X11 observations accepted menu/About readability, About Close leaving
the face running, click versus drag separation, and panel placement at the
tested corner. They do not establish those behaviours on native Wayland.

## What remains

Check native Wayland click/drag and corner fidelity, keyboard/focus/close,
task selection and return, acknowledgement versus resolution, expiry/unknown,
continued unobtrusive motion, monitor scaling and actual stay-above behaviour.
The startup stay-above flag is not proof that Wayland honours it. Do not bypass
compositor restrictions to enforce it. Independent code review and Windows/macOS
native acceptance remain separate. The installed app has not been replaced.

The next launcher decision is whether to prefer Wayland when available and what
to offer on X11-only desktops. That policy is not silently adopted here.

Assisted-by: Briar
