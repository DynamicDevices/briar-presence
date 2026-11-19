# Quiet application menu and About

Alex requested that **Quit Briar leave Display settings**, with a right-click
menu and an About option. Display settings now contains display preferences and
Done; application actions live separately.

Right-click the face, or focus the face and use Menu/Shift+F10, to open the pale,
rounded application menu:

- Display settings.
- About Briar.
- Quit Briar, separated from the other choices.

Left-click/Enter/Space retain their existing work-inspection behaviour. Face
dragging still needs a movement threshold, and left-button corner resizing keeps
priority. Right-click clears any pending left click so closing the menu cannot
accidentally open work inspection. Ctrl+Q remains the existing quit shortcut.
Menu controls remain hidden until requested; nothing opens automatically.

About is a separate borderless, display-scaled, non-modal pale panel, placed
beside the face when space is available. It names the development preview,
Godot version, GPLv3-or-later/no-warranty terms and synthetic/not-connected status.
Project source opens only after its explicit link is clicked. Close/Escape hides
About and returns focus to the face; it does not quit Briar. No executable code,
assets or links are accepted from incoming status messages.

Both new runtime scripts are included in the Godot export/package inventories.
Local evidence: 379 source-bound headless checks over the full synthetic tape and
36 projection vectors, and 94 Node tests, zero fail/skip/cancel. Headless checks
include input routing, separate application actions, no Quit button in settings,
scaled menu/About controls and About close without host exit. This is not native
pointer/compositor/rendered-pixel acceptance or independent code review.

The accepted clustered-light renderer and installed app are unchanged. These
changes are for the separate uninstalled synthetic candidate. Alex's actual
menu/About/drag/resize/focus feedback and final platform acceptance remain open.

Assisted-by: Briar
