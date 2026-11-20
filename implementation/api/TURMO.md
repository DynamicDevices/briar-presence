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

## Proven and still missing

Tests use the real embedded owner, full input-schema oracle, independent admitted
producer ports and optional real Canvas pixels. This establishes in-process
semantics and rendering, not cross-host authentication or clock behaviour.

Still required by API revision1: integration with the existing MQTT5 work in the
primary checkout, accepted-wire expiry/bootstrap and remote-clock handling,
independent local/remote producer interoperability, a nonblocking handoff to the
physical TURMO scheduler, measured light-pipe timing under large updates, and
reviewed display/layout acceptance. No live-source access or new broker launch
is authorised or implemented by this candidate.

Assisted-by: Briar.
