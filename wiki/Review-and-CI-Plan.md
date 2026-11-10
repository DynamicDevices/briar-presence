# Review and CI plan

[Wiki home](Home.md) · [Current progress](Progress.md)

## Current direction — local review, 10 November 2026

Alex changed the route: “we can do local review as we are having problems with
preloop - carry on with the work”. Local review is now the next step; the
Preloop setup proposal below is deferred, not an activation prerequisite for
continuing the already covered offline implementation work.

The current local review is **self-review by Briar**, with source inspection,
failing regressions for demonstrated defects, fixes and full-suite retesting.
It is not an independent reviewer or a successful Preloop result. See the
[local findings and evidence](Local-State-Review.md).

Alex selected personally performing the independent local review; the
[review package](Alex-Local-Review.md) is prepared, but no verdict is recorded
on Alex's behalf. The [test CI draft](../design/api/0.1-draft/CI-Readiness.md)
is inactive preparation, not workflow activation or new permission.

No service, new review worker, credential, workflow or installed launcher is
changed. The current signed offline grant covers local inspection, repairs,
tests and documentation, but does not admit another reviewer or CI setup.
Accepting a manual fallback in place of the previous delivery gate requires
explicit signed coverage. CI remains a separate open requirement; Alex's
local-review direction does not mean local tests are CI or waive that gate.

## Earlier decision — superseded for the immediate work

Alex selected **Preloop review + test CI** in the desktop MCQ and then asked
to lock in the prepared plan. This records the agreed direction, not a signed
execution grant, an installed workflow or a passed review.

The offline state-handler candidate is signed commit
[`3f1c851`](https://github.com/DynamicDevices/briar-presence/commit/3f1c851)
in [draft PR #2](https://github.com/DynamicDevices/briar-presence/pull/2).
Its local suite passes 45/45 tests, including the eleven agreed state scenarios.
Local tests are not independent review or CI. The renderer and installed launcher
remain unchanged.

## Earlier Preloop setup route — deferred

1. Prepare a separate reviewable setup candidate. Reuse the established generic
   Preloop integration only after checking exact source and applicability;
   never copy another project's credentials, bindings, signatures or permissions.
2. Run offline tests in isolated GitHub Actions jobs with read-only source access
   and no review, publication or deployment secrets. Include the schema and
   Canvas regressions, reproducible dependencies and current supported actions.
3. Admit a repository-bound Preloop reviewer with a fixed approved model/prompt,
   native read-only clone and exact checkout, enforced runtime cutoff and no
   GitHub-writing credentials or tools. Bind service-created IDs before use.
4. Keep publication separate. Trusted default-branch orchestration must verify
   repository, head, base, complete diff, challenge, owned execution and signed
   policy. Publish complete readable findings, then independently read them back
   alongside the genuine Actions-backed review check. No manufactured statuses.
5. Review and explicitly approve the first-installation procedure and completion
   mechanism before activation. A new workflow cannot already be its own
   installed gate. Alex merges the reviewed setup; PR code never runs with
   review or publication secrets.
6. Respect the stacked PR dependency order. Alex retains baseline and application
   merges. Changed head/base/diff requires newly bound review evidence; no
   force-push or implicit retargeting/merge permission.
7. Arm authenticated completion before a review, validate startup once, then
   await the event. No model polling or competing review triggers. Diagnose
   failures and recover completed results where possible; do not automatically
   repeat failed paid reviews. Self-review never becomes independent approval.
8. Record findings, corrections, exact-source CI/review evidence and remaining
   limits in the wiki and relevant issues. Close only acceptance that is proved.

## Unissued Preloop setup proposal — deferred

The prepared approval draft stays outside the public repository because it is
an operational approval artifact, not source or evidence of issued authority.
It proposes a 24-hour window from issuance; no window starts merely by recording
this plan.

Before hardware signing, finish the concrete setup candidate and offline
regressions, check supported service capabilities, name the actual model,
runner, prompt/configuration hashes, credential custodian and publication
identity, and explain the bootstrap security trade-off. The GitHub-hosted
status/OIDC completion reference requires specific approval; the documented
owned HTTPS/HMAC route is not silently replaced. No sibling's live acceptance
or permission transfers to this project.

The final canonical proposal must contain the complete resulting scope, exact
resources/subjects/hosts, nonce, verifier, revocation binding and displayed expiry.
Preserve the existing signed offline grant. Obtain and independently verify new
hardware-backed coverage before any newly excluded operation; do not combine
grants or treat this page as authority.

## Boundaries retained

No live API/listener, real harness/producer data, application installation,
startup service, physical device/VR work, preference sync, production deployment,
branch-protection changes, unrelated access, upstream changes, agent merge,
destructive history edits or automatic paid retry cycle. Reviewer access is
read-only; publisher rights are separately restricted to this repository.

The goal is still incomplete until the applicable review acceptance and CI are
verified against the actual candidate under the selected, authorised route.
Recording a plan or completing self-review does not clear those gates or alter
the installed display.

Assisted-by: Briar
