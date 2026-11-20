# TURMO accepted-state display candidate

`turmo.mjs` and `../renderers/turmo.mjs` turn trusted accepted facts into a live
320×480 scene. They do not read recordings, open serial ports, start a broker,
connect real chats or alter the accepted alpha. No new public wire schema is
defined. The accepted alpha archives and their visual acceptance remain separate.

The trusted host constructs `createTurmoProjection()` with explicit user/workspace,
configured user/producer labels, a uint32 seed, display transition/carousel policy,
maximum local animation step and ring speeds. The millisecond/seconds policies
in tests are fixture choices, not approved deployment capacity or timing limits.
Speeds are radians per second. Producers cannot supply display preferences.

The host supplies `readAccepted(now)`, returning the existing fully validated,
scoped owner `user.read(now)` representation, and `ownerCurrent(now)`, returning
a trusted boolean. The latter must incorporate the wire consumer's conservative
owner deadline, clock uncertainty and authenticated resynchronisation state when
used remotely. A payload's identity labels or fresh socket are not that proof.
Do not feed arbitrary producer or MQTT JSON directly to this adapter. Producer
admission and full schema/semantic validation remain with the existing state owner.
An optional trusted `readLastKnown(now)` supplies retained accepted facts while
the owner is unknown, including before the first renderer sample. Such facts
are always dimmed/marked unknown; this callback cannot make an owner current.

The display samples `frame({now, preferences})` on its own monotonic clock. Local
preferences require brightness 0–1 and boolean reducedMotion/attentionEnabled.
Pass the result to `drawTurmo(canvasContext, frame)`. The renderer requires a
320×480 canvas. Draw/publish only successful frames; a clock rejection is a
resynchronisation condition, not a fresh display result. No frame/error logging
should expose input snapshots or private labels.

All work, retained work, unresolved concerns and open requests contribute to the
semantic result, independently of the two carousel rows. Keys include workspace,
producer, kind and ID. Acknowledgement remains distinct from resolution; finished
work retains its actual outcome and does not erase concerns. Standalone concerns
and unattached open requests remain visible. Because the old accepted-view form
does not date an unattached request, this adapter conservatively marks it unknown
instead of treating producer liveness as a new observation.

Geometry and bar phase advance without producer traffic. Mode retargeting begins
from the previous geometry; colours ease locally. Expired sources remain unknown
beside current independent sources. Owner loss preserves geometry/concerns and
labels the neutral decorative bar. Reduced motion freezes movement. The explicit
animation-step policy discards missed animation time after a pause; it does not
change source deadlines, timestamps or acceptance revisions.

## Accepted-view receiver integration

`createReceivedTurmo()` in `turmo-received.mjs` binds the existing scoped
accepted-view receiver to this projection. Supply the same explicit display
policy plus `receiver`, then sample
`frame({wallNow, monotonicNow, preferences})`. Wall time is UTC milliseconds;
monotonic time is the display's own elapsed milliseconds. The receiver checks
clock uncertainty, original observation/source deadlines, owner expiry and
nonce-bound bootstrap on each sample. Invalid preferences/backwards local time
are refused before consuming a receiver read. Disconnects retain unresolved
concerns and last-known work, even before the first visual sample.

`attachTurmoDisplayClient()` in `../transports/mqtt/turmo-host.mjs` reuses the
existing MQTT5 display subscription/sync lifecycle rather than inventing a
second wire format. Its `onFrame` sink gets a real local scene; `sample()` checks
expiry and advances animation without publishing any geometry or renewing a
lease. The host owns sampling cadence, authenticated client and shutdown.

## Proven and still missing

Tests use the real embedded owner, full input-schema oracle, independent admitted
producer ports and optional real Canvas pixels. This establishes in-process
semantics and rendering. Tests now also use the real accepted-view schema,
publisher/receiver and MQTT callback attachments, with ten scoped tasks from two
admitted producers, independent display preferences, local animation, clock
discontinuity, owner/source expiry and nonce-bound recovery. They include Canvas
pixels, not just scene metadata. Clocks and the MQTT client are test-controlled;
this is not cross-host authentication or a live broker test.

Still required by API revision1: deployment policy/acceptance for producer restart
and recovery, independent local/remote interoperability through an authorised broker,
a nonblocking handoff to the
physical TURMO scheduler, measured light-pipe timing under large updates, and
reviewed display/layout acceptance. No live-source access or new broker launch
is authorised or implemented by this candidate.

Assisted-by: Briar.
