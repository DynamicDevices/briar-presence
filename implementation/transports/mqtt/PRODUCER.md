# Producer snapshots, receipts and recovery

This Node host adapter is independent of a particular AI harness. The trusted
host supplies an authenticated, clean MQTT5 client, fixed topic bindings,
`admittedSession`, full synchronous input validator and `makeSnapshot()`.
Snapshots retain the existing `producer.snapshot` / `0.1-draft` input schema.
Admission and generation fencing remain with the accepted-state owner, not the
snapshot, topic token or receipt digest.

`attachProducerClient()` returns:

- `tick()`: when no request is outstanding, validate and copy a current complete
  snapshot. Refuse a different session, non-increasing revision, invalid data
  or local byte overload before sending. `ok:true` here means transport handoff,
  **not application acceptance**.
- `read()`: inspect isolated copies of the accepted revision/snapshot, pending
  snapshot and exact request identity, last application result and rebind flag.
  Acceptance advances only after a matching fixed-route application receipt.
- `retry()`: explicitly resend the exact saved pending bytes, including original
  observation times. Do not rebuild the body from newer observations. Duplicate
  core acceptance is quiet and does not renew the original producer lease.
- `stop()`: detach callbacks and end the client. No internal timer, background
  retry, offline queue or automatic reconnect replay is introduced.

There is one outstanding **application** request per producer. The independent
MQTT in-flight bound still applies. While awaiting a receipt, `tick()` returns
`PRODUCER_AWAITING_RECEIPT` without calling `makeSnapshot()` again. The source
must continue retaining newly raised concerns and current observations in its
own complete state; after acceptance the next tick reads that current state,
not a queue of obsolete snapshots. Do not feed the transport handoff result to
the synchronous embedded sample as though it were a reducer receipt.

## Receipt binding, version 0.1-draft.2

The existing fixed topic remains
`briar-presence/v0.1/<workspace>/out/receipt/<user>/<producer>`.
The bridge does not honour a producer-chosen Response Topic. The receipt is:

```json
{
  "kind": "presence.receipt",
  "version": "0.1-draft.2",
  "request": {"revision": 7, "digest": "<64 lowercase SHA-256 hex characters>"},
  "accepted": true,
  "duplicate": false,
  "code": "ACCEPTED"
}
```

`digest` is SHA-256 of the exact transmitted UTF-8 JSON bytes (without a BOM),
not a separately re-serialised/canonicalised document. It binds the session and
entire body as well as the revision without echoing private labels or session
strings. Whitespace/key-order changes alter correlation, even though the core
can still recognise a semantically identical retry. Preserve original bytes.
This is content correlation, not a signature, identity proof or capability.
The authenticated broker/bridge role and ACLs are still required.

The six fields and the request's two fields are exact. An accepted result needs
a non-null request, `code:ACCEPTED` and a boolean duplicate flag. A rejection
cannot claim duplicate success. Invalid JSON/identity can yield `request:null`
only on a rejected result; it cannot acknowledge a producer's pending request.
The parser refuses unknown fields, retained receipts and older receipt versions.
View/sync envelopes remain `0.1-draft.1`; snapshot inputs remain `0.1-draft`.
Upgrade producer and bridge together—legacy uncorrelated receipts are not safe
acceptance. The bridge checks accepted-receipt wire capacity before reducer
mutation. A later view-publication failure is separate from reducer acceptance;
the correlated accepted receipt remains truthful.

## Ambiguous delivery and restart

A PUBACK, successful publish callback or reconnect cannot advance accepted state.
On disconnect, negative PUBACK or uncertain delivery the pending snapshot is
retained. Reconnect does not auto-replay; the host can explicitly `retry()`.
When the owner had already accepted it, the matching duplicate receipt reconciles
the outcome without renewed cues/leases. Unmatched late receipts, changed-body
receipts and invalid/legacy receipts leave the pending request untouched.

Ordinary definitive semantic rejection keeps the accepted cache unchanged and
permits a corrected, still-unaccepted revision. `STALE_REVISION`,
`REVISION_CONFLICT` or `SCOPE_OR_SESSION` requires trusted host reconciliation/
fresh admission: `tick()` and `retry()` then return `PRODUCER_REBIND_REQUIRED`.
The adapter never fixes this by choosing a different session/generation itself.

This cache is in memory, not crash-durable storage. After process restart the
host must explicitly re-admit/fence a fresh session/generation, construct a new
adapter and send a current complete snapshot. Resetting revision to one in an
old session is not recovery. A fresh session does not discard unresolved
concerns or establish successful completion of omitted work. Durable snapshot/
receipt storage needs a separately specified deployment policy.

Tests exercise the real reducer and schemas through MQTT callback doubles:
PUBACK-versus-acceptance, byte-exact retry, lost/late/duplicate receipts, rejected
cache updates, fencing, restart retention, validation/privacy and receipt
capacity. This is not real broker, cross-host, TLS/ACL or crash-storage proof.

Assisted-by: Briar.
