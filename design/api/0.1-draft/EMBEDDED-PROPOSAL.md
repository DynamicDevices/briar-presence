# First API integration — embedded-first working proposal

Alex asked Briar to continue without questions overnight and make sensible
assumptions. **Embedded-first is a reversible working assumption**, not a settled
transport decision or permission to activate a listener. It will be included in
the scheduled follow-up. This page is a proposal, not implemented integration.

## First demonstrable result

A synthetic caller submits a snapshot through a documented library boundary.
The real schema validator and state handler accept or reject it. The accepted
view drives the existing light model through a separate presentation adapter.
Inspection explains work, concerns and response needs. Acknowledgement, explicit
closure, omission, stale observations and superseded focus retain their tested
meaning. No fabricated work progress or real harness data.

```text
synthetic caller
  -> host-owned validation and admission
  -> existing deterministic state handler
  -> portable semantic display view
  -> presentation adapter + user preferences
  -> existing scene generator / renderer + accessible explanation
```

The core still receives explicit clock/scope/generation inputs and performs no
OS, network or renderer operations. The integration host owns its actual clock,
schema validator and trusted identity boundary. Demo admission is visibly
synthetic, never proof of real authentication.

## Why start here

Embedding exercises the contract and display without opening a port, choosing a
server/authentication stack or inventing subscriptions. JSON Schema and ordinary
JSON records are reused, not a new framing protocol. The library API remains a
custom application contract; no HTTP/OpenAPI conformance is claimed.

HTTP and local IPC remain future adapters over the same meaning, not rejected
product directions. A local HTTP server would be easier for independent clients
but would introduce listener lifecycle, origin/access controls and authentication
before this milestone needs them. IPC is useful across host processes but needs
framing and ownership choices. Neither is assumed or silently implemented.

The first reference host can be JavaScript. Godot cannot import that library
directly: future hosts need a port or adapter, validated against the same JSON
fixtures. This does not promise a C ABI, new Godot runtime or cross-language
equivalence already proved.

## Keep facts separate from appearance

The present renderer accepts seven demo labels. Those labels alone cannot encode
concurrent work, stale sources, acknowledged concerns and response requests.
Do not flatten the accepted state into a single “health” colour.

| Display view must preserve | Presentation constraint |
| --- | --- |
| Focused work and background work IDs | No focus theft; important background concerns remain discoverable |
| Concern severity, provisional assessment, observation freshness and omission | Unknown is not quiet/healthy; uncertainty is explained, not painted as confirmed harm |
| Exact-revision acknowledgement and open/resolved lifecycle | Acknowledgement never clears the steady concern cue or resolves work |
| For awareness / Needs you / Time-sensitive requests, timing basis and delay consequence | Concern is not automatically a request; waiting for a user is not automatically time-sensitive |
| Grouped semantic announcements with item references and reasons | Brief stronger treatment then steady; no replay each frame or indefinite red cycling |
| Current accepted focus/view revision | Reconnect adopts current accepted state, not an old queued choice |
| User brightness/reduced-motion preferences | Preferences bound all animation and colour intensity, including stronger attention |

A presentation view is data, not authority. It must retain inspectable IDs/reasons
even when lights summarise several items. Text explanations must be safe plain
text and must not navigate or execute evidence/extension content.

Exact light-group mappings are deliberately not frozen overnight. Preserve the
accepted seeded movement and face gatherings; add semantic presentation through
an adapter rather than rewriting the visual model. If its existing inputs cannot
express concurrent cues faithfully, record the necessary interface change and
test it explicitly instead of claiming the old seven-state enum is sufficient.

## Proposed embedded surface

Expose a small host-owned facade over the existing operations, not their mutable
internals: supported draft capabilities; admitted producer snapshot submission;
accepted-view reading; user focus/acknowledgement; and trusted explicit closure.
The existing three wire message kinds stay unchanged. User closure remains a
trusted host/UI operation until its public contract is separately designed.

Never accept a producer-chosen actor, workspace, generation or
`userRaisedConcernIds` as authority. Host bindings come from outside wire data.
Copy accepted output; reject unsupported required capabilities explicitly.
Do not advertise persistence, subscriptions, real authentication or display-sync
capabilities the implementation does not have.

The test-only Python oracle is not a browser/runtime validator. The integration
must either validate in the trusted Node test host using existing tools or obtain
approval for a maintained runtime validator. Do not carry Python subprocesses
into the pure core or quietly replace JSON Schema with a partial hand validator.

## Acceptance sequence

1. Finish Alex's source-bound local review and resolve findings; obtain the
   applicable signed local-review/integration and CI coverage.
2. Agree or adjust this boundary before its implementation. Keep draft setup
   and dependency preparation distinct from activated CI.
3. Prove one real-schema -> accepted-state -> presentation -> rendered-frame
   path, not a parallel fake state implementation or hardcoded screenshot.
4. Exercise new concern, acknowledgement, meaningful change, user closure,
   omission, stale source, grouped arrivals and superseded focus through that
   same boundary. Invalid/cross-scope inputs must not affect displayed facts.
5. Check semantic fields and accessible explanations independently of pixels.
   Verify actual colour/motion changes and bounded announcement consumption;
   keep seeded reference coverage and user preference overrides.
6. Run the isolated full test suite in real CI against the exact candidate,
   with Canvas checks executed. Record genuine check and source identities.
7. Update wiki/issues with actual evidence. No install, live harness connection,
   public endpoint or agent merge follows by implication.

## Questions retained for Alex's return

- Confirm embedded-first or choose HTTP/IPC for the first integration.
- Review any concrete multi-concern/light-group treatment before calling it
  accepted visual language. Do not invent a redesign in the meantime.
- Complete the chosen local review and the separate signed setup/integration
  approval; a scheduled MCQ is not hardware-backed permission.

Assisted-by: Briar
