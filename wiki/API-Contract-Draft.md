# Input contract — first design draft

[API review](Visual-Language-API.md) · [Vocabulary and selected decisions](Visual-Language-Vocabulary.md)
· [Issue #5](https://github.com/DynamicDevices/briar-presence/issues/5)

Prepared after Alex selected the visual-language MCQ choices and instructed
“lock this in and lets carry on”. The selected presentation rules are requirements;
the records, names and operation semantics here are proposals. This is a design
document, not executable schemas, endpoints, authentication or a running service.

## Boundary

Producer facts → validated scoped snapshot → accepted work/concern view →
meaning/attention policy → locally animated scene → platform renderer.

Keep user focus/acknowledgement and local display preferences alongside, not
inside producer-owned truth. Read the selected decisions separately: no incoming
message may directly command particle positions, red flashes or automatic focus.
The existing synthetic renderer contract remains unchanged during design.

## Proposed records

| Record | Suggested content | Ownership |
| --- | --- | --- |
| Producer binding | Authenticated producer, user/workspace, allowed records/features | Established by the host's future authentication mechanism; not trusted from payload |
| Session | Consumer-issued generation/fencing token, revision stream and lease | Consumer controls admission/takeover; producer supplies updates in that session |
| Work | Stable ID, label, lifecycle, activity, waiting reason, result/evidence, optional parent/group | Scoped producer; IDs stable across restarts |
| Concern | Stable ID, related work, origin, explanation/impact, lifecycle, evidence and revision | Authorised concern owner; asserted origin is not proof of user authorship |
| Response request | Stable ID, related item, question/choices if applicable, intended respondent, open/withdrawn/answered state | Producer owns request; user response is separate from execution authority |
| User view | Selected focus, acknowledgement receipts, last-inspected change cursor, optional snooze | Authenticated user, isolated from other users |
| Display preferences | Motion/brightness/privacy settings and local surface capabilities | User/platform; producers cannot override |

Use scoped IDs such as `(workspace, producer, id)`; do not assume a short label
is unique. Parent references must be in scope and acyclic. Producer-reported
“user concern” needs an authenticated source/attribution route; arbitrary text
must not impersonate a user. Retain origin separately from evidence confidence.

Work lifecycle and result are independent. A result being available does not mean
success; reported success does not imply user acceptance. A waiting item needs a
reason/party where known and must not stop other work's display. Progress remains
optional, with units/basis rather than invented percentages. No private reasoning.

Concerns distinguish open/resolved facts from user acknowledgement. A resolution
needs an authorised actor and reason/evidence; successful work alone cannot supply
it. Reopening preserves history. Concern revisions let the consumer identify what
was acknowledged. Alex selected a brief renewed cue for changed impact or response
needs, not for repeated/cosmetic updates; acknowledgement history is preserved.
Response requests must not be inferred solely from concern severity.

## Snapshot and ordering proposal

1. A future authenticated binding admits one current writer session per producer
   scope. A consumer-issued generation fences off old writers after an explicit
   restart/takeover. A random producer UUID alone does not establish newer authority.
2. Submit a complete snapshot of the records within that writer's ownership, with
   a strictly increasing revision and proposed contract version. Validate the
   whole input before atomically replacing its current accepted view.
3. Retry of the same session/revision with the same canonical semantic payload is
   idempotent. Same revision with different content is a conflict. Older revisions
   and superseded sessions are rejected, not rendered as new events.
4. Work or concern IDs owned by another producer, invalid references/cycles,
   unsupported required features and invalid values reject the entire snapshot.
   The previous accepted facts remain, with an explicit input error/health cue.
5. Omission cannot imply completion or resolution. Alex selected retaining any
   omitted open concern with a consumer-generated source-omission warning while
   accepting an otherwise valid snapshot. Preserve its last-known source revision,
   content and observation time: omission does not refresh it, resolve it or claim
   the source reported it again. Work freshness can advance independently.
   Apply the snapshot and retained-concern warning atomically. This explicit
   reconciliation rule does not permit partial acceptance of malformed fields,
   ownership violations or other invalid input. Retain referenced work's last-known
   identity if needed for inspection, distinct from currently reported activity.
   Repeated omissions do not reannounce the same warning. Nonterminal work
   withdrawal, tombstones and retention still need review; disappearance cannot
   mean success or hide an unresolved concern.
6. Terminal records may move out of the current view only under an explicit
   retention/deletion policy. Keep enough ID/revision history to prevent late
   messages resurrecting old records; privacy deletion needs a bounded policy,
   not indefinite payload retention.

Canonical semantic equality and its hash algorithm are not selected here. Define
normalisation, optional/default fields and number handling before implementing
idempotency. Server restarts need session persistence or explicit re-admission;
do not silently trust old tokens or reset ordering into acceptance of old writes.

## Freshness proposal

Record consumer receipt time independently from producer observation time.
Use a consumer-controlled lease and monotonic local time to detect missing
updates during a run; producer timestamps are evidence, not permission to extend
freshness arbitrarily. Reject/qualify implausible future timestamps and define
clock-skew tolerance. Exact bounds and renewal operations remain to be specified.

A lease expiry changes observation freshness, not reported work outcome or
concern resolution. Preserve last-known facts with their age. Each producer can
be stale independently. A reachable producer can still report unknown work.
After consumer restart, show unknown until current state is re-established unless
a reviewed persistence/time model can justify retaining freshness.

## Interaction and attention requirements

- User focus chooses the clearest work grouping; other work has a quiet summary.
  Important background concerns remain discoverable. A producer cannot steal focus.
- Keep response-needed distinct from concern severity. Facts describe impact,
  requested respondent and any evidenced deadline; presentation applies user limits.
- Acknowledgement stores who saw which concern revision. It stops repeated pulses,
  not the steady visible concern cue, and changes neither lifecycle nor authority.
- Last-inspected cursor is not acknowledgement or resolution. On deliberate
  inspection show unresolved requests/concerns, then meaningful changes since
  the previous cursor. Define first visit, reset, missing history and unavailable
  cross-device history honestly; do not promise a summary of lost events.
- New stronger attention may have a brief bounded motion/colour announcement,
  then a steady cue. No flashing or unattended-time escalation; user accessibility
  preferences win. For an acknowledged concern, Alex selected a brief new cue
  when impact or what the user needs to do changes: increased impact, a changed
  decision/request or another materially changed response need. Explain what
  changed and preserve acknowledgement history. Other evidence changes remain
  inspectable without automatic announcement. Repeated identical updates and
  cosmetic edits never reannounce. Exact timing/colours and technical
  material-change comparison still need specification.
- Face gathering expresses recognisable presence, not health/listening/resolution.
- Local settings and status input cannot grant producer-system execution rights.
  Any future answer/action API needs its own authority boundary.

## Illustrative payload fragment — not a schema

The authenticated workspace/producer binding is intentionally not established by
this object. Session and field names are provisional. Arrays below illustrate
one complete small view; they are not a real request or deployed protocol.

```json
{
  "contractVersion": "0.1-draft",
  "session": "consumer-issued-session",
  "revision": 7,
  "work": [
    {"id": "cedar", "label": "Cedar checks", "lifecycle": "finished",
     "result": {"outcome": "succeeded", "summary": "Checks passed"}}
  ],
  "concerns": [
    {"id": "compatibility", "revision": 2, "workId": "cedar",
     "origin": "producer", "lifecycle": "open",
     "summary": "Checks do not cover the compatibility question"}
  ],
  "responseRequests": [
    {"id": "choose-next", "workId": "cedar", "state": "open",
     "summary": "Which compatibility target should be checked next?"}
  ]
}
```

Expected meaning: successful finished work, an open concern, and a question for
the user. It is not “everything resolved”. A user's acknowledgement would be a
separate interaction record, not an edit that the producer inserts into this
snapshot. This fragment omits fields whose formats are not decided; it is not
claimed to pass a validator.

## Proposed failure examples

| Input/change | Expected semantic result |
| --- | --- |
| Revision 6 after accepted 7 | Reject as stale; do not roll back facts or freshness |
| Different payload retry at revision 7 | Conflict; no partial update |
| Old session after takeover | Reject fenced writer |
| Otherwise valid snapshot omits open compatibility concern | Accept other valid changes atomically with retained concern/source-omission warning; concern freshness does not advance |
| Snapshot omits concern and also contains invalid/unauthorised work | Reject entire snapshot; omission reconciliation is not general partial acceptance |
| Repeated omission retry | Same retained concern/warning; no repeated attention or invented observation |
| Concern points at another user's work | Reject; do not disclose that work's existence |
| Unknown optional namespaced extension | Apply documented safe fallback; never reinterpret core meaning |
| Unsupported required extension/version | Explicit incompatibility; do not claim healthy idle |
| Invalid/oversized/rate-excess input | Explicit bounded rejection; existing view remains subject to normal freshness |
| Concern acknowledged, unchanged | Steady visible cue, no repeated announcement; remains open |
| Acknowledged concern changes impact or requested response | Brief bounded cue, explain change, preserve history and steady cue |
| Evidence changes without changing impact/response need | Inspectable evidence; no automatic renewed cue |
| Consumer lacks change history | Explain the gap and show current view, not a fabricated since-last-visit summary |

## Transport, errors and compatibility

Specify a transport-neutral data model and operations first: capability discovery,
snapshot replacement and accepted-view reading. Acknowledgement/focus/preferences
are distinct user operations. HTTP/OpenAPI, embedding or IPC remain candidates;
OpenAPI/JSON Schema tool/version support needs checking before pinning a dialect.
For HTTP, RFC 9457 is the proposed error envelope: include safe field/error codes,
correlation and retry guidance, not traces, secrets or other users' identifiers.

Capabilities need actual supported versions/features/limits. Namespaced optional
extensions have documented fallbacks; required features need explicit support.
Unknown core enums must not silently become “quiet”. Distinguish safe optional
field evolution from incompatible semantic changes; no version scheme is frozen.

Subscriptions are deferred until justified, not silently selected. If adopted,
define event IDs, resume windows, gap recovery via fresh snapshot, atomic snapshot/
stream handoff, bounded buffering/retention and slow-consumer behaviour. Store
meaningful changes for the returning-user view only under an agreed privacy and
retention policy; that UI requirement does not mandate a broker or network stream.

## Remaining work for issue #5

- Specify selected omission reconciliation precisely; review work withdrawal,
  tombstones, ownership and concern-resolution semantics.
- Specify admission/fencing, durable ordering, freshness bounds and retry behaviour.
- Design user-view operations and last-inspected history without assuming sync.
- Define attention/severity terms and technical material-change comparison
  consistent with the selected renewed cue and steady acknowledged cue.
- Produce actual schemas and valid/invalid fixtures after these decisions.
- Select a supported standards/tooling profile with safeguards (#7) and extensions
  (#8); no library, listener or service is adopted by this document.
- Link review, conformance and later human evidence. Issue #5 remains open; this
  draft does not satisfy its schema/test or integration acceptance conditions.

Assisted-by: Briar
