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
