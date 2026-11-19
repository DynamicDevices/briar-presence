# Local alpha validation — 19 November 2026

Accepted source baseline:
`prototypes/portrait-presence-01/baselines/turmo-v0.1.0-alpha.1-source.tar.gz`.
The byte-for-byte copy was verified against the packaged source archive.

Artifacts in the owning chat's `releases/turmo-v0.1.0-alpha.1/` output folder:

- Source archive: 69007 bytes, SHA-256 `7b1b16cd72429249331ca0b36abeaf88d43e698dde40af82b83ce5fe1706d3b0`.
- Hardware-test archive: 80293060 bytes, SHA-256 `cffa7c09bd1b7203452856e7516d988347053391da41b4c07d958a4e8fa085d6`.
- Both passed `sha256sum -c SHA256SUMS`; internal contents were verified by the packager.

A freshly extracted hardware-test archive passed chat-state, display-budget,
all 480 simulated targets, rendered-fixture and all 479 adjacent RGB565
reconstruction checks. Tests used only the extracted files and existing runtimes,
not the original source directory. No hardware handover was needed; the accepted
playback remains unchanged. These are local alpha artifacts, not a Git commit,
remote tag, GitHub prerelease or production approval. Public publication remains
pending verified authority and the repository's delivery gates.

Assisted-by: Briar
