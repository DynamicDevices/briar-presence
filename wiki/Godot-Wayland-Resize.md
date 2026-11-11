# Native Wayland resizing — 11 November 2026

[Wiki home](Home.md)

Alex observed the whole Briar rectangle disappearing and reappearing during
corner resizing. Native Wayland avoided that flashing in his desktop trial,
with the transparent rounded backing and light renderer retained. Alex replied
“that worked” and requested that the result be locked in, committed and pushed.
This is evidence for this desktop/backend, not every Linux compositor or platform.

## Run the verified route

Subsequent Wayland interaction checks with Alex confirmed continued gentle
motion, correct click/drag separation, Shift+F10/Escape menu handling without
quitting, task selection/details/return, and acknowledgement distinct from
resolution. Resize fidelity and cross-monitor behaviour remain separate checks.
Compact-dialog feedback was positive, not universal panel/focus acceptance.

Actual stacking is still unresolved: GNOME Always on Top stays checked for
Briar and works against normal Files, but Alex reports a normal Codex window
can cover Briar even with Codex's own Always on Top unchecked. Godot's flag
does not establish Wayland compositor behaviour. The X11 metadata query found
no matching Codex class, which establishes neither backend nor stacking state.
No compositor/security change is proposed as a proven fix. The accepted resize
workaround must not be presented as a stay-above repair.

From `implementation/`, with the existing pinned Godot engine already present:

```sh
node scripts/launch-godot.mjs --inspection-wayland
```

This explicitly selects Godot's native Wayland backend and the synthetic
inspection recording. It needs a working Wayland session/socket. It downloads
nothing and does not install, connect live harness data or change the desktop
session. Alex subsequently selected preferring native Wayland when available,
with an explanation on X11-only sessions. Ordinary interactive launches,
including `--inspection`, now select Wayland when the advertised Wayland socket
exists. Otherwise they select X11 and print its known resize limitation. A
regular file is not treated as a socket; an unavailable Wayland connection is
not inferred solely from the desktop session name. A failed Wayland launch is
not silently retried through X11. Explicit `--inspection-wayland` and
`--inspection-x11` retain manual choices. Opaque/plain diagnostics explicitly
use X11 so automatic selection cannot invalidate the comparison. Finite smoke
and engine-check modes keep their previous backend behaviour.

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

On the next native Wayland trial Alex confirmed the preview was running but
reported that it did not stay above other windows despite the setting, and
the dialogs were too large. These are failed native checks, not accepted
behaviour. A requested stay-above engine flag must not be presented as proof
of actual stacking. The exact dialog-scaling cause and suitable correction
still need diagnosis and native retesting. No stacking/sizing fix is claimed.

Alex subsequently selected standard logical dialog sizing on Wayland, followed
by a native check. Settings, inspection, About and menu now use scale1.0 in
normal Wayland logical desktop space, shrinking to fit small displays; X11
keeps the existing height-based policy. The six-display sizing test and390
full-recording headless checks pass. The new native sizing question timed out,
so comfortable text/window size is not yet accepted. No always-on-top repair
was applied. Godot's [documented always-on-top flag](https://docs.godotengine.org/en/stable/classes/class_displayserver.html#enum-displayserver-windowflags)
lists Linux X11, macOS and Windows, not Wayland. A compositor-supported user
choice or another agreed host route still needs consideration; no settings,
privileged extension or security policy were changed.

Check native Wayland click/drag and corner fidelity, keyboard/focus/close,
task selection and return, acknowledgement versus resolution, expiry/unknown,
continued unobtrusive motion, monitor scaling and actual stay-above behaviour.
The startup stay-above flag is not proof that Wayland honours it. Do not bypass
compositor restrictions to enforce it. Independent code review and Windows/macOS
native acceptance remain separate. The installed app has not been replaced.

The backend policy above is Alex's selected direction, not installation
acceptance or a guarantee that every Wayland compositor supports every feature.

Assisted-by: Briar
