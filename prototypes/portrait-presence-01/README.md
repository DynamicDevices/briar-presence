# Briar portrait presence — local synthetic study

Open `index.html` directly in a browser, without a server or installation.
This is a 320 × 480 portrait proposal, not a hardware driver or live status client.
The same fragment is shown in the owning Briar visualisation chat.

## Accepted TURMO alpha baseline — 19 November 2026

Alex accepted the priority-scheduled light-pipe version: “this is very good -
lock it in and create an alpha test release”. `turmo-v0.1.0-alpha.1` preserves
that source and synthetic fixture; see [alpha test notes](../../releases/turmo-v0.1.0-alpha.1/RELEASE.md).
The accepted behaviour is the aggregate eight-chat face, rotating rows, smooth
morphs, ongoing animations and prioritised light-pipe updates described below.
The existing physical playback is left running at the requested 100%; no
relaunch, real chat wiring, MQTT work or desktop changes are part of this release.
This is visual acceptance for alpha testing, not thermal or production approval.
Local archives are created and verified by `package-alpha.py`; publication is
separate and requires verified authority. Earlier rollback archives remain intact.

## Original study basis and boundaries

Alex requested separate Briar visualisation work in the TURMO chat, then directly
authorised the local preview in this chat on 19 November 2026: “do the work”.
The cloudlet anchors, seeded grain approach and abstract-face direction are adapted
from `../../design/studies/03-motion/motion-study.html`, preserving that baseline
unchanged. This is an original design, not a production Lost in Space asset.
Blue/amber/red meanings and this portrait composition remain proposals.

All work, concerns, source leases and bridge expiry are fictional manual fixtures.
Nothing reads CPU/GPU utilisation, listens, senses, or connects to the harness.
No network calls, broker, credentials, USB access, firmware or dashboard changes.
Playback is opt-in, finite (18 seconds), stops when hidden, and is disabled when
the system requests reduced motion. It starts still and never loops.

## Behaviour to inspect

- Ready → abstract face → two work streams → concern → stale source → unknown.
- Source silence freezes and dims only its group; bridge expiry freezes all groups.
- A separate concern layer survives source/bridge silence and scene selection.
- Acknowledgement does not resolve a concern; only Simulate resolution clears it.
- Urgency is labelled; colour alone is never required to read status.
- Controls sit outside the proposed screen; this does not imply touchscreen support.

## Current checkpoint — 19 November 2026

Run `node check.cjs` for offline logic, controls and network-boundary checks.
Run `node check-browser.cjs /absolute/screenshot/output` for a separate local
headless Chromium session. Set `BRIAR_TEST_CHROMIUM` to override its local binary.
The test never attaches to a user browser; HTTP/WebSocket requests are blocked.

Browser checks exercise real controls, finite playback, concern retention,
unchanging unknown-state pixels, actual 736px/320px CSS viewports and reduced
motion. Both check scripts passed, including the full 18-second browser playback;
no JavaScript exceptions were reported. Desktop and narrow-screen captures were
visually inspected. The standalone document now includes mobile viewport metadata; the
inline chat version stays an HTML fragment. Particle rendering is separated from
captions, and urgent labels use the same provisional red as their light marks.

These are browser-level checks, not evidence of physical-display readability,
full accessibility compliance or design acceptance. Human review remains next;
no live harness connection, publication or production acceptance
is claimed. The existing Godot renderer and accepted motion study are unchanged.

## Prioritised display transfers

Alex reported that face-animation transfers interrupt the circling light pipe.
The carousel variant now uses a transport budget rather than finishing every
sample's entire frame. Order: circumference bar, status rows, then oldest dirty
face regions. The bar's old and new positions both receive priority, avoiding
leftover trails. Priority follows these two arcs, not unrelated changes around
the entire circumference. Face patches use the remaining time before the next 8Hz source
deadline, with a small margin and measured transfer-rate estimate. This is
best-effort scheduling, not a guaranteed frame rate or hardware vsync.

