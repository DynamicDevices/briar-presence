# Design brief

Status: requirements captured from Alex's instructions in this chat on
10 November 2026; proposed solutions remain subject to review.

## Purpose

Let a person glance at Briar and understand the broad state of their work
together. Make it easy to find which work needs attention and why, without
demanding constant attention to the display.

The face is a form of communication, not a model-load meter or proof of an
internal emotional experience. Its vocabulary should make sense to new users
without requiring knowledge of Alex and Briar's shared history.

## Surfaces and scope

1. **Laptop first:** a quiet, glanceable presence alongside normal work.
   Window size, placement, always-on-top behaviour and OS integration are open.
   Do not assume a floating window or system-tray implementation is chosen.
2. **Possible desk device:** consider legibility at a distance and limited
   display size. No board, screen, enclosure or electrical design is selected.
3. **Possible VR:** consider depth, comfort and a non-obstructive position.
   No runtime, headset, engine or 3D embodiment is selected.
4. **Other headless-harness users:** use neutral interaction concepts and
   user-specific task labels; do not hard-code Alex's projects or records.

Keep design concepts separate from prototypes and production implementation.
Future integrations need their own explicit scope, access and validation.

## Visual material

- Original, irregular groupings of small lights suspended at different apparent
  depths behind dark glass; inspired by the modern Lost in Space face.
- Groupings gather, disperse and reorganise. Drawn connecting lines are not the
  main visual material. Avoid permanent eyes, perfect rings and sharp polygons.
- The identity remains recognisably Briar across expressions and surfaces.
- Brightness, density, stillness, spacing and movement support meaning.
- Original procedural artwork only; no copied television graphics or media.

## Interaction vocabulary to explore

| Meaning | Motion/composition proposal | Must not imply |
| --- | --- | --- |
| Available | Spacious blue groupings, restrained movement | Active listening or verified health |
| Attending | Groupings gather towards a shared focus | Reading a person's feelings |
| Exploring | Several formations emerge and recombine | A transcript of private reasoning |
| Focused work | Coherent, purposeful formations | Quantified progress without evidence |
| Waiting for a person | Settled, open formation plus a clear label | Work is continuing |
| Concern | Local amber grouping within blue | Anger, failure, or immediate danger |
| Urgent | Firm red change with a specific explanation | Authority or permission to act |
| Resolved/complete | One restrained release, then rest | Success before acceptance checks |
| Disconnected/unknown | Distinct static/dim treatment and explicit text | Everything is fine |

Research, building and verification may have subtler variations. First test
whether broad meanings are readable; do not create a vocabulary users must study.

## Worries and concerns

Distinguish a concern the person expresses, a concrete concern Briar raises,
and an unresolved concern awaiting evidence or a decision. Acknowledgement is
not resolution. A worry must not trigger premature reassurance or red alarm.
Concerns remain reachable without constant pulsing. Their words and evidence
belong alongside the face; the lights do not explain specifics by themselves.

## Several things at once

The focused interaction and other ongoing work must be distinguishable. A
possible companion list names each work item and its concern, responsible next
actor and route to detail. Peripheral light groupings are one untested proposal,
not a settled placement or a forced one-cluster-per-chat mapping.

Required outcomes:

- Find the affected work without memorising anonymous light positions.
- Keep relevant positions stable and avoid visual overload as work increases.
- Distinguish needs-your-decision, Briar-can-continue, waiting-on-another and
  unknown/stale information.
- Keep serious concerns reachable when the focused conversation changes.
- Never imply that monitoring other work is active without an authorised,
  functioning source of updates. This design does not start monitoring.

## Non-intrusive and accessible

- Quiet default: no strobing, involuntary sound, bouncing, stolen focus or
  constant notification loop. Concern alone need not interrupt.
- Meaning survives reduced motion, monochrome and small display sizes.
- Provide plain labels and keyboard-accessible named navigation.
- Adjust brightness for peripheral use; readability beats cinematic effects.
- Explicit feedback may inform a restrained celebration, never a reward meter.
- No camera, microphone or affect inference is needed for these studies.

## Honesty boundary

Simulations stay labelled. Future states must be driven by observable events,
not claims of sensing private thoughts or user emotions. Missing, stale,
disconnected and waiting states must not animate as successful ongoing work.
Approval, risk, urgency and readiness are different concepts. No light colour
or expression supplies execution authority.

## Open questions

Which cluster character feels right? How much motion is comfortable in peripheral
vision? What is the smallest useful laptop form? Should the named work list be
always visible or available on demand? How many concerns can remain legible?
How does a concern elsewhere relate to the current face without making every
conversation look worried? Test these before choosing implementation technology.
