# Live TURMO frame handoff

The MQTT display host still receives accepted semantic state, never pixels or
animation geometry. Its `onFrame` callback can now use a local Canvas sink:

```js
const sender = createTurmoPipeSender(trustedChild);
const sink = createTurmoFrameSink({canvas, send: sender.send});
const display = attachTurmoDisplayClient({...host, onFrame: frame => sink.offer(frame)});
// The trusted host calls display.sample() at its local animation cadence.
// On shutdown: stop sampling, display.stop(), await sink.stop(), sender.close().
```

Imports are from `renderers/turmo-writer.mjs` and
`transports/mqtt/turmo-host.mjs`. Supply a private 320×480 Canvas and a dedicated
child with stdin/stdout pipes. The host owns its launch, process deadline,
exclusive serial transport, shutdown and recovery. No timer or new MQTT route
is added. Handle `offer().ok:false` and rejected `flush()`/`stop()`; errors are
retained in `read().fault`, not automatically retried.

The sink keeps one frame being sent and one newest waiting scene. New samples
replace the waiting scene; they do not queue. Only scenes selected for sending
are rendered. RGB565 conversion uses exact little-endian pixel words. Scene
copies isolate pending frames from later host mutation. `flush()` drains to an
idle point; stop sampling before using it as a shutdown boundary. `stop()` drops
the waiting scene and lets the current slice finish; it does not blank the panel.

## Local writer boundary

`prototypes/portrait-presence-01/turmo-live-writer.py` provides `LiveWriter` and
`serve(reader, acknowledgements, writer)` for an exclusive transport injected by
the trusted host. It neither opens a serial port nor changes a service. The CLI
supports **only `--simulate`**, using deterministic byte-rate timing. There is
no live-device launcher in this candidate; the existing playback stays running.

Each local request is exactly 307200 raw RGB565 bytes, with no header. There is
one outstanding request. A one-byte `0x01` reply acknowledges consumption and a
write slice, **not full-frame delivery or panel readback**. Truncated input or a
transport error terminates the worker without acknowledging that request. The
host must enforce a workload deadline for a worker that stops responding.
The pipe is local and trusted, not a network/authentication protocol.

Each slice replans against only successfully completed rectangles. Unknown
startup pixels are forced dirty, including black target pixels; the writer does
not pretend a zero-filled buffer describes the panel. Patches remain at most
32×32 and 2048 payload bytes, spatially dispersed, with rim first, bottom rows
next and oldest dirty face tiles next. The shared `turmo-layout.json` defines
the live ellipse and status-panel boundary. Whole-ellipse priority covers both
the leading arc and erasure of the previous tail; playback retains its original
geometry and trailing-arc scheduling defaults.

The default slice allows 125ms of estimated transport work **after planning**;
planning, Canvas work and actual transport variance add time. This is not a
proven frame rate or hard real-time guarantee. A new target replaces unsent old
pixels at the next slice. A partially written rectangle is never interrupted
to insert another command. Short writes are completed; zero progress, write or
flush failures fence the stream. Completed earlier patches remain in the shadow,
but the failed rectangle is not claimed as delivered. Recovery requires explicit
host transport recovery and a fresh writer with unknown startup pixels.

## Evidence and limits

`check-live-writer.py` tests geometry, unknown startup, exact partial delivery,
short writes, latest-target replacement, priorities, faults, shutdown and EOF.
`test/turmo-writer.test.mjs` tests real Canvas conversion, replacement under
backpressure, failure/stop behaviour, pipe errors and real Node-to-Python IPC.
Set `BRIAR_TEST_PYTHON` for a non-default interpreter with the existing locked
Pillow/pyserial dependencies. CI uses its prepared Python environment.

These tests do not prove physical cadence, a live broker, remote interoperability,
ACL enforcement or exclusive serial handover. Those remain integration work.

Assisted-by: Briar