Each atomic rectangle is bounded to 5120 payload bytes, preserving 4px tile
boundaries. The sender never interrupts an unfinished protocol rectangle.
Only completed transfers update the host's shadow framebuffer. Each tick
replans against that shadow and the newest target; deferred work is not a queue
of stale animation frames. Dirty-age ordering prevents persistent face changes
from losing out indefinitely to newer face changes. Initial display setup still
requires a full frame; the preceding exporters retain their original path.

`check-display-budget.py` tests rim coverage and ordering, bounded patches,
overload yielding, actual-frame shadow reconstruction, newest-target replanning
and eventual background delivery. Its optional fixture argument exercises the
full animation with a deterministic simulated serial link; simulated timing is
not physical display measurement. Real serial stalls can still interrupt motion,
and brightness remains the requested 100% without temperature readback.

Current live checkpoint: priority-scheduled playback is running as PID 1601399,
superseding PID 1549530 after graceful replacement. Log:
`motion-chat-carousel/persistent-face-1795107068378325571.log` in the owning
chat's visualization directory. Full and partial startup transfers passed.
The first prioritised transfer sent 8868 bytes in 54 regions and deferred 65
regions; planning took 30.30ms and serial write/flush took 50.55ms. The single
6.08-second startup window recorded 49 partial updates (8.06/second), with a
maximum rim-completion interval of 153.02ms. These are host transfer measurements,
not panel scanout, sustained timing or evidence for every mode transition.

All 480 targets passed the deterministic fixture simulation, with a maximum
rim interval of 129.41ms on its simulated 160000-byte/second transport (excluding
real planning time). Arc coverage, old-trail coverage, shadow reconstruction,
latest-target replanning and eventual background delivery tests passed. The
existing 479 adjacent RGB565 reconstruction checks also passed. No fixture
artwork, accepted archive, service configuration or real chat access was changed.

Assisted-by: Briar

## TURMO development-device tour

In the owning visualisation chat on 19 November 2026 Alex requested “run it up on
the display” and answered “yes” when asked to designate this TURMO as development
hardware. This records the request, not authority for unrelated future work.

`check-browser.cjs /absolute/frame/output --export-display` exports 120 sampled
frames from this exact preview. `turmo-tour.py /absolute/frame/output --check-only`
validates RGB565 little-endian encoding, frame dimensions and skip-ahead timing
without touching the USB device. Removing `--check-only` is a live operation:
it temporarily stops only `turing-dashboard.service`, plays the synthetic tour
at orientation 101 and brightness 50%, closes the port, then restarts that same
service. Its enabled state, configuration, collectors and firmware are unchanged.
Restoration waits for a first-frame event from the new service invocation.

The display's serial throughput is slower than the browser renderer. The first
live attempt was stopped cleanly after it overran; dashboard restoration was
confirmed. Playback now skips late samples against a 60-second wall clock rather
than queuing every frame. The final in-flight transfer can extend that duration;
this is not a promise of two hardware frames per second. Silent/unknown groups
remain still and open concerns stay visible. Physical appearance still needs
Alex's feedback; successful serial writes are not proof of visual acceptance.

The corrected live tour completed all six scenes: abstract face, work, concern,
urgent concern, stale source and unknown bridge state. Each scene reported a
successful frame transfer. The tour exited successfully and the original
dashboard service confirmed its first restored frame. No monitoring source or
firmware was changed. Next: Alex's feedback on the physical screen.

### Leave the face running

Alex subsequently requested “run it up and leave it there”. Use
`turmo-tour.py /absolute/frame/output --stay --detach` for that requested mode.
It renders only the 20 synthetic abstract-face samples, skipping late samples
against elapsed time; it does not cycle fake concerns or claim real activity.
The detached launcher waits for the first successful USB-frame event before
reporting its PID and runtime log. It installs no service or login startup rule.
The monitoring service stays stopped while the face runs; its enablement and
collectors are untouched. Graceful SIGINT/SIGTERM to the reported face PID closes
the port and restores the same dashboard service, with a first-frame event gate.
An abrupt kill, power loss or USB removal cannot guarantee graceful restoration.
Only this explicitly requested persistent mode loops; the original browser study
and normal hardware tour remain finite. Check with `--stay --check-only` first.

