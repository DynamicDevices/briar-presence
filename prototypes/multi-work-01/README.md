# Multiple-work navigation — local simulated study

Open `index.html` directly in Brave. No server, installation or network is needed.
This is a disposable navigation prototype, not the laptop product or a harness
integration. Every task, issue, owner and update age is fictional.

## Question

Can a person keep their current focus while finding which other work needs
attention, why, and who should act next?

## Intended behaviour

- Current focus and the inspected work are separate selections.
- Six named light groupings remain in fixed positions; the matching named list
  carries the specifics. No meaning depends on remembering an anonymous light.
- Urgency, concern, waiting, next actor and freshness are distinct fields.
- Switching focus or inspecting another item never clears a concern.
- Acknowledgement is explicitly not resolution; it does not remove the issue.
- Stale information has a dim, explicitly unknown treatment, not ordinary blue.
- A 30-item fixture exposes clutter and ensures an urgent overflow item is
  reachable. It is not a chosen production scaling rule.
- The local URL hash carries only fictional inspect/focus selections. No personal
  state, storage, accounts, messages, background update source or monitoring exists.

The initial scenario deliberately starts with Orchard focused and a Beacon
concern being inspected. Cedar is urgent elsewhere. Harbor awaits someone else;
Mesa has stale information; Willow needs a user decision about a concern.

## Visual material

`assets/` contains static crops of the accepted motion study's offline-rendered
preview: abstract face, concern, urgent and disconnected. They are reused for
navigation only. This does not propose a new motion vocabulary or imply that a
focused work item must always look like an abstract face.

## Acceptance still needed

Actual browser layout, keyboard usability, small laptop-size comfort, visual
clarity and comprehension require human review. Offline logic tests do not prove
these. Do not advance to the laptop-product or live-data stage based on this
prototype running or its tests passing. PR #1's accepted visual baseline remains
unchanged; this is a subsequent local draft.

## Offline checks

Run `node check-navigation.cjs` with Node's built-in modules; no dependencies or
server are needed. The checks exercise a minimal DOM model, not a browser:
separate inspect/focus, concerns surviving focus changes and acknowledgement,
stale/unknown treatment, next actors, stable named slots, 30-item overflow,
synthetic URL selections, invalid IDs, reset and the absence of network,
storage and polling APIs. These checks cannot establish real accessibility or
visual usability. Browser-policy restrictions from the earlier local-file check
are not bypassed for this study.
