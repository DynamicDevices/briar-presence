# Briar Presence

A visual presence for Briar: quiet enough to live alongside other work, expressive
enough to show our interaction, and clear enough to direct attention to concerns.

**Stage: experimental desktop preview and Godot study, 10 November 2026.**
No live harness connection or production client. Alex's “good start — lock this
in” preserves the current hybrid light material and motion studies; it does not
freeze the final design or establish production readiness.

The first intended surface is a non-intrusive display on Alex's laptop. Future
surfaces may include a desk device and VR, and the design must be usable by other
people working with the Briar headless harness. Those are design considerations,
not commitments to build hardware, VR or harness integrations now.

The intended integration direction is an API that can be driven by the Briar
harness **or other producers**. A harness-independent client is a design goal,
not a live API or hosted service available today. See the [API direction](wiki/API.md).

## Start here

- [Project wiki](wiki/Home.md) — agreed direction, portrait reference, current progress and unfinished work.
- [Design brief](design/BRIEF.md) — requirements, boundaries and open questions.
- [Iteration plan](design/PLAN.md) — reviewable stages and acceptance questions.
- [Decisions](design/DECISIONS.md) — agreed requirements versus proposals.
- [Round 01](design/studies/01-light-clusters/README.md) — three light-cluster
  directions, each showing attention, focused work and concern.
- [Round 02](design/studies/02-cloudlets-and-grain/README.md) — the selected
  Cloudlets + fine-grain direction, accepted for exploration in motion.
- [Round 03](design/studies/03-motion/README.md) — a manually played design
  animatic, including an occasional abstract face; accepted as a starting point.
- [Review notes](design/REVIEW.md) — one current review record and next experiment.
- [Visual references](design/REFERENCES.md) — production sources and limits.

## Deliberate separation

| Area | Purpose | Not evidence of |
| --- | --- | --- |
| `design/` | Briefs, still studies, motion intentions and review decisions | Implemented behaviour |
| `prototypes/` | Disposable, explicitly simulated interaction experiments | Live harness status |
| `implementation/` | Portable scene code and a local native desktop feasibility app | A final toolkit, production client or promised device |

The old line-based demo is preserved in `prototypes/legacy-line-study/`. It is a
superseded experiment, not the chosen visual direction. Open its HTML directly;
it does not need a web server.

## Principles

Groupings of lights, not wire diagrams. Meaning through composition and movement,
not colour alone. Specific concerns have named destinations. Unknown data stays
unknown. No inferred emotions, covert sensing or misleading progress animation.

The Lost in Space robot is a reference for clustered light and apparent depth,
not a source of copied graphics, footage or assets. These studies are original.
Original project source is licensed under **GNU GPL version 3 or, at your option,
any later version** (`GPL-3.0-or-later`); see [LICENSE](LICENSE). Third-party
dependencies retain their own licences and notices. There is no warranty.
The repository is public. New source/wiki work is reviewed on development
branches and Alex merges it manually; `main` may lag those studies. No public
binary release or production readiness is claimed.

Assisted-by: Briar