### Original motion, brighter pixels and partial updates

Alex asked for a brighter face using the original Briar motions/cues, then asked
to address slow updates and optimise performance. `check-browser.cjs` with
`--export-motion` renders the original accepted `motion-study.html` directly;
the design source is not rewritten. The portrait export includes gathering,
the transient abstract face, focused work, local amber concern, settled waiting,
rethink, simulated resolution, labelled urgency, still disconnection and rest.
The disconnected interval holds one fixed frame and retains an explicit open
demo-concern caption until a labelled simulated resolution before looping.

Image gamma/exposure is increased in the face pixels, not the backlight. The
first exported face region's RGB sum is 2.02 times the unadjusted export; that is
an image statistic, not a measured physical luminance or user acceptance result.
Backlight stays at the established 50% maximum.

`--stay --cues --detach` keeps this explicitly synthetic sequence running.
`--replace-pid PID` checks and gracefully replaces only this user's matching
persistent Briar process, allowing its normal dashboard restoration first.
The new launcher validates a full frame and a subsequent update before success.

The sender compares quantised RGB565 frames, coalesces changed 16px tiles into
rectangles, and transmits only those regions. Identical frames send no pixel data;
full frames remain the fallback when rectangle headers would cost more bytes.
Offline checks reconstruct full frames byte-for-byte, including skipped samples.
Representative source updates measured 107640, 149106 and 135752 bytes against
307206 for a full frame; these are payload/header counts, not an FPS claim.
The startup log records one full-frame and one subsequent transfer's planning and
write/flush times. Those are host serial-call timings, not display scanout timing.

Original-motion startup evidence (superseded by the livelier version below):
playback started successfully as PID 561686. Startup measured a 307206-byte full transfer
at 1579.88ms, then a 149106-byte/19-region update at 772.67ms, with 4.26ms region
planning. Both transfers completed before the launcher reported success. The
dashboard is paused, not disabled; the existing exit/restoration path is retained.
Runtime log: the owning chat's `motion-cues/persistent-face-1795097114381617895.log`.
These are two startup samples, not a sustained frame-rate benchmark. Next is
Alex's physical-screen feedback, not automatic performance polling.

### More animation — subsequent requested variant

Alex said the brighter original-motion version looked good, then asked for more
animation. `--export-motion --livelier` adds coordinated cloudlet drift and a
small particle flow in the exported derivative, without changing the accepted
motion-study source. Work and rethink are more mobile; facial gathering remains
recognisable, concern groups are calmer, urgency does not flash, and waiting and
disconnection stay settled. Both waiting and disconnected samples were checked
pixel-identical at two distinct times. The labelled synthetic concern/resolution
sequence and backlight limit remain unchanged.

The sender now uses 8px tiles. Representative comparisons were 133928, 136890
and 127638 bytes versus 143974, 148588 and 136776 for the same samples with 16px
tiles. Both tile sizes passed exact full-frame reconstruction. Playback now waits
against the sample's original deadline, not a fresh deadline after transmission;
slow transfers no longer incur an extra avoidable wait. These byte comparisons
do not establish a sustained physical frame rate or perceived smoothness.

Livelier startup evidence (superseded by cluster-local playback below): PID 1087296, with
the dashboard paused and brightness 50%. The first partial update was 134696
bytes across 28 regions; planning took 13.5ms and serial write/flush 692.06ms.
Both full and partial transfers passed the startup gate. Log:
`motion-livelier/persistent-face-1795102476622357734.log` in the owning chat's
visualization directory. Next: Alex's feedback on the amount of movement.

### Cluster-local animation to reduce the vertical update wave

