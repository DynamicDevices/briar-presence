# Design and interaction

[Wiki home](Home.md)

Supportive and unobtrusive throughout. Keep design intentions separate from implemented behaviour.

## Agreed direction

Alex's [visual-language MCQ decisions](Visual-Language-Vocabulary.md#selected-design-decisions--10-november-2026)
select attention-first presentation, distinct “Needs you”/“Concern”, steady visible
acknowledged concerns, face gatherings as identity rather than status, requests
then changes on inspection, focused work with a background summary, and brief
stronger attention followed by a steady cue. These are accepted design choices,
not a claim that the prototype implements them.

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
  Settings text, switches and spacing must scale for the display too. Alex
  explicitly requested no native title bar: use a rounded borderless panel,
  retain Done/Escape/keyboard access, and allow movement by dragging its heading.
  Keep focused labels readable against the pale backing.
- Resize by dragging a corner directly. No resize button, visible grip, panel
  or persistent control. The ordinary diagonal cursor may appear on corner
  hover. Preserve the face's proportions as the display changes size. This is
  Alex's explicit clarification; it is not permission to switch the desktop host.
- Initial size must suit the display, not stay at a fixed small pixel size.
  The Godot candidate starts at 30% of the current usable display height and
  preserves the face proportions and proportional rounded backing. A manual
  corner resize is retained as a relative face size when changing display;
  fit limits keep the window within the destination display. Do not multiply
  display scaling/DPI again on top of usable desktop coordinates.
- Alex requested stay-on-top as the default for the Godot candidate. Keep the
  settings/keyboard toggle so the user can turn it off. This is an ordinary
  application-window request, not permission to bypass compositor security or
  appear over system dialogs/full-screen surfaces.
- Enlarging must retain fidelity: redraw the vector lights into a framebuffer
  matching the window and scale the glow's source resolution with its drawn
  extent. Do not stretch a fixed small render target. Retain the existing
  light layout and motion; subjective quality and compositor scaling still
  need checking on the user's display.
- Resizing must remain visually steady. Window redraws must not wait for the
  slower, quiet animation-sampling cadence. Alex accepted the Godot retained-vector
  resize direction on 10 November 2026: scale existing vector commands during
  a drag, then rebuild at native dimensions on the next scene update. Do not
  substitute a low-resolution screenshot. Real compositor corner-drag comfort
  needs checking as well as rendered-frame tests on future platforms.
- Stronger need for attention should be expressed through faster movement and
  stronger colour. Red transitions are a direction to investigate, not a final
  alarm system or permission to escalate automatically.
- Meaning must be supported by motion, composition and plain explanations—not
  colour alone. Respect reduced motion. Acknowledgement must not silently resolve
  a concern. Unknown information must not look like verified healthy idle.

The detailed, provenance-linked record is [Design decisions](../design/DECISIONS.md).

### Desktop legibility correction

Alex's later screenshot showed underlying text more clearly than the light field.
The current desktop trial uses a stronger dark-slate translucent backing, less
edge blur and slightly larger/brighter light points. These are display treatments,
not a change to the core scene or proof the portrait-derived shape is implemented.
The clear reference renderer remains unchanged by default. Human legibility and
comfort still need checking on the actual desktop.

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


See [current progress](Progress.md) for implementation limits.

(Briar helped draft this.)
