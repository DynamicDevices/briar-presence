# Static API schema proposal — 0.1-draft

[Contract discussion](../../../wiki/API-Contract-Draft.md) · [Selected language](../../../wiki/Visual-Language-Vocabulary.md)

Alex selected consequences/recoverability as severity's basis, provisional
severity with explicit uncertainty, consequence-of-delay plus timing basis for
time-sensitive requests, combined announcements for nearby arrivals, and a first
schema covering producer input plus separate focus/acknowledgement records.

These are static design artifacts, not an implemented API or a frozen public
contract. `schema.json` uses JSON Schema 2020-12 with local references only.
`fixtures.json` contains independent schema cases and separate semantic scenarios.
No listener, adapter, reducer, renderer change or producer-system action is added.

## Draft encoding decisions, still subject to review

- `kind` separates producer snapshots from user focus/acknowledgement. Labels
  such as “Needs you” use provisional kebab-case wire values, not new meanings.
- Identity/user/workspace authority comes from a future authenticated binding,
  not payload IDs. Session values and producer references are not credentials.
- `attentionItems` generalises the earlier illustrative `responseRequests` name
  to include awareness-only information. No deployed client is being migrated.
- Missing concern severity means unassessed, never minor. A supplied severity
  requires level, established/provisional assessment, impact and evidence text.
  Provisional language is “Possible critical impact — not confirmed”, not a
  claim of established harm or a fourth severity level.
- Time-sensitive requests need a timing basis and consequence of delay, not
  necessarily an exact deadline. Merely being blocked on the user is insufficient.
  If known, a deadline uses a timezone-qualified RFC 3339 date-time.
- Work observations and concern observations are separate. An omitted concern
  is retained by the future consumer with a source-omission warning; its source
  observation is not refreshed by a fresh snapshot about other work.
- Focus `target: null` means overview. Acknowledgement names the concern revision
  seen. Both use request IDs and expected user-view revisions for future
  idempotency/conflict handling; neither supplies an actor identity or authority.
- Acknowledgement shape has no resolution/action field. Answering questions,
  snooze, resolution authorisation and preference synchronisation are deferred.
  Alex selected explicit user closure of user-raised concerns after evidence;
  producer suggestions/checks cannot close them. Provenance/permission checks
  remain semantic requirements, not schema proof.
- Focus and acknowledgement are shared in real time across authorised displays
  of the same user/workspace. Reconnect adopts current accepted state; superseded
  focus choices are not replayed or offered for reconciliation. Expected-view
  revisions propose conflict detection, not a sync implementation. Preference/
  inspection-history sync is not implied, and offline views must show their limits.
- Confirmation of an acknowledged provisional critical impact is a selected
  exception to the impact/response-change cue rule: briefly announce confirmation,
  preserve acknowledgement history, and keep repeated confirmation quiet.
- Extension keys use a proposed namespace/name convention. Extension objects are
  untrusted data, not executable content; required-feature support is a separate
  semantic check. Unknown core values/properties are rejected by this draft.
- Revision integers are limited to JavaScript's exactly representable positive
  range for cross-language interoperability. Payload/rate/record/queue limits
  are not invented here; they require consumer-capacity work in safeguards.

## What structural validation does not establish

The schema cannot establish truthful impact/evidence, safe text/link handling,
authenticated scope/ownership, uniqueness of IDs within arrays, valid references,
acyclic work parents, completed progress not exceeding total, lease freshness,
session fencing, idempotency, atomic retention, user-view conflicts or whether a
change warrants renewed attention. These need semantic validation and stateful
tests before an implementation is accepted. JSON syntax validity is not enough.

`format` must be asserted by a validator with date-time checking enabled. The
installed jsonschema 4.19.2 lacked its optional RFC 3339 format dependency: an
initial check caught a deliberately bad timestamp being accepted. Do not count
that run as a pass. No dependency was installed. The draft now proposes an
explicit interoperable subset: Gregorian years 0001-9999, timezone required,
seconds 00-59 (no leap-second notation). This is a proposal, not a user-selected
restriction or a claim to accept all RFC 3339 timestamps.

For this finite design check, register a `date-time` assertion that first applies
the schema's timestamp pattern and then parses the value with Python's standard
`datetime.fromisoformat` after normalising `t`/`z` to `T`/`Z` and `Z` to `+00:00`.
Require an aware result and reject `ValueError`; the schema enforces the lexical
profile and the parser checks calendar/time validity. Test valid offsets, invalid
calendar dates, missing timezone and the deliberately unsupported leap second.
This local checker is not a deployed input validator or full RFC 3339 conformance
proof. A production implementation needs an agreed profile and maintained format
validation support with cross-language tests.

Do not
fetch schemas/extensions from arbitrary URLs supplied by clients. Plain text
and extension data must never be executed or automatically navigated.

Semantic scenarios describe expected outcomes; they are now also exercised by
the isolated [offline state handler](../../../implementation/core/STATE.md).
They do not prove a deployed consumer. Two individually schema-valid snapshots can still be
out of order, cross-scope, contradictory or unsupported by capabilities.

Finite validation used system Python with jsonschema 4.19.2, Draft202012Validator,
schema meta-validation and the explicit date-time profile assertion above. All
21 fixture outcomes matched (10 valid, 11 invalid), and the contract page's JSON
example validates. Local documentation links checked were intact. Eleven semantic
scenarios now execute against the isolated state handler with synthetic trusted
contexts. The full local suite passes 49/49 tests after the documented local
self-review repairs; this does not prove live
authentication, display synchronisation, independent review or CI acceptance.

The example corpus is deliberately small and synthetic. It does not complete
all scenarios or issue #5. Standards/tool versions, source admission, persistence,
retention, limits, visual timing and human-readability checks remain open.

Assisted-by: Briar
