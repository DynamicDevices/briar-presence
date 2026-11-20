"""Live RGB565 adapter for the existing priority scheduler. Assisted-by: Briar.

No port or service is opened here. A trusted host supplies the exclusive serial
transport; the CLI is simulation-only. Local pipe frames are NOT MQTT payloads.
"""
import importlib.util
import json
import math
from pathlib import Path
import sys
import time

spec = importlib.util.spec_from_file_location('tour', Path(__file__).with_name('turmo-tour.py'))
tour = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tour)
FRAME_BYTES = tour.WIDTH * tour.HEIGHT * 2
LAYOUT = json.loads((Path(__file__).parents[2] / 'implementation/renderers/turmo-layout.json').read_text())


def write_all(screen, data):
    remaining = memoryview(data)
    while remaining:
        count = screen.write(remaining)
        if type(count) is not int or not 0 < count <= len(remaining):
            raise OSError('Transport made no valid forward progress')
        remaining = remaining[count:]


class LiveWriter:
    def __init__(self, screen, clock=time.monotonic):
        self.screen, self.clock = screen, clock
        self.budget = tour.DisplayBudget(
            geometry=tuple(LAYOUT[k] for k in ('centerX', 'centerY', 'radiusX', 'radiusY')),
            status_top=LAYOUT['statusTop'])
        self.shadow = bytearray(FRAME_BYTES)
        # Zero pixels are NOT assumed to be what the panel currently displays.
        self.unknown = {(x, y) for y in range(tour.HEIGHT//4) for x in range(tour.WIDTH//4)}
        self.closed, self.fault = False, None

    def stop(self):
        self.closed = True

    def step(self, pixels, seconds=.125):
        if self.fault:
            raise RuntimeError('Writer fault requires transport recovery and a fresh writer') from self.fault
        if self.closed:
            raise RuntimeError('Writer stopped')
        if len(pixels) != FRAME_BYTES or not math.isfinite(seconds) or seconds <= 0:
            raise ValueError('Complete RGB565 frame and positive finite write budget required')
        target = bytes(pixels)
        # Prioritise the whole ellipse, not the old playback's trailing arc.
        # This covers both the new leading arc and erasure of its previous tail.
        plan = self.budget.plan(self.shadow, target, None, self.clock(), unknown_tiles=self.unknown)
        deadline, delivered = self.clock() + seconds, 0
        for region in plan:
            if self.closed:
                break
            if not self.budget.fits(region, deadline-self.clock()):
                continue
            (x, y, right, bottom), payload = region
            started = self.clock()
            try:
                write_all(self.screen, tour.command(197, x=x, y=y, ex=right-1, ey=bottom-1))
                write_all(self.screen, payload)
                self.screen.flush()
            except Exception as error:
                # Partial serial bytes cannot safely be replayed as a new command.
                # Preserve completed patches, but stop using this framed stream.
                self.fault = error
                raise
            self.budget.observe(len(payload)+6, self.clock()-started)
            tour.apply_region(self.shadow, region)
            self.budget.delivered(region)
            for top in range(y, bottom, 4):
                for left in range(x, right, 4):
                    self.unknown.discard((left//4, top//4))
            delivered += 1
        return delivered


def serve(reader, acknowledgements, writer):
    """One complete local frame -> one bounded write slice -> one-byte ACK.

    ACK means consumed/slice complete, NOT full-frame physical delivery. The
    sender retains only its newest waiting frame. EOF finishes without blanking.
    """
    try:
        while True:
            pixels = bytearray()
            while len(pixels) < FRAME_BYTES:
                chunk = reader.read(FRAME_BYTES-len(pixels))
                if not chunk:
                    if pixels:
                        raise EOFError('Truncated local RGB565 frame')
                    return
                pixels.extend(chunk)
            writer.step(pixels)
            acknowledgements.write(b'\x01')
            acknowledgements.flush()
    finally:
        writer.stop()


class SimulatedTransport:
    """Deterministic byte-rate transport; never touches a device."""
    def __init__(self):
        self.now = 0

    def write(self, data):
        self.now += len(data)/160000
        return len(data)

    def flush(self):
        self.now += .0001


if __name__ == '__main__':
    if sys.argv[1:] != ['--simulate']:
        raise SystemExit('Only --simulate is supported; no display port opened')
    transport = SimulatedTransport()
    serve(sys.stdin.buffer, sys.stdout.buffer, LiveWriter(transport, lambda: transport.now))
