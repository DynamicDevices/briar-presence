# Local offline state review — 10 November 2026

[Wiki home](Home.md) · [Review plan](Review-and-CI-Plan.md)

## Scope and result

Alex asked to continue with local review because of problems with Preloop.
Reviewer: **Briar, reviewing their own implementation**. This is self-review,
not independent approval, a Preloop result or CI.

Scope: the isolated offline handler, its schema-validation test bridge, the
eleven semantic scenario bodies and directly affected regressions. This is not
a complete review of the Godot/Electron hosts or all of stacked PR #2.
Review input was head `54d1cf088acef52d6e5a6c5dd22db7af34d2f381`, with offline
changes relative to `834fb703245ba578d1a80e225b6d5d8265feed8e`.
The current PR base branch remains `work/desktop-presence-20261110`, observed at
`f3a24de202bd7c4f5d1327486c46dfd05163b49f`.

The original scoped diff SHA-256 (Git diff, the three code/test files below) was
`d89c7a808044419c2991d52ede5160192536ec1f5af41534712a5ae57e7a6ad7`.
Three initial defects were reproduced by failing regressions, then repaired.
A follow-up against `da8b572f710b036467f6dcfdd9e382093d2f0274` reproduced and
repaired the acknowledgement-history defect below. Current local full-suite
result: **49 tests passed; zero failed, skipped or cancelled**.
Existing Canvas reference checks are included. No renderer/host/launcher changed.

## Findings and dispositions

| Finding | Impact | Repair and evidence |
| --- | --- | --- |
| Medium: omitted resolved records lost their revision/origin fence | An older concern could reappear as new, or change origin after disappearing from the visible snapshot | Keep validation history separate from visibility. Regression rejects stale revisions and origin changes after omission, preserves known revision acknowledgements and accepts an identical resolved record without a new cue |
| Medium: response-target changes were ignored | A time-sensitive request moved to different work could stay quiet despite a changed response need | Include work/concern references in the normalised request signature. Regression retargets an unchanged question and verifies a renewed cue without inflating severity |
| Medium: response changes for retained omitted concerns were ignored | A newly required response to an acknowledged concern could be missed when that concern's record was omitted | Compare requests for retained open concerns as well as newly supplied records. Regression verifies renewed attention, unchanged concern observation/report time and quiet repetition |
| Medium: cosmetic revisions hid a prior acknowledgement from later cue decisions | A previously acknowledged minor concern could stay quiet when its response needs later changed | Use scoped acknowledgement history for cue eligibility, while keeping exact-revision acknowledgement in the view. Regression checks both supplied and omitted concerns, quiet cosmetic updates, no silent acknowledgement of unseen revisions and no stronger default cue for an unacknowledged minor concern |

The first two failures are captured locally in
`implementation/test-artifacts/local-review-red-tests.log`; the third in
`implementation/test-artifacts/local-review-omission-red-tests.log`. Those red
runs are not passing evidence. The final full-suite log is
`implementation/test-artifacts/local-review-full-tests.log`.
The acknowledgement-history failure is captured in
`implementation/test-artifacts/local-review-ack-history-red-tests.log`;
the current 49-test result is in
`implementation/test-artifacts/local-review-ack-history-full-tests.log`.

## Requirement-to-test inspection

These are real assertions in `implementation/test/state.test.mjs`, not just
matching scenario names. The fixtures remain synthetic.

| Agreed scenario | Assertions checked and boundary |
| --- | --- |
| Critical managed versus harmless blocked | Provisional critical severity, no invented response, ordinary Needs you without time sensitivity, only critical concern queues stronger attention |
| Minor but time-sensitive | Severity remains minor, timing need does not require an invented exact deadline, request causes the stronger cue |
| Success does not resolve | Work succeeds while concern stays open; missing severity is unassessed; acknowledgement keeps a steady cue and supplies no resolution |
| Omitted concern | Changed work is accepted; retained concern keeps revision/observation/report time; repeated omission stays quiet; retries do not renew the lease |
| Stale important task | Last-known significant concern stays open/stale; work does not become success or failure; another producer remains independently current |
| Combined arrivals | One bounded-window semantic announcement contains both concern IDs; each stays inspectable; focus is unchanged; later flush does not repeat it |
| Confirmed acknowledged critical | Confirmation renews attention, preserves acknowledgement history, does not silently acknowledge a newer revision and repeated confirmation is quiet |
| User-raised resolution | Untrusted origin is rejected; relevant evidence and a suggestion remain inspectable without closure; producer resolution is rejected; only trusted user closure resolves; stale producer facts cannot undo it |
| Shared user focus/acknowledgement | Two contexts for the same synthetic user/workspace read shared accepted state; acknowledgement is not resolution; other users/workspaces cannot read it |
| Superseded reconnect focus | Old expected-view revision conflicts; read returns current accepted focus with no reconciliation prompt; no transport or actual offline-client recovery is implemented |
| Structurally valid but unauthorised | Schema-valid input can still fail actor/scope, concurrency and reference checks without exposing unrelated records; host authentication itself is assumed |

Additional regressions cover snapshot revision conflicts, exact retries,
generations/session reuse, future observations, atomic rejection, cycles,
progress bounds, meaningful versus cosmetic changes, older acknowledgements,
fixed grouping windows, unsupported required features, withdrawn queued cues,
prototype-looking IDs, copied values and validator failures.

## Exact repaired source identities

SHA-256 values after repairs and the final full-suite run:

| File | SHA-256 |
| --- | --- |
| `implementation/core/state.mjs` | `d9ecf7e38ab28dcd93efe0018e12dc3c78584b4a12830f7bee2399977d4e71ff` |
| `implementation/test/state.test.mjs` | `91212c90f6f342fcc8da772c900bb1782a47435e11fc45f52dcd3a827695e1d5` |
| `implementation/test/helpers/schema_oracle.py` | `8c95ba1774cbc4c336e0958926370eb516ad9c7c2f2c93a30805a88aa6ee7623` |

Command: from `implementation/`, run `npm test` with the existing bundled
`@napi-rs/canvas` module selected through `BRIAR_CANVAS_MODULE`.
The Python oracle asserts the draft date-time profile using existing
`jsonschema`; no dependency was installed. Source identity is evidence of what
was checked, not a claim that another reviewer independently checked it.

## Still open

No new worker, paid review, workflow, credential or service was launched.
The earlier Preloop setup plan is deferred. Accepting a local fallback requires
the applicable signed coverage; self-review alone does not prove the independent
review requirement. No CI result is claimed. Broad issue acceptance stays open.

No live authentication, display sync/delivery, persistence, resource/retention
bounds, rendered attention, reduced-motion integration or human glance/readability
acceptance was proved. Validation history is intentionally retained in this
finite offline model; a deployed retention policy still needs design.
The existing user-closed revision restriction and retained missing-work policy
remain documented implementation proposals, not newly selected product rules.

Assisted-by: Briar
