# Round 03 — motion and a fleeting abstract face

Alex selected exploration of the hybrid appearance in motion in the desktop
review on 10 November 2026. He then added: “it would be good for sometimes it to
come together like an abstract face”.

He subsequently said “ok this is a good start - lock this in”. This version is
the accepted starting motion baseline, not a final design or a production client.

Open `motion-study.html` directly in a browser. It is a self-contained **design
animatic**, not a production client or live harness display. It needs no server,
network, microphone, camera or installation. All work and interaction are simulated.

The study begins still. Play the 52-second sequence or use the timeline and named
chapter buttons. Playback stops at the end; looping is not enabled. Reduced
motion disables automatic playback while preserving manual chapter selection.

## Sequence

1. Spacious clusters gather into attention.
2. Some light briefly suggests an asymmetric brow, cheeks and lower face.
3. The suggestion dissolves as formations become more purposeful.
4. A local amber concern emerges, held within the surrounding blue.
5. Motion settles while the simulated interaction awaits a person's choice.
6. A correction loosens and reorganises the groupings, without anger or alarm.
7. A simulated resolution releases the concern into blue.
8. Two separate examples demonstrate urgency and disconnection: contracted red
   light with an urgent label, then dim, still grey light with a disconnected label.
9. The study returns to rest and stops.

The facial suggestion is occasional and deliberately abstract. No conventional
eyes, pupils, teeth, lip-sync, facial tracking or user-affect inference is present.
This revises the earlier assumption that there should be no facial suggestion at
all: Alex's latest request permits transient abstract features, not a fixed mask.

The urgent/disconnected examples are separate demonstrations, not consequences
of the earlier worry. Unknown/stale information and multiple-work navigation
still need their own treatment; this study does not validate all expressions.
`motion-study-v1.html` preserves the earlier 32-second draft unchanged.

## Review questions

Does the fleeting face emerge clearly enough without becoming eerie or too
literal? Is the gathering and dissolving rhythm comfortable? Does amber remain
local and thoughtful rather than alarming? Can the individual lights still be
seen? This large design study does not establish peripheral comfort at laptop
size, intuitive recognition, motion acceptance or truthfulness of live events.

`motion-study.html` is disposable concept-authoring code. It is intentionally
inside `design/studies/`, separate from production implementation. A future
renderer need not use Canvas, these coordinates, these timings or this vocabulary.

## Checks and limits

`check-study.cjs` exercises the chapter/transport logic and renders still frames
using an offline Canvas implementation. It checks initial stillness, chapter
selection and labels for all 11 chapters, reduced motion, restart, timeline
selection, pausing when hidden, stopping at the end and pixel-identical
disconnected stillness at two separate times. Existing `@napi-rs/canvas` is required, with
optional `sharp` for `--preview`; module locations can be supplied through
`BRIAR_CANVAS_MODULE` and `BRIAR_SHARP_MODULE`. No packages are installed.

These checks passed for this candidate. The in-app browser refused automated
`file:` navigation; no server was started or browser-policy workaround attempted.
Actual browser playback, layout and accessibility remain unverified. Open the
file directly in a trusted browser for review. `preview.png` contains four
offline-rendered stills, not a browser screenshot.
