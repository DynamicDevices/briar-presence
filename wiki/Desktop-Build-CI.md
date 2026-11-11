# Desktop build CI on DD's runner

The `DD desktop cross-builds` workflow targets the existing shared organisation
runner **dd-esl-proxmox**, using `self-hosted`, `Linux`, `X64` and
`dd-esl-proxmox` labels. It checks the assigned runner name/OS/architecture before
checkout. GitHub's repository-runner API returned an empty list despite Alex's
UI showing this organisation runner shared and idle; the actual job assignment
and successful exports must establish execution, not that incomplete API list.

One job downloads the standard Godot 4.7.2 Linux engine and 1.28 GB export-template
archive, with official release SHA256 pins. Only the three needed release
templates are extracted. Godot state and intermediate exports use a fresh job
directory; no global toolkit, service or installed desktop app is changed.
`setup-node` may populate the runner-managed Node24 toolcache. `zip` and `unzip`
must already be present. The job has a 45-minute setup/build/upload limit and
repository-scoped concurrency; it does not administer other runner workloads.

## Artifacts

- Windows x64: `BriarPresence-windows-x64.zip`.
- Linux x64: `BriarPresence-linux-x64.zip` (graphics/system libraries still needed).
- macOS universal: `BriarPresence-macos-universal.zip` containing the `.app`.
- `SHA256SUMS.txt` identifies the three inner package ZIPs.

GitHub wraps each upload as an Actions artifact; download and extract that wrapper
first, then extract the contained package ZIP. Keeping package ZIPs intact
preserves Linux/macOS executable permission bits. Artifacts expire after seven
days. There is no GitHub Release or installer publication.

On failure, CI exposes the actual Godot error/context in the job log and retains
the full import/export logs as a separate diagnostic artifact for seven days.
An engine exit status of zero does not hide logged import or script errors.
The generated presets include an explicit empty `include_filter`, required by
the pinned engine; this has a regression reproducing the first build failure.
The staging project also enables ETC2/ASTC texture import support, required by
Godot for ARM64/macOS universal exports. This does not edit the accepted source
project. Completed verified platform ZIPs are uploaded even if a later platform
fails; the job remains failed and missing platforms are not presented as built.

Each package carries the original GPLv3-or-later project source/build scripts,
GPL text, Godot/upstream notices, exact source commit and per-file hashes.
The downloaded engine, template and notice hashes are recorded. Exports are
checked for expected executable format and a complete unmodified file inventory.
The Linux/macOS executable bits are retained; the macOS export is universal.
These checks do not establish native runtime behaviour.

## Trust and limits

Builds run only for trusted pushes to `main` or the named development build
branch, or manual dispatch on those refs. There is deliberately no
`pull_request`/`pull_request_target` trigger on the shared persistent runner.
The workflow token is `contents: read`; checkout credentials are not persisted.
No repository secrets, certificates, OIDC or deployment credentials are used.
Task-local files are not a sandbox: trusted repository code still executes with
the runner account's existing privileges. Fork builds must not be enabled without
separate isolation/security review. Existing offline test CI and main protection
are unchanged; this workflow adds build evidence, not a substitute green check.

All packages are **unsigned development cross-exports**, not native-platform
testing, notarisation, a final installation or a live harness integration.
Windows/macOS window behaviour, graphics, accessibility, dragging/resizing and
stay-above support still need actual-platform acceptance. Apple Gatekeeper and
Windows SmartScreen may warn or block these unsigned packages; signing and
notarisation require a separate reviewed credential workflow.

Local regressions use tiny controlled fixtures: they test build guards,
checksums, binary headers and manifests, not real exports. Record actual runner,
source/job/artifact identities in the PR when live build results are available.
Independent code review and Alex's merge decision remain separate gates.

Assisted-by: Briar
