# Offline test CI draft — inactive

This is a preparation document, not an installed workflow or execution grant.
No CI job, worker, credential or dependency installation has been started.
The current offline grant excludes workflow administration; activation needs
separate verified coverage. Preloop setup remains deferred.

## Proposed isolated test job

Use a GitHub-hosted Linux job on normal pull-request source, with only
`contents: read`, no secrets, no OIDC or publishing access, and credentials
not persisted by checkout. Never execute this job through a privileged
`pull_request_target` context. Pin supported current-runtime actions.

Steps to encode in the reviewed workflow candidate:

1. Checkout the exact candidate and record commit/source identity.
2. Select a supported Node24/Python runtime. The local evidence used Node
   `24.22.1`, Python `jsonschema 4.19.2` and `@napi-rs/canvas 0.1.100`; these are
   observed test versions, not a claim that future runner images contain them.
3. Provision only test dependencies in job-private storage, from reviewed
   pinned/locked inputs. Do not install Electron or launch a desktop engine just
   to run Node's built-in tests. Prepare and validate dependency locks before
   activation; no new dependency lock or install is supplied by this draft.
4. Fail explicitly unless Python can load the required validator and the
   configured `BRIAR_CANVAS_MODULE` resolves and can create a Canvas. Do not use
   Alex's laptop-specific cache path or permit absent Canvas support to become
   a green full-suite result.
5. Run `npm test` from `implementation/`, with that explicit Canvas module and
   the Python validator available. The suite already exercises all eleven
   semantic scenarios, the 21 schema fixture expectations and the existing
   Canvas reference checks. Require expected checks to execute, not skip.
6. Preserve reduced summary and exact-source results as CI artifacts. Use a
   workload-specific enforced cutoff and one trigger owner; observe actual
   setup/test duration before calling the selected cutoff suitable. No model
   polling or recursive workflow dispatch.

## Acceptance before calling CI complete

- Review and explicitly authorise the concrete workflow and dependency setup.
- Validate its permissions, current action runtime/pins, lock reproducibility,
  no-secret execution and missing-dependency failure paths.
- Run against the selected candidate and inspect the genuine Actions result:
  executed test coverage, zero unexpected skips and matching head/source IDs.
- Show that invalid schema/semantic regressions fail the test job; do not add
  fake commit statuses or treat local logs as GitHub checks.
- Keep application merge, baseline dependency order, independent review and
  installed launcher approval separate. Alex merges manually.

The local **49/49** result is useful preparation, not satisfaction of this list.
Current CI completion remains unproved.

Assisted-by: Briar
