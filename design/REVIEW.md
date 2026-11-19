# Current design review

## Round 01 — clustered-light appearance

**Question:** which grouping of lights should be the material of Briar's face?

**Candidate:** `studies/01-light-clusters/`, created 10 November 2026. Compare
Cloudlets, Constellations and Granular Light, each in attention, focus and concern.

**Earlier feedback:** Alex found the line-led demo insufficiently interesting,
preferred the Lost in Space light groupings, and asked for richer representation
of interaction, worries and multiple ongoing work items. Laptop presence must be
non-intrusive; design and implementation must remain separate.

**Round 01 feedback:** Alex selected “Combine Cloudlets + fine granular detail”
in the desktop visual review on 10 November 2026. This is a direction to develop,
not final appearance approval. The original sheets remain unchanged.

**Known limits:** static artwork cannot prove natural movement, peripheral comfort,
small-size usability or intuitive recognition. Concern meaning and colour choices
are proposals. No live data, active task list or production renderer exists.

## Round 02 — hybrid still

**Candidate:** `studies/02-cloudlets-and-grain/hybrid.png` and editable SVG.
Soft Cloudlet pockets carry an additional fine particle layer from Granular Light.
All three state compositions remain comparable to Round 01.

**Question:** is the balance of soft groupings and individual lights right?

**Acceptance:** Alex selected “Explore this appearance in motion” in the desktop
review on 10 November 2026. This passes the appearance-to-motion checkpoint,
not final design acceptance. The brief and other proposals are not automatically
accepted through this selection.

## Round 03 — gathering, abstract face and concern

**New user direction:** “it would be good for sometimes it to come together like
an abstract face”. Add occasional abstract features, not a permanent mask.

**Candidate:** `studies/03-motion/motion-study.html`, a standalone, manually played
52-second design animatic (v2). Available → attending → abstract face → focused
work → local amber concern → waiting → correction/rethink → simulated resolution.
Separate urgent and disconnected examples follow, then rest. Reduced-motion/manual
chapter selection is included; playback starts still and stops at the end. The
earlier 32-second version is preserved as `motion-study-v1.html`.

**Acceptance:** Alex said “ok this is a good start - lock this in” on 10 November
2026. Preserve the hybrid appearance and current motion study as an accepted
starting baseline. This is not final design acceptance or evidence that browser
playback, small-size readability, intuitive recognition or peripheral comfort
have been verified. Unknown/stale information and multi-work navigation remain
outstanding.

**Checks:** offline chapter/transport tests for all 11 chapters and Canvas still
rendering passed. Disconnected light is pixel-identical at two separate times.
The in-app browser blocked automated local-file navigation. No listener or
browser-policy workaround was used; actual browser playback/layout/accessibility
are still unverified. These rounds remain local drafts, not new GitHub releases.

**Next proposed stage:** simulated multiple-work navigation, using the accepted
starting visual material. Begin the next stage under Alex's direction, retain
the review checkpoints, and revisit motion when concrete feedback warrants it.
Production implementation, hardware, VR and live harness work remain deferred.

**Earlier checkpoint:** Alex initially selected “Not watched yet — keep this
checkpoint open”. His later “good start — lock this in” accepts this as a
starting baseline; it does not establish that every playback test was performed.
Do not repeat the superseded not-watched prompt on automatic continuations.

## Multiple-work navigation — local study 01

**Candidate:** `../prototypes/multi-work-01/index.html`, using only fictional tasks
and static frames of the accepted clustered-light material. This is not the
laptop product or live harness integration; PR #1 remains unchanged.

**Question:** can Alex keep his current focus while finding a concern elsewhere,
understanding why it matters and seeing who should act next?

**Cases:** independent inspect/focus selections; two concerns and one urgent item;
waiting on the user versus someone else; stale information shown as unknown;
acknowledgement that does not clear a concern; fixed named light positions; a
30-item fixture with an urgent overflow item; synthetic deep links and reset.

**Acceptance:** not yet reviewed. The navigation structure and overflow treatment
are proposals, not settled decisions. Human review of actual browser layout,
keyboard accessibility and comprehension remains necessary before advancing to
the small laptop-presence stage. No assumption is made that all work needs an
individual peripheral grouping in production.

**Checks:** offline DOM-model tests pass for the listed cases and for no network,
storage or polling APIs. This is not real-browser, keyboard or human acceptance.

**Next:** Alex's navigation review in a trusted browser. Do not start live
updates, background observation, hardware, VR or external participant contact.

**Checkpoint response:** Alex selected “Not tried yet — keep this checkpoint
open” in the desktop navigation review. Await his feedback before advancing to
the smaller laptop-presence study. Do not repeat the unchanged review prompt
on automatic continuations.

## Superseding direction — laptop presence and native overlay

Alex subsequently directed Briar back to the small presence, refined continuous
randomised light motion, rejected the oval enclosure, and accepted the resulting
visual direction as a good start. The navigation experiment is preserved, not
the current review gate. After movable browser v6, Alex requested a desktop
overlay architected for other platforms and set that as the goal. The current
native-window checks and the remaining human review are recorded in
[implementation/README.md](../implementation/README.md). Do not infer that the
native appearance, compositor behaviour, resource cost or toolkit is accepted
from the earlier browser feedback.
