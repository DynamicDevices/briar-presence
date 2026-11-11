# Inactive offline test workflow candidate

This directory is preparation only. `offline-tests.yml.example` is deliberately
outside `.github/workflows`, cannot receive Actions events here, and is not
permission to install, dispatch, merge or change repository settings.

## Candidate contents

- A normal unprivileged pull-request/manual workflow for Ubuntu 24.04 x86_64,
  Node 24.22.1 and Python 3.12. It checks out the exact selected source without
  persisting credentials. Only `contents: read`; no secrets, OIDC or publisher.
- Three official actions pinned to exact commits. Their pinned `action.yml`
  metadata was checked and each JavaScript action uses Node24.
- `canvas/package-lock.json`: npm lockfile v3 for the already-used Canvas
  0.1.100, with registry integrity records, including optional platform packages.
  Generated with `--package-lock-only --ignore-scripts --no-audit --no-fund`.
  **No `node_modules` was installed** in the draft directory.
- `requirements-linux-cp312.lock`: the existing validator dependency versions,
  including transitive dependencies, with PyPI-reported wheel SHA-256 values.
  The rpds wheel is specifically CPython 3.12/manylinux x86_64. Other interpreter
  or architecture combinations are not covered by this lock.
- A preflight that fails when the schema validator or Canvas is unavailable,
  followed by the real full suite with TAP output. Nonzero tests, skipped checks
  or cancelled checks fail the draft job. This avoids a false green caused by
  the existing suite's optional local Canvas skips.

The ten-minute setup-and-test cutoff is a proposed initial guard, with the
local test portion measured separately. It has not been proved suitable on a
GitHub runner or approved for activation. No provider spending quota is invented.

## Checks performed locally

The candidate YAML parses with existing PyYAML 6.0.3; every `run` block passes
`bash -n`. Checks confirm the no-secret permission shape and exact action pins.
The pinned Python dependency closure satisfies the existing installed metadata
when evaluated for Python 3.12. Registry lock entries all have integrity hashes.
Canvas preflight succeeds using the already-installed module and fails with an
intentionally missing module. No dependency was installed for these checks.

The exact proposed Node/TAP command is checked locally with the existing test
dependencies; see `implementation/test-artifacts/ci-draft-command-20261110.tap`
for its reduced test summary: **49 pass, zero fail/skip/cancel, 18.46 seconds**
on this workstation. This is not a GitHub Actions execution or proof
that a fresh runner can fetch/install the locked dependencies.

Not established: actionlint validation, clean-runner dependency installation,
actual runner cutoff enforcement, workflow publication/dispatch, independent
review, or a real Actions check. Treat all of these honestly at activation.

## Source and licence notes

Official action source metadata:

- [checkout](https://github.com/actions/checkout/blob/3d3c42e5aac5ba805825da76410c181273ba90b1/action.yml)
- [setup-node](https://github.com/actions/setup-node/blob/249970729cb0ef3589644e2896645e5dc5ba9c38/action.yml)
- [setup-python](https://github.com/actions/setup-python/blob/ece7cb06caefa5fff74198d8649806c4678c61a1/action.yml)

Dependency metadata was read from the public npm registry and PyPI version JSON
endpoints. Canvas and the Python packages use MIT licensing except
typing-extensions (PSF-2.0), according to the inspected version metadata. These
are test-only inputs, not application packaging or a complete distribution
licence/SBOM assessment. No validator format extras or new rendering toolkit
are introduced. The existing explicit draft date-time checker is retained.

## Before activation

Alex reviews the concrete candidate and grants the separately required signed
CI/setup scope. Install through the reviewed manual-merge workflow, validate
against the actual eligible PR source, verify dependencies on the clean runner,
and record the genuine check URL, tested commit and zero-skip result. Do not
copy this into a privileged event context or supply review/publication tokens.

Assisted-by: Briar