Alex observed a vertical update wave and authorised the proposed static-base,
small-highlight and cluster-ordering approach. `--export-motion --local-motion`
keeps the glass, broad glow and granular base fixed within each cue. Eighteen
small highlights move within the existing formations; work and rethink have
broader highlight paths, the abstract face stays recognisable, and waiting,
urgency and disconnected intervals do not animate. Cue changes still update
the underlying composition, so no tear-free or instantaneous transition is
claimed. Original sources and the preceding exports remain intact.

The new fixture has 240 source samples over 60 seconds, targeting 4 updates per
second where transfer time permits. Cluster centres are exported from the source
geometry. Changed tiles merge only within their cluster; whole clusters are sent
centre-first rather than following rows down the display. Caption changes follow
the clusters. Identical frames still transmit no pixels, and the full-frame
fallback remains available.

All 239 adjacent transitions reconstructed byte-for-byte in the offline check,
including cue changes. Moving-highlight updates averaged 7743 bytes and reached
8848 bytes maximum in this fixture. These exclude the larger cue transitions.
Waiting and disconnected samples remained pixel-identical; the disconnected
caption retains the open demo concern until explicit simulated resolution.
This is still a labelled synthetic demo, not live harness activity. Brightness
remains at 50%; firmware, collectors and login startup configuration are unchanged.

Cluster-local 50% startup evidence (superseded by the brightness request below): PID 1135440, with
the dashboard paused. The startup gate confirmed both a full frame and a partial
update. That first partial update sent 10646 bytes across 25 regions; planning
took 11.82ms and serial write/flush 54.94ms. Initial full-frame transfer remained
1484.96ms. These are startup samples, not panel scanout or sustained-FPS measures.
Log: `motion-clusters/persistent-face-1795102893116269539.log` in the owning chat's
visualization directory. Next: Alex's feedback on the visible update wave.

### Protocol reference, identification correction and requested 100% brightness

Alex asked to preserve the protocol documentation with attribution, explicitly
set brightness to 100%, and explain temperature and other readbacks. See the
[attributed protocol notes](../../wiki/TURMO-Protocol.md), linked from the wiki.
These distinguish the Rev-A-compatible driver protocol from an unverified PCB
revision and document the source of the upstream thermal caution. Prior 50%
references above describe the earlier runs, not a verified manufacturer limit.

`--brightness 100` sends command 110 with wire value 0; 50% remains the default.
The requested setting is forwarded to the detached owner and printed in its
startup receipt. No readback confirms actual brightness or panel temperature.
The reference driver only reads a HELLO model reply, from which dimensions are
inferred. Firmware version, exact PCB revision, current settings, framebuffer,
thermal status and draw-completion acknowledgements have no documented read
commands in that reference. Host USB enumeration is separate from those replies.

This local documentation/source update is saved in the repository, not published
or merged. The 240-sample cluster-local fixture is preserved unchanged. Brightness
packet checks and all 239 frame-reconstruction checks passed for the 100% launch.

Cluster-local 100% startup evidence (superseded by ongoing-mode motion below): PID 1226906, requested
brightness 100% (wire value 0), dashboard paused. Full and partial frame transfers
completed after the brightness command. Startup log:
`motion-clusters/persistent-face-1795103636841852227.log` in the owning chat's
visualization directory. The requested level is not readback-confirmed, and no
screen-temperature measurement is available. No thermal watcher is running.

### Ongoing animation inside each mode

Alex said the transitions looked good and asked for ongoing animations within
each mode. `--export-motion --local-motion --ongoing` exports this new derivative.
The broad formations remain stable within a mode, preserving low update traffic;
27 brighter highlights with short trails provide continuous local movement.
Available, attending, face, work, concern, rethink, resolution and rest use
distinct path sizes/rates. Waiting now has slow idle movement instead of the
earlier completely static treatment. Urgency uses slow steady red movement, not
flashing. These are explicitly simulated modes, not inferred live activity.

Disconnected source data stays frozen. A separate neutral moving point on the
outer rim is labelled “Display idle motion · data unknown”; the open demo concern
remains visible. This deliberately distinguishes decorative display animation
from source-data freshness, rather than making an unknown task look active.

