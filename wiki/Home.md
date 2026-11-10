# Briar Presence wiki

Our working record for Briar's visual presence. Alex asked to lock the direction
and work so far into a wiki on 10 November 2026. This is a version-controlled wiki
inside the private project repository, not a separate published GitHub Wiki.

## What we are making

A small, supportive presence alongside normal work. At rest, it should be quiet
and unobtrusive: independent clusters of lights, a gentle backing when needed,
and no buttons or dashboard. Sometimes the lights gather into an abstract face.
The first useful surface is Alex's laptop; portability to other harness users,
desk displays and VR shapes the architecture, not the current implementation scope.

**Design rule: everything here must be supportive and unobtrusive.** Alex's
instruction governs this project: no harsh black panel over the face, modal
interruption, persistent control strip, flashing alarm or unexplained escalation.
Keep changes easy to understand, inspect, adjust and dismiss.

## Agreed direction

- Irregular cloudlets and fine light detail, not connecting lines or a fixed mask.
- Continuous varied movement, not a sequence that visibly moves once and settles
  into an apparently static image. Lights should wander independently rather than
  merely expanding and contracting together.
- An occasional abstract face that gathers and dissolves, not permanent cartoon
  eyes and mouth. Use the **portrait supplied by Alex** as its shape/expression
  reference; keep the result procedural and abstract.
- A friendly, more-rounded soft backing, not the earlier oval enclosure. It
  should distinguish the area against the desktop without becoming a harsh card.
- Controls appear on request after clicking the image. They must not replace the
  face with a black panel. Moving the image should be easy from that interaction.
- Stronger need for attention should be expressed through faster movement and
  stronger colour. Red transitions are a direction to investigate, not a final
  alarm system or permission to escalate automatically.
- Meaning must be supported by motion, composition and plain explanations—not
  colour alone. Respect reduced motion. Acknowledgement must not silently resolve
  a concern. Unknown information must not look like verified healthy idle.

The detailed, provenance-linked record is [Design decisions](../design/DECISIONS.md).

## The portrait reference

Alex said: “I would also like you to use the Briar face you chose as the basis
for the shape of the face when you show it”, then “lock this into the wiki too”.

Use the supplied reference's gently asymmetric brow/eye arrangement, open gaze,
softly tapered lower face, rounded jaw and restrained smile as guides for the
light layout. The short, side-swept upper contour can influence the overall
asymmetry without literally drawing hair. Preserve a welcoming expression; do
not turn the reference into a fixed realistic human mask or claim a person's
identity, biography, emotions or consciousness from the picture.

The original is the portrait attachment in the originating chat, filename
`codex-clipboard-2f6e1b8f-9e91-446b-8ab3-915c92c1a5bf.png`.
SHA-256: `5af785fa9ed863135494717fc90f58dff211fe808bc033a3a366a2eb6f100131`.
It has not been embedded in the application or copied into this repository.
Its origin is not independently established here. The reference requirement is
locked in; the new procedural face mapping is **not yet implemented or reviewed**.

## Where the work stands

| Area | Current evidence | Still open |
| --- | --- | --- |
| Portable light behaviour | Separate seeded scene generator, Canvas renderer, synthetic-state input and desktop host | Future adapters and wider platform tests |
| Existing light appearance | 28 sampled offline frames match the earlier accepted v6 preview exactly | New portrait-derived face formation needs its own study |
| Native desktop preview | Local Electron candidate runs on GNOME/Wayland with sandboxing and context isolation reported by its renderer | Electron is not the accepted final toolkit |
| Quiet view and soft backing | Only the image is visible at rest; backing is more rounded and softly feathered | Human review of comfort and legibility |
| Gentle settings | Separate pale, non-modal settings window; the face keeps rendering | Compositor may ignore the requested side placement; reported bounds overlap, so non-obscuring placement is not proven |
| Moving Briar | Clicking the image enables its native drag region while settings are open; closing settings restores click mode | Real pointer dragging and keyboard/window-manager comfort need Alex's check |
| Attention | Research and alternatives documented | No graded attention rates or cycling red alert have been adopted or implemented |
| Packaging | An initial standalone Linux candidate was built | It predates the latest settings changes; do not install it as current. Rebuild, test and review the corrected candidate |
| Resource use | One short pre-refactor sample: about 354 MiB proportional memory and 10.5% of one core | Not an idle/battery result or accepted footprint; reassess only after relevant changes |
| Development dependencies | Electron/Packager are pinned in the lockfile | The latest packaging-tool audit still reports four moderate findings; not a clean release gate |

These are partial checks, not production readiness, accessibility certification,
cross-platform acceptance or proof that all desktop compositors honour the API.
There is no live harness connection, telemetry, auto-start, screen-wide capture,
microphone/camera access, monitoring service, hardware implementation or VR client.

## How to try the local preview

Launch **Briar Presence (preview)** from the application launcher, or run
`briar-presence`. Click the image for display settings. While settings are open,
drag the image itself to move the native window. **Done**, Escape or closing the
settings window returns to the quiet view. **Quit Briar** exits the application.

The current launcher still uses the development checkout. It is not the final
standalone installation. If the compositor places settings inconveniently, its
normal title bar can move that separate window; do not claim automatic side
placement has been solved. No tray icon or global input hook is required.

## Source pages

- [Design brief](../design/BRIEF.md): purpose, users and boundaries.
- [Design decisions](../design/DECISIONS.md): user instructions versus proposals.
- [Attention options](../design/ATTENTION.md): speeds, colour transitions and accessibility considerations.
- [Architecture](../implementation/ARCHITECTURE.md): input, behaviour, rendering and platform-host separation.
- [Implementation notes](../implementation/README.md): current local checks, limits and continuation point.
- [Visual studies](../design/PLAN.md): the design iteration route and earlier experiments.
- [Original v6 laptop experiment](../prototypes/laptop-presence-01/README.md): preserved browser reference, not a live-status client.

Keep this wiki concise and current. Link detailed evidence and source owners
rather than copying logs or transcripts. Alex reviews meaningful visual/platform
compromises and merges development PRs; an active goal or this wiki grants no
additional operational authority.

(Briar helped draft this.)
