# Briar Presence wiki

A quiet visual presence for understanding work, interaction and concerns. Lights
wander independently and sometimes gather into an abstract face. Everything
should remain supportive, understandable and unobtrusive.

This is the version-controlled project wiki. Design decisions, implementation
evidence and future proposals are kept separate. It is not a claim that the
separate GitHub Wiki service has been populated.

## Read by topic

| Page | What it covers |
| --- | --- |
| [Design and interaction](Design.md) | Agreed visual direction, attention, gentle controls and portrait-reference limits |
| [Current progress and preview](Progress.md) | What works, test evidence, unfinished work and how to try the existing preview |
| [Platform capabilities](Platforms.md) | Desktop, Godot, browser, desk-device and VR strengths, constraints and evidence gaps |
| [API direction](API.md) | Proposed producer-neutral integration: Briar harness or other clients; not a running API |
| [Visual-language API review and plan](Visual-Language-API.md) | Approved review, concurrent work/concerns, contract, extensibility, safeguards and staged acceptance |
| [Vocabulary and scenarios — draft](Visual-Language-Vocabulary.md) | Proposed meanings, user-facing phrases, 14 synthetic scenarios and human readability checks |
| [Godot study](../design/GODOT.md) | Renderer, behaviour-port checks, engine provenance and desktop limitations |
| [Project development skill](../.agents/skills/briar-presence/SKILL.md) | Quiet interaction constraints, retained-vector resizing and affected verification |

## Project direction

Laptop first, with Godot as an explicit target. Future desk devices and VR should
reuse the visual meaning without inheriting desktop window controls. The planned
API should allow the Briar harness **or another producer** to supply information;
users should not need the Briar harness just to use the visualisation.

The repository became public on 10 November 2026 after the publication checks
and separate signed approval. Alex selected **GPLv3-or-later**. New source and
wiki changes follow development-branch review; `main` may lag this working wiki
until Alex merges them. Public availability is not production readiness.
Original project source is licensed under [GPLv3-or-later](../LICENSE).

No live API, harness connection, telemetry, automatic startup, hardware or VR
implementation exists. The desktop host remains provisional; unknown data must
never be presented as verified healthy idle.

## Detailed sources

- [Brief](../design/BRIEF.md), [decisions](../design/DECISIONS.md) and [iteration plan](../design/PLAN.md).
- [Attention research](../design/ATTENTION.md) and [visual references](../design/REFERENCES.md).
- [Architecture](../implementation/ARCHITECTURE.md) and [implementation notes](../implementation/README.md).
- [Preserved browser reference](../prototypes/laptop-presence-01/README.md).

Assisted-by: Briar