`python3 check-mode-motion.py /absolute/fixture/path` checks RGB differences
within all 12 mode captions, the frozen disconnected data field, and unchanged
unknown/concern labels. RGB conversion is explicit so an unchanged alpha channel
cannot hide colour differences. All 239 adjacent RGB565 transitions reconstruct
exactly. Moving updates averaged 11468 bytes and peaked at 17294 bytes for this
fixture; no sustained physical-FPS claim is made. The preceding exporters and
accepted original study remain available unchanged through their flags/source.
Alex's requested 100% brightness is retained; no temperature readback was added.

Current live checkpoint: ongoing-mode playback running as PID 1256713, requested
brightness 100%, dashboard paused. Both full and partial startup transfers passed.
The first partial transfer (after skipped samples during initial full redraw)
was 17758 bytes/37 regions, with 6.99ms planning and 90.26ms serial write/flush.
Log: `motion-ongoing/persistent-face-1795103918373100690.log` in the owning chat's
visualization directory. Next: Alex's feedback on movement within each mode.

## Accepted working baseline — 19 November 2026

Alex's feedback on the ongoing-mode version: “that's very good - lock this in”.
Preserve this as the reference for further improvements: original Briar cue
compositions, visible ongoing mode-specific highlights/trails, cluster-local
updates, frozen unknown source data with separately labelled display-idle motion,
retained concerns, explicit synthetic labelling and the requested 100% setting.
The reproduction path is `--export-motion --local-motion --ongoing`, then
`--stay --cues --brightness 100`; use the existing detached handover procedure.
The source, tests and attributed protocol notes are saved locally in this repo.
This is visual feedback and a working baseline, not thermal validation, live
harness integration, production readiness, a published release or a Git commit.
Further improvements remain proposals until Alex selects the work.

## Selected improvements: 1, 2, 3, 4 and 7

Alex selected smoother animation, smoother mode changes, clearer mode cues,
concurrent work streams and richer transient abstract faces. Live wiring,
laptop controls and presets were not selected and are not implemented here.

Before editing, the accepted ongoing-mode source, tests, notes and original
motion-study source were saved in
`baselines/accepted-ongoing-2026-11-19.tar.gz`. The preceding generated fixture
also remains unchanged. This is a local rollback archive, not a published release.

`--export-motion --local-motion --ongoing --expressive` uses the new
`expressive-renderer.js` derivative and produces 480 samples over 60 seconds.
The driver targets the fixture's 8Hz source rate and skips late samples; it never
queues old frames to meet a nominal FPS claim. For this new rate the detached
startup gate also records one bounded six-second delivery-rate sample, including
cue transitions. This is not recurring monitoring or a sustained benchmark.

Mode changes fade groups centre-first with staggered progress rather than making
one large formation replacement. Highlights move between the corresponding old
and new positions. Unknown source data switches immediately to its fixed snapshot
instead of appearing to do fresh work. Larger changes can still redraw visibly;
buffered/vsync presentation remains unverified on this hardware.

Mode paths now distinguish gathering, directional work, quiet waiting, steady
concern and counter-moving rethink. Two fictional concurrent streams, **Orchard**
and **Beacon**, have stable IDs, circle/diamond markers and named status rows.
Orchard can keep working while Beacon needs a decision or holds an open concern.
Concern ownership survives waiting and disconnection and clears only in the
explicit simulated-resolution stages. No CPU/GPU load or real harness state is
used. The header explicitly says synthetic with two work streams.

Small asymmetric brow and cheek arcs briefly gather over the face cue, then
dissolve. These are abstract light groupings, not permanent eyes or a mouth.
Disconnected data remains still; the separately labelled display-idle rim motion
continues, with both streams explicitly unknown and Beacon's concern retained.

