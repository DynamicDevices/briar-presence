# Attracting attention — options to try

Proposed in response to Alex's instructions on 10 November 2026: controls should
appear only after clicking the image; a soft area should distinguish Briar from
the desktop; stronger need for attention should produce faster movement and more
colour, possibly moving back and forth towards red. Alex asked Briar to investigate
options. The attention treatments below are proposals, not an implemented live
alert system or accepted final mapping.

## Resting view and controls

Only the lights and a diffused translucent backing should remain visible at rest.
Clicking the image (or activating its accessible button with the keyboard) opens
Move, settings and Quit. Escape returns to the quiet view. The first native
revision uses a softly feathered, asymmetrically rounded translucent overlay,
not an oval head outline and not a blur of the actual applications underneath.
Electron's documented CSS blur limitation prevents promising a compositor blur
without a separate platform-specific investigation. No compositor change is
authorised. A backdrop switch is retained for comparison.

## Recommended first comparison: blue → amber → red

| Need for attention | Motion proposal | Colour proposal |
| --- | --- | --- |
| Background presence | Current gentle independent drift, 1× | Current blue with fine pale details; no attention pulse |
| A useful heads-up | Roughly 1.3× drift; one coherent gathering | Brighter, more saturated blue/cyan in one grouping |
| Needs a response | Roughly 1.7×, still smooth rather than jittery | An amber accent grows and settles back towards blue over 5–7 seconds |
| Urgent attention | Roughly 2.2×, with a controlled repeated gathering | A stronger red accent crossfades slowly towards blue and back over 6–8 seconds |

The proposed rates are visual comparison settings, not measured severity units
or safety thresholds. Test at the actual small desktop size. Increasing speed
should not make points flicker, the window jump, or the whole display flash.
Colour intensity should rise before adding more unrelated hues. Keep a quieter
blue foundation while a local grouping carries the red; this is worth comparing
with a whole-face colour transition rather than assuming either is intuitive.

Two alternatives are useful comparisons, not parallel products:

- **Blue/red only:** progressively quicker drift and stronger red blending at
  every attention level. Closest to Alex's suggested colour transition, but may
  make an ordinary request look urgent and leave less room for concerns.
- **Blue identity with a red focus:** most lights stay blue, while one grouping
  develops a stronger red accent. Better continuity and a possible future route
  towards the affected work, but the small red region may be too easy to miss.

Start with manual, explicitly labelled demo levels; do not add live inputs or
invent alerts behind the visual. A concern is not automatically an emergency.
An important waiting decision can need attention without implying productive
work is continuing: preserve its settled composition and explain what is needed.

## Behaviour and accessibility

- Use smooth colour crossfades, not abrupt blue/red alternation, flashing or
  rapid brightness pulses. Saturated red flashing has its own accessibility
  concern; being below three flashes per second is not proof of safety.
- Reduced-motion mode remains still. Show a stable colour/composition difference
  and a plain explanation instead of relying on speed or colour alone.
- No automatic escalation merely because Alex has not clicked. Need/urgency must
  come from explicit demo selection or, later, verified scoped event information.
- Clicking to inspect may settle an attention animation; acknowledgement must
  not silently resolve the underlying concern. This interaction still needs a
  separately reviewed implementation.
- Keep pause/stop controls available, and do not play sound, steal focus, move the
  window, send notifications or enable background monitoring as part of this work.
- Do not equate expressive motion with private reasoning, emotion, authority or
  the amount of model activity. Future adapters must keep work state separate
  from the presentation's attention level.

## Evidence and next comparison

Authoritative guidance checked:

- [WCAG 2.2: Three flashes or below threshold](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)
  — general and red-flash conditions; not a certification of these proposals.
- [Animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
  — user control of non-essential motion.
- [Pause, stop, hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
  — control of ongoing animation alongside other content.
- [Electron custom window styles](https://www.electronjs.org/docs/latest/tutorial/custom-window-styles)
  — CSS blur does not blur other desktop applications beneath the window.

Next: show a small labelled comparison of gentle blue/amber/red attention and
the blue/red-only alternative. Ask Alex to judge legibility, calmness and whether
the strongest level attracts attention without feeling like an alarm. A proposal
or animation unit test cannot establish comfort or accessibility conformance.
