# Alex's local review

[Wiki home](Home.md) · [Findings](Local-State-Review.md) · [Review plan](Review-and-CI-Plan.md)

Alex selected personally reviewing the candidate locally. This is the review
package, not a record that the review has happened. No new worker is needed.

## What to review

This review is limited to the offline state-handler milestone, not all of
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

## Run locally if useful

The complete candidate passed **49 tests with none failed/skipped/cancelled**
using Node `24.22.1`, Python with `jsonschema 4.19.2`, and the existing
`@napi-rs/canvas 0.1.100`. No dependency was installed for this work.

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
