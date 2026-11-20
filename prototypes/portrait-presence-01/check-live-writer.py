"""Offline physical-writer invariants; never opens serial. Assisted-by: Briar."""
import importlib.util
import io
import math
from pathlib import Path

spec = importlib.util.spec_from_file_location('live', Path(__file__).with_name('turmo-live-writer.py'))
live = importlib.util.module_from_spec(spec)
spec.loader.exec_module(live)
tour = live.tour


class Transport(live.SimulatedTransport):
    def __init__(self, chunk=2048):
        super().__init__()
        self.wire = bytearray()
        self.patches = []
        self.panel = bytearray([165])*live.FRAME_BYTES
        self.chunk = chunk
        self.on_write = lambda: None
        self.fail_flush = False

    def write(self, data):
        count = min(self.chunk, len(data))
        self.wire.extend(data[:count])
        self.now += count/160000
        self.on_write()
        return count

    def flush(self):
        if self.fail_flush:
            raise OSError('Disconnected mid-rectangle')
        a, b, c, d, e, code = self.wire[:6]
        assert code == 197
        x, y = (a << 2) | (b >> 6), ((b & 63) << 4) | (c >> 4)
        right, bottom = (((c & 15) << 6) | (d >> 2))+1, (((d & 3) << 8) | e)+1
        payload = bytes(self.wire[6:])
        assert len(payload) == (right-x)*(bottom-y)*2
        assert right-x <= 32 and bottom-y <= 32 and len(payload) <= 2048
        region = ((x, y, right, bottom), payload)
        self.patches.append(region)
        tour.apply_region(self.panel, region)
        self.wire.clear()
        super().flush()


def converge(writer, target):
    for _ in range(100):
        writer.step(target)
        if not writer.unknown and writer.shadow == target:
            return
    raise AssertionError('Frame did not converge')


# All live leading-arc positions AND old-tail erasure are covered. The geometry
# is the exact same JSON read by drawTurmo, not the playback fixture's ellipse.
transport = Transport()
writer = live.LiveWriter(transport, lambda: transport.now)
for step in range(720):
    angle = step*math.pi/360
    for offset in (-2, 0, 2):
        x = int(160+(148+offset)*math.cos(angle))
        y = int(211+(181+offset)*math.sin(angle))
        assert writer.budget.is_rim(x//4*4, y//4*4)

# Unknown physical pixels are written even if the target is all zero.
blank = bytes(live.FRAME_BYTES)
converge(writer, blank)
assert transport.panel == blank and not writer.unknown
count = len(transport.patches)
assert writer.step(blank) == 0 and len(transport.patches) == count

# Short writes preserve exact little-endian pixel bytes and wire framing.
transport.chunk = 17
pattern = bytes(range(256))*(live.FRAME_BYTES//256)
writer.step(pattern)
assert writer.shadow == transport.panel
assert writer.shadow != pattern and writer.budget.dirty_since
priorities = [0 if writer.budget.is_rim(box[0], box[1]) else 1 if box[1] >= 396 else 2
              for box, _ in transport.patches[count:]]
assert priorities == sorted(priorities)

# No old target remains queued. Every patch after replacement comes from latest.
latest = bytes([85])*live.FRAME_BYTES
count = len(transport.patches)
converge(writer, latest)
assert transport.panel == latest
assert all(payload == bytes([85])*len(payload) for _, payload in transport.patches[count:])

# A failure retains known-complete patches and fences this stream, never retries.
transport.fail_flush = True
previous, unknown = bytes(writer.shadow), set(writer.unknown)
try:
    writer.step(blank)
    raise AssertionError('Missing transport failure')
except OSError:
    pass
assert writer.shadow == previous and writer.unknown == unknown and writer.fault
try:
    writer.step(latest)
    raise AssertionError('Faulted stream reused')
except RuntimeError:
    pass

# Stop during a rectangle finishes that rectangle, then starts no further one.
transport = Transport(chunk=17)
writer = live.LiveWriter(transport, lambda: transport.now)
transport.on_write = writer.stop
assert writer.step(latest) == 1
expected = bytearray(live.FRAME_BYTES)
tour.apply_region(expected, transport.patches[0])
assert writer.shadow == expected and writer.unknown
assert len(transport.patches) == 1 and not transport.wire

# Earlier successes in the SAME slice survive a later failed rectangle.
transport = Transport()
writer = live.LiveWriter(transport, lambda: transport.now)
transport.on_write = lambda: setattr(transport, 'fail_flush', len(transport.patches) > 0)
try:
    writer.step(latest)
    raise AssertionError('Missing later-rectangle failure')
except OSError:
    pass
expected = bytearray(live.FRAME_BYTES)
assert len(transport.patches) == 1
tour.apply_region(expected, transport.patches[0])
assert writer.shadow == expected and writer.fault

# A zero-byte write is an immediate fault, never a busy retry loop.
transport = Transport(chunk=0)
writer = live.LiveWriter(transport, lambda: transport.now)
try:
    writer.step(latest)
    raise AssertionError('Zero-byte write accepted')
except OSError:
    pass
assert writer.fault and not transport.patches

# Truncated pipe input is not acknowledged or drawn. EOF never blanks the panel.
writer = live.LiveWriter(Transport())
acks = io.BytesIO()
try:
    live.serve(io.BytesIO(blank[:-1]), acks, writer)
    raise AssertionError('Truncated frame accepted')
except EOFError:
    pass
assert not acks.getvalue() and writer.closed
print('PASS: live layout, unknown startup, exact/short writes, replacement, priorities, fault, stop, EOF')
