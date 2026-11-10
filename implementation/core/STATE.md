# Offline state handler

`state.mjs` is a deterministic, platform-independent prototype. It is not wired
to a renderer, desktop host, listener or Briar harness. All scenario inputs and
identities in the tests are synthetic.

## Host boundary

Create a handler with explicit `userId`, `workspaceId`, synchronous schema
`validate(message)` returning `{valid: true}` only on success, and `policy`:
`epochMs`, `observationTtlMs`, `futureSkewMs`, `groupWindowMs`. These durations
are injected experimental values, not selected product defaults. Each operation
receives explicit monotonic milliseconds relative to the epoch.

The host admits producers with `admitProducer` and must authenticate contexts
before calling `receive`, `read`, `flush` or `resolveConcern`. Context fields are
not credentials. The tests cannot prove a real host performs these checks.
`userRaisedConcernIds` is trusted host provenance, never a producer-supplied
permission. A schema validator is mandatory; exceptions fail closed. This core
supports no required extension capabilities yet: nonempty `requiredFeatures`
rejects with `UNSUPPORTED_FEATURE`. Optional extensions remain inert data.

`receive` accepts the three draft message kinds: snapshots, focus and
acknowledgement. Snapshots are checked atomically for revisions, references,
scope, generation, observation times and concern provenance. Exact retries do
not renew a producer lease. Rejected messages cannot partly update records;
valid explicit time still advances even on semantic rejection.

`resolveConcern` is a separate trusted UI operation for explicit user closure
of user-raised concerns; it does not add a public wire message. `read` returns
copies of accepted facts, freshness, focus, acknowledgements and semantic cue
descriptions. `flush` emits grouped semantic announcements once their fixed
window expires. It does not implement animation, motion preferences or delivery.

## Behaviour and remaining design choices

- Omitted open concerns persist with an omission warning and their original
  observation time. Success in work does not resolve a concern.
- Acknowledgements name an exact known revision, preserve history and never
  resolve a concern. Old acknowledgements cannot silence newer pending cues.
- New significant/critical concerns and time-sensitive requests receive grouped
  brief-then-steady announcements. Confirmed provisional-critical impact and
  changed impact/response needs can renew attention. Withdrawn requests,
  downgraded new concerns and retracted confirmations lose obsolete pending cues.
- Text comparisons normalise whitespace, not meaning. This is a deterministic
  approximation requiring further product review, not semantic understanding.
- Missing nonterminal work is retained as last-known metadata with unknown
  freshness, not inferred completion. This is a conservative implementation
  proposal, not a separately selected user rule.
- A newer producer revision for a user-closed concern currently rejects with
  `USER_CLOSED_REVISION_CONFLICT`. Reopening needs design; this conservative
  restriction is not an agreed product rule.
- One handler models a single user/workspace's accepted focus and acknowledgement.
  Reconnect reads current state; old expected-view revisions conflict rather
  than replay. No actual multi-display transport or persistence is implemented.
- Retention, resource limits, live authentication, delivery guarantees, reduced
  motion, rendered cues and cross-language implementation remain open.

## Evidence

From `implementation/`, run `node --test test/state.test.mjs`. Tests use native
Node tests and existing system Python `jsonschema` through
`test/helpers/schema_oracle.py`; no dependency was installed. The helper asserts
the draft's explicit date-time profile and never fetches a remote schema.

The full existing suite, with the existing bundled Canvas dependency selected
through `BRIAR_CANVAS_MODULE`, passed 45/45 tests on 10 November 2026. This
includes eleven executable semantic scenarios, all 21 schema fixture outcomes,
additional state regressions and existing rendering checks. See
`test-artifacts/offline-state-full-tests.log` locally. The test-name coverage
check alone is not requirement proof; the scenario bodies contain assertions.

These are local checks, not independent review, CI, visual acceptance or release
approval. Required review/CI and issue updates remain delivery gates.
