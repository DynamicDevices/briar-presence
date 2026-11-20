# Development workflow

Alex agreed this workflow on 20 November 2026:

1. Briar prepares a coherent change, tests it and pushes a pull request.
2. The existing DD Preloop GitHub App flow reviews the exact revision; repository CI runs normally.
3. Briar reads the findings, fixes demonstrated issues, runs the relevant tests and pushes the correction. Review and CI run again for the new revision.
4. GitHub merges only after the required Preloop review and CI pass on the current revision and base.

Briar owns ordinary repairs. Alex should not have to trigger reviews, manage
publisher tokens or fix review findings on Briar's behalf. A decision or access
outside the agreed project scope still comes back to Alex.

## One native review route

Use Alex's configured DD Preloop flow and its installed GitHub App. The review
worker stays read-only; Preloop's controller publishes the validated review and
commit status. There is no separate publisher workflow, callback host or dispatch
token. Do not create competing manual review triggers.

The merge gate must require both the existing `offline` CI check and the genuine
`preloop/review` status from the Preloop App. Preserve signed commits, an
up-to-date branch, resolved review threads and the repository's other protections.
Enable native GitHub auto-merge only behind those enforced checks; never use an
administrator bypass or treat a skipped, stale or failed review as a pass.

## When something fails

Read the complete findings and check them against source and observed behaviour.
Address every finding, including low-severity findings, and retain the failed
candidate's evidence. Batch related corrections and push a real fix, not an empty
commit or an intentionally introduced defect just to trigger another review.

For a service or publication failure, repair the failing step within the agreed
scope. Recover an already valid review through Preloop's native posting route;
do not run the model again just because its review was not posted. Do not retry
an unchanged failure, weaken the checks or recreate the retired workaround.

## Test the workflow honestly

A configured flow is not proof of a working workflow. Acceptance needs an actual
PR event, native exact-revision review, readable App publication, the genuine
same-revision status, passing CI and the enforced merge result. If a clean run
has no findings, it proves the clean path only; the repair path remains untested.
Keep the actual PR, execution, check and merge receipts with the task record.

This document describes the agreed process, not an authority grant or a claim
that every acceptance step has already been demonstrated. Existing project scope,
credential boundaries and required specialist checks still apply.

Assisted-by: Briar