`check-expressive.py` checks all twelve modes, stable stream identity/shapes,
independent work/concern status, transitions, resolution and frozen unknown data.
All 479 adjacent RGB565 transitions reconstructed exactly. Moving updates in the
offline fixture averaged 17984 bytes with a 72586-byte maximum; these figures
include staged within-mode transition frames, not just settled highlights.
Brightness remains at Alex's requested 100%; no thermal telemetry was added.

Current live checkpoint: expressive playback is running as PID 1342477, with
requested brightness 100% and the dashboard paused. Full and partial startup
transfers completed. The single startup-rate window delivered 39 updates over
6.15 seconds (6.34 updates/second), including cue transitions, against the 8Hz
source target. This is not a sustained-FPS or panel-scanout measurement.
Log: `motion-expressive/persistent-face-1795104729372607519.log` in the owning
chat's visualization directory. Next: Alex's visual feedback on the five selected
improvements. No live harness wiring, new controls or presets were added.

## Accepted expressive baseline — 19 November 2026

Alex's feedback: “very good - lock this in”. The five selected expressive
improvements are now the accepted working reference. Source, tests and original
motion material are preserved in `baselines/accepted-expressive-2026-11-19.tar.gz`;
the earlier accepted ongoing archive and fixtures remain available. The current
display is left unchanged at the requested 100%. This records visual acceptance,
not thermal validation, publication or production readiness. Further suggestions
are proposals only; no additional work is authorised by this checkpoint.

## Eight-chat carousel, geometric transitions and circumference bar

Alex requested rotating chat rows, an overall image reflecting all work, smooth
mode changes and a travelling circumference light bar whose colour and speed
respond to events. This candidate uses eight explicitly fictional chats, not
real chat or harness access. No live integration or laptop controls were added.

`--export-motion --local-motion --ongoing --expressive --chat-carousel` loads
`chat-demo-state.js` and `chat-carousel-renderer.js`, producing a 60-second,
480-frame fixture. Two bottom rows rotate on a six-second dwell; the highest
attention chat stays pinned while the other row cycles. Independent timelines
include state, freshness, retained concerns and who acts next. Overall counts,
geometry and colour use all eight chats, never only the visible rows.

Mode geometry morphs from the current interpolated pose, with fixed centre-first
ordering per transition so groups do not reverse halfway through. Colour blends
smoothly across the light field. Unknown geometry freezes and colours settle
to neutral; unresolved concerns remain until an explicit resolution event.

A short light bar travels around the ellipse: blue activity, amber decisions
or concerns, red urgency, slow neutral motion for unknown data. Colour and speed
ease between events. The path closes over the fixture loop; unknown captions
identify this as idle-bar animation, not evidence of fresh work.

`check-chat-state.cjs` checks independent timelines, carousel reachability,
pinning and aggregate independence. `check-chat-render.py` passed the final
fixture: aggregate counts, continuous retargets and loop geometry, non-reversing
morph progress, all eight rows reachable, frozen unknown field, retained concerns
and changing bar colour/speed. Preview frames were inspected for blended colour
and readable rows. Physical presentation still has no verified vsync/frame flip;
this does not promise tear-free redraws or temperature telemetry.

The accepted expressive rollback archive remains unchanged. Brightness remains
at Alex's requested 100%. Alex subsequently accepted this with the prioritised
transfers as the TURMO alpha baseline recorded at the top of this document.

Current live checkpoint: carousel/bar playback is running as PID 1549530,
superseding PID 1342477 after a verified graceful handover. Full and partial
startup transfers passed, with requested brightness 100% (wire 0) and dashboard
paused. The single bounded startup window delivered 42 updates in 6.09 seconds
(6.9 updates/second), against an 8Hz source; this is not sustained FPS or panel
scanout measurement. All 479 adjacent RGB565 transitions reconstructed exactly;
moving updates averaged 29174 bytes and peaked at 141452 bytes, including morphs.
Log: `motion-chat-carousel/persistent-face-1795106581627115125.log` in the owning
chat's visualization directory. Next: Alex's visual feedback; no recurring
monitoring, real chat wiring, publication or thermal validation is implied.

Assisted-by: Briar
