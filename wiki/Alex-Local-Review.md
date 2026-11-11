# Alex's local review

[Wiki home](Home.md) · [Findings](Local-State-Review.md) · [Review plan](Review-and-CI-Plan.md)

Alex selected personally reviewing the candidate locally. This is the review
package, not a record that the review has happened. No new worker is needed.

## What to review

### Current desktop and cross-build additions

Review [PR #14](https://github.com/DynamicDevices/briar-presence/pull/14) as a
separate desktop change, and [PR #13](https://github.com/DynamicDevices/briar-presence/pull/13)
as a separate build change. Record each actual reviewed commit and its result;
this checklist is not approval. The earlier state-only review scope below
does not approve either addition.

- Desktop: `application_menu.gd`, `about_window.gd`, `settings_window.gd`,
  `study.gd`, input routing and inspection tests; verify hidden application
  actions, no quit-on-preference change, passive centred name and focus/close.
- Launcher: `launch-godot.mjs` and `godot-launch.test.mjs`; check real socket
  detection, explicit backend options, honest X11 warning, no silent retry
  after Wayland failure, and unchanged finite smoke/check behaviour.
- Build: `.github/workflows/desktop-builds.yml`, `build-desktop-ci.mjs` and
  `desktop-build.test.mjs`; verify exact trusted DD runner/ref guards, no PR
  execution/secrets, pinned downloads, source/notices, generated app name,
  unchanged strict archive validation and honest unsigned/cross-export limits.
- Both: trace scripts to export/package inventories, review failure handling,
  preserve synthetic-only data and distinguish native evidence from test counts.

[Native findings](Godot-Wayland-Resize.md) include successful resize-flashing
avoidance but failed stay-above and dialog sizing on Wayland. Do not approve a
complete desktop replacement while those remain unresolved. Independent review
can record findings; green CI and Alex's visual preference are not that verdict.

### Earlier API review scope

Overlay recording candidate: also review [the Godot adapter and fixture
correction](Godot-API-Recording.md), its Node/Godot tests and optional launcher
path. This uses a temporary local scene tape, not a selected live transport.
The earlier baseline's claimed final-label behaviour was weaker evidence than
the new actual expired/unknown-state assertions.

Next-step draft additions also need review: `implementation/api/synthetic-producer.mjs`,
its executable example/tests and the separate `design/inspection/0.1-proposal/`
mock-up. Its interaction is proposed, not adopted. Baseline CI evidence below
does not establish review or CI for these later additions; record the actual
new candidate SHA and results when reviewing them.

11 November addition: also review the [embedded integration](Embedded-API-Preview.md),
`implementation/api/embedded.mjs`, `implementation/api/presentation.mjs`,
the embedded and playback tests, and `.github/workflows/offline-tests.yml`.
The implemented and CI-tested source candidate is
`3748f9303e8a34b317ce2c8a76f46e5d7584305f`.
[CI run 42932532228](https://github.com/DynamicDevices/briar-presence/actions/runs/42932532228)
passed all 73 tests without failures, skips or cancellations. Later documentation
corrections do not change that source identity. Record the exact commit you
actually review; earlier state-only hashes do not approve the added adapter.

This review covers the offline state handler and synthetic embedded API-to-face
integration, not all of
[PR #2](https://github.com/DynamicDevices/briar-presence/pull/2), its Godot host
or its installation. The original offline baseline is
`834fb703245ba578d1a80e225b6d5d8265feed8e`.

Read these in order:

1. [Agreed meaning and scenarios](Visual-Language-Vocabulary.md) and the
   [eleven semantic fixtures](../design/api/0.1-draft/fixtures.json).
2. [State-handler boundaries](../implementation/core/STATE.md), then
   [the handler](../implementation/core/state.mjs).
3. [Executable assertions](../implementation/test/state.test.mjs) and
   [the test-only schema oracle](../implementation/test/helpers/schema_oracle.py).
4. [Briar's self-review findings and repairs](Local-State-Review.md).

The source hashes in the findings page identify the tested candidate. Record
the actual commit being reviewed; if those files change, identify and review
the changed source rather than assuming this package approves it.

## Questions to check

- Do the assertions implement the agreed eleven scenarios, rather than merely
  bearing their names? The findings page maps each scenario to actual checks.
- Can reordered/conflicting updates, old sessions or invalid references change
  accepted records? Does a rejected snapshot leave concern retention atomic?
- Does stale or omitted information remain visibly uncertain, rather than
  becoming success, idle or resolution? Is concern freshness independent of work?
- Can acknowledgement ever resolve a concern or mark a later unseen revision
  acknowledged? Does meaningful-change attention survive intervening cosmetic
  revisions without making those cosmetic revisions noisy?
- Can evidence or a producer suggestion close a user-raised concern without
  explicit user closure? Can old producer facts undo that closure?
- Are significant/critical and time-sensitive cues grouped without focus theft,
  unlimited grouping-window extension or obsolete withdrawn items?
- Does reconnect adopt current accepted focus without replaying superseded
  choices? Are actors/workspaces/producers isolated at the model boundary?
- Are trusted host contexts clearly assumptions, not authentication proof?
  Are deployment limits and conservative implementation proposals explicit?
- Does acknowledgement suppress a queued or active attention cue while leaving
  the unresolved concern visible? Does stronger motion expire without replay?
- Are provisional impact, confirmed impact and source expiry understandable in
  the preview, without relying on colour alone? Do reduced motion and brightness
  preferences remain respected?
- Does the workflow retain read-only access, exact-source checkout and no-secret
  isolation, without claiming CI is independent application review?

## Run locally if useful

The embedded integration candidate passed **73 tests with none failed/skipped/cancelled**
using Node `24.22.1`, Python with `jsonschema 4.19.2`, and the existing
`@napi-rs/canvas 0.1.100`. No local dependency was installed for this work;
the isolated CI job installs its locked test dependencies in ephemeral storage.

From `implementation/`, run `npm test` with `BRIAR_CANVAS_MODULE` set to the
absolute path of the existing Canvas module. Without that variable, the current
suite skips its Canvas checks: such a run is not full-suite rendering evidence.
For state-only inspection, `node --test test/state.test.mjs` is sufficient, but
it does not replace the full suite. The oracle requires the existing Python
`jsonschema` installation and asserts the documented draft timestamp profile.

## Record the result

Record reviewer, exact commit/source identities, reviewed scope, findings with
file/line and impact, dispositions, commands/results and untested areas. State
whether the offline candidate needs correction or is acceptable within its
documented scope. Do not infer approval of the whole desktop host or installation.

No reviewer result is filled in here on Alex's behalf. Local independent review
does not manufacture a CI result, authorise a merge or issue a hardware-signed
fallback grant. Those remain separate gates where required.

Assisted-by: Briar
