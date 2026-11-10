# Briar Presence

A visual presence for Briar: quiet enough to live alongside other work, expressive
enough to show our interaction, and clear enough to direct attention to concerns.

**Stage: design exploration. No live harness connection or production client.**

The first intended surface is a non-intrusive display on Alex's laptop. Future
surfaces may include a desk device and VR, and the design must be usable by other
people working with the Briar headless harness. Those are design considerations,
not commitments to build hardware, VR or harness integrations now.

## Start here

- [Design brief](design/BRIEF.md) — requirements, boundaries and open questions.
- [Iteration plan](design/PLAN.md) — reviewable stages and acceptance questions.
- [Decisions](design/DECISIONS.md) — agreed requirements versus proposals.
- [Round 01](design/studies/01-light-clusters/README.md) — three light-cluster
  directions, each showing attention, focused work and concern.
- [Review notes](design/REVIEW.md) — one current review record and next experiment.
- [Visual references](design/REFERENCES.md) — production sources and limits.

## Deliberate separation

| Area | Purpose | Not evidence of |
| --- | --- | --- |
| `design/` | Briefs, still studies, motion intentions and review decisions | Implemented behaviour |
| `prototypes/` | Disposable, explicitly simulated interaction experiments | Live harness status |
| `implementation/` | Future production software, after design validation | A promised framework or device |

The old line-based demo is preserved in `prototypes/legacy-line-study/`. It is a
superseded experiment, not the chosen visual direction. Open its HTML directly;
it does not need a web server.

## Principles

Groupings of lights, not wire diagrams. Meaning through composition and movement,
not colour alone. Specific concerns have named destinations. Unknown data stays
unknown. No inferred emotions, covert sensing or misleading progress animation.

The Lost in Space robot is a reference for clustered light and apparent depth,
not a source of copied graphics, footage or assets. These studies are original.
No open-source licence or public release has been selected yet.

Assisted-by: Briar
