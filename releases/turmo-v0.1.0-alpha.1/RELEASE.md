# TURMO portrait demo — turmo-v0.1.0-alpha.1

19 November 2026. Alpha test package, not a production release.

Alex accepted the prioritised light-pipe version: “this is very good - lock it
in and create an alpha test release”. This preserves that implementation without
including the separate MQTT or desktop work currently in progress.

## Included

- Eight explicitly synthetic chats with independent timelines and next actors.
- Two rotating rows, one attention row pinned; the whole face reflects all chats.
- Smooth geometric mode changes and ongoing movement within modes.
- Event-coloured, variable-speed circumference light pipe.
- Transfer priority: old/new light-pipe arcs, status text, oldest dirty face work.
- Exact host shadow framebuffer, bounded atomic patches and no stale-frame queue.
- Source, tests, accepted motion study, GPL licence and attributed protocol notes.
- The hardware-test archive also includes the 480-frame, 60-second demo fixture.

## Test without hardware

Extract the hardware-test archive and work from its root. Node.js and Python 3
are needed. Install `requirements-alpha.txt` in your chosen virtual environment;
the pinned versions record the tested environment, not an instruction to change
your system Python.

```sh
node prototypes/portrait-presence-01/check-chat-state.cjs
python3 prototypes/portrait-presence-01/check-display-budget.py fixtures/chat-carousel
python3 prototypes/portrait-presence-01/check-chat-render.py fixtures/chat-carousel
python3 prototypes/portrait-presence-01/turmo-tour.py fixtures/chat-carousel --stay --cues --brightness 100 --check-only
```

These commands do not open the serial port or stop the dashboard. `index.html`
is the earlier finite browser study, not a live preview of this alpha. To
regenerate the accepted animation, provide a Chromium executable explicitly:

```sh
BRIAR_TEST_CHROMIUM=/absolute/path/to/chromium node prototypes/portrait-presence-01/check-browser.cjs /absolute/output/folder --export-motion --local-motion --ongoing --expressive --chat-carousel
```

## Hardware test limits

The sender is deliberately bound to Alex's designated development TURMO:
320×480, USB `1a86:5722`, serial `USB35INCHIPSV2`, cable top, orientation 101.
It expects the existing `turing-dashboard.service` and validates that service's
launcher before stopping it. This is not a generic installer or an instruction
to stop unrelated display software. No firmware or service configuration changes.
The Rev-A-compatible protocol does not prove PCB revision A.

On that designated setup, opt-in persistent playback is:

```sh
python3 prototypes/portrait-presence-01/turmo-tour.py fixtures/chat-carousel --stay --cues --brightness 100 --detach
```

Do not run a second sender over an existing face. For an intentional replacement,
use `--replace-pid` with the exact validated existing face PID; never guess a PID.
The launcher validates its identity. To stop, send SIGTERM to the face PID printed
by the launcher, after checking it still identifies this face process. The sender
restores the dashboard on graceful exit/error; a forced kill cannot guarantee it.

Alex requested 100% brightness for this unit despite the upstream overheating
warning. That is not a thermal safety recommendation for testers. Choose a lower
`--brightness` value where appropriate. Brightness is requested, not read back;
there is no known panel-temperature readback or thermal protection in this demo.

## Evidence and remaining limits

Accepted visual feedback is separate from automated and hardware evidence.
Chat-state, rendered-fixture, transport-budget and 479 adjacent RGB565
reconstruction checks passed. The full 480-target transport simulation passed.
On the accepted hardware, one bounded 6.08-second startup window recorded 49
partial updates (8.06/second), with a maximum rim-completion gap of 153.02ms.
This is not sustained performance, panel scanout or a guarantee for every mode.
Face updates may arrive gradually to preserve the light-pipe cadence.

No verified vsync/frame flip, tear-free guarantee, live chat integration, real
harness state, temperature telemetry or production readiness. Unknown geometry
freezes; concerns survive silence until explicit resolution. The neutral idle
bar indicates display animation only, not fresh work. All chat names and events
in the fixture are fictional. No credentials or live chat data are included.

Source: GNU GPL v3 or later, with no warranty; see `LICENSE`. Protocol adaptation
credits Matthieu Houdebine and contributors' `turing-smart-screen-python`;
see `wiki/TURMO-Protocol.md` for pinned sources and attribution. Dependencies
retain their own licences. The archive includes a per-file SHA-256 manifest;
adjacent `SHA256SUMS` checks the release archives. Checksums are integrity checks,
not proof of Alex's authority or a signed software release.

Assisted-by: Briar
