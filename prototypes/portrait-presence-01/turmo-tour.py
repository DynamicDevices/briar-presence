"""Synthetic TURMO tour or persistent face, with dashboard restoration on exit.

Use only after Alex designates this exact TURMO as development hardware and
requests the display handover. No firmware, service or collector changes.
Protocol adapted from the local TURMO test_display.py (Revision A).
"""
import argparse
import json
import math
import os
from pathlib import Path
import signal
import selectors
import select
import struct
import subprocess
import sys
import threading
import time

import serial
from PIL import Image, ImageChops

PORT = Path('/dev/serial/by-id/usb-2017-2-25_UsbMonitor_USB35INCHIPSV2-if00')
SERVICE = 'turing-dashboard.service'
LAUNCHER = '/home/ajlennon/.local/share/turing-dashboard/venv/bin/turing-dashboard'
WIDTH, HEIGHT = 320, 480
stop = threading.Event()


def command(code, x=0, y=0, ex=0, ey=0):
    return bytes((x >> 2, ((x & 3) << 6) | (y >> 4),
                  ((y & 15) << 4) | (ex >> 6),
                  ((ex & 63) << 2) | (ey >> 8), ey & 255, code))


def brightness_wire(percent):
    """Upstream Rev-A-compatible command: zero is brightest, 255 darkest."""
    if not 0 <= percent <= 100:
        raise ValueError('Brightness must be within 0..100 percent')
    return int(255 - ((percent / 100) * 255))


def rgb565(image):
    pixels = bytearray()
    for r, g, b in image.convert('RGB').get_flattened_data():
        pixels.extend(struct.pack('<H', ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3)))
    return pixels


def frame_index(elapsed, stay=False, cycle_frames=20, fps=2):
    """Wall-clock playback: skip late samples instead of queuing stale frames."""
    if stay:
        return int(max(0, elapsed) * fps) % cycle_frames
    return None if elapsed >= 60 else min(119, max(0, int(elapsed * 2)))


def rim_tile(x, y, tile=4, angles=None):
    """Conservative tile/ellipse intersection, including antialiased bar edges."""
    left, right = (x-160)/139, (min(x+tile, WIDTH)-160)/139
    top, bottom = (y-229)/183, (min(y+tile, HEIGHT)-229)/183
    near_x = 0 if left <= 0 <= right else min(abs(left), abs(right))
    near_y = 0 if top <= 0 <= bottom else min(abs(top), abs(bottom))
    intersects = near_x**2+near_y**2 <= 1.02**2 and max(left**2,right**2)+max(top**2,bottom**2) >= .98**2
    if not intersects or angles is None:
        return intersects
    theta = math.atan2((y+tile/2-229)/183,(x+tile/2-160)/139)
    return any((angle-theta)%(2*math.pi)<=.78 or (theta-angle)%(2*math.pi)<=.08 for angle in angles)


def apply_region(shadow, region):
    (x, y, right, bottom), payload = region
    stride = (right-x)*2
    for row in range(y, bottom):
        offset = (row-y)*stride
        shadow[(row*WIDTH+x)*2:(row*WIDTH+right)*2] = payload[offset:offset+stride]


def bounded_regions(regions, maximum=5120, tile=8, extent=32):
    """Bound atomic transfers in bytes AND dimensions to avoid long sweeps."""
    if extent < tile or maximum < tile*tile*2:
        raise ValueError('Patch limits must accommodate at least one tile')
    columns = min(extent//tile*tile, maximum//(tile*2)//tile*tile)
    result = []
    for (x, y, right, bottom), payload in regions:
        stride = (right-x)*2
        for left in range(x,right,columns):
            edge = min(left+columns,right)
            rows = min(extent//tile*tile, maximum//((edge-left)*2)//tile*tile)
            for top in range(y,bottom,rows):
                end = min(top+rows,bottom)
                patch = b''.join(payload[(row-y)*stride+(left-x)*2:(row-y)*stride+(edge-x)*2] for row in range(top,end))
                result.append(((left,top,edge,end),patch))
    return result


def spatial_rank(x,y):
    """Reversed Morton order spreads ties across the screen, not down rows."""
    x,y = x//32,y//32
    rank = 0
    for bit in range(4):
        rank = (rank<<1) | ((x>>bit)&1)
        rank = (rank<<1) | ((y>>bit)&1)
    return rank


class DisplayBudget:
    """Rim first, status next, oldest dirty face tiles next. No frame backlog."""
    def __init__(self):
        self.dirty_since = {}
        self.bytes_per_second = 160000
        self.angles = None

    def is_rim(self,x,y):
        return rim_tile(x,y,angles=self.angles)

    def plan(self, previous, current, clusters, tick, angles=None):
        self.angles = angles
        regions = bounded_regions(update_regions(previous,current,tile=4,clusters=clusters,priority_rim=True,priority_arcs=angles),tile=4)
        dirty = set()
        for (x,y,right,bottom), _ in regions:
            for top in range(y,bottom,4):
                for left in range(x,right,4):
                    key = (left//4,top//4)
                    dirty.add(key)
                    self.dirty_since.setdefault(key,tick)
        self.dirty_since = {key:age for key,age in self.dirty_since.items() if key in dirty}
        def rank(region):
            (x,y,right,bottom),_ = region
            if self.is_rim(x,y):
                return (0,0,y,x)
            age = min(self.dirty_since[(left//4,top//4)] for top in range(y,bottom,4) for left in range(x,right,4))
            return (1 if y>=416 else 2,age,spatial_rank(x,y),y,x)
        return sorted(regions,key=rank)

    def delivered(self,region):
        """Only completed patches lose their age; unsent work keeps its turn."""
        (x,y,right,bottom),_ = region
        for top in range(y,bottom,4):
            for left in range(x,right,4):
                self.dirty_since.pop((left//4,top//4),None)

    def fits(self, region, remaining):
        return (len(region[1])+6)/self.bytes_per_second + .003 <= remaining

    def observe(self, byte_count, seconds):
        if seconds > 0:
            self.bytes_per_second = .8*self.bytes_per_second + .2*byte_count/seconds


def transmit_regions(screen, regions, previous, deadline, budget=None, clock=time.monotonic):
    """Finish each bounded protocol rectangle; yield between rectangles only."""
    shadow = bytearray(previous) if budget else None
    delivered = []
    rim_completed = None
    for region in regions:
        (x,y,right,bottom),payload = region
        is_rim = budget is not None and budget.is_rim(x,y)
        if budget and not is_rim and not budget.fits(region,deadline-clock()-.008):
            continue
        patch_start = clock()
        screen.write(command(197,x=x,y=y,ex=right-1,ey=bottom-1))
        for offset in range(0,len(payload),WIDTH*8):
            screen.write(payload[offset:offset+WIDTH*8])
        if budget:
            screen.flush()
            budget.observe(len(payload)+6,clock()-patch_start)
            apply_region(shadow,region)
            budget.delivered(region)
        delivered.append(region)
        if is_rim:
            rim_completed = clock()
        if stop.is_set():
            break
    screen.flush()
    return shadow,delivered,rim_completed


def update_regions(previous, current, tile=8, clusters=None, priority_rim=False, priority_arcs=None):
    """Coalesce changed RGB565 tiles; unchanged pixels require no USB traffic."""
    full = [((0, 0, WIDTH, HEIGHT), current)]
    if previous is None:
        return full
    if previous == current:
        return []
    before = Image.frombytes('RGB', (WIDTH, HEIGHT), bytes(previous), 'raw', 'BGR;16')
    after = Image.frombytes('RGB', (WIDTH, HEIGHT), bytes(current), 'raw', 'BGR;16')
    difference = ImageChops.difference(before, after)
    def group_at(x, y):
        if priority_rim:
            if rim_tile(int(x//tile)*tile,int(y//tile)*tile,tile,priority_arcs):
                return -2
            if y >= 416:
                return -1
        if not clusters:
            return 0
        if y >= 426:
            return len(clusters)
        return min(range(len(clusters)), key=lambda i: (x-clusters[i][0])**2+(y-clusters[i][1])**2)
    rects, active = [], {}
    for y in range(0, HEIGHT, tile):
        runs, start, run_group = [], None, None
        for x in range(0, WIDTH + tile, tile):
            changed = x < WIDTH and difference.crop((x, y, min(x + tile, WIDTH), min(y + tile, HEIGHT))).getbbox() is not None
            group = group_at(x+tile/2, y+tile/2) if changed else None
            if start is not None and (not changed or group != run_group):
                runs.append((run_group, start, min(x, WIDTH)))
                start = None
            if changed and start is None:
                start = x
                run_group = group
        following = {}
        for group, x, right in runs:
            rect = active.pop((group, x, right), [x, y, right, y])
            rect[3] = min(y + tile, HEIGHT)
            following[(group, x, right)] = rect
        rects.extend(active.values())
        active = following
    rects.extend(active.values())
    if clusters:
        order=sorted(range(len(clusters)), key=lambda i: (clusters[i][0]-160)**2+(clusters[i][1]-239)**2)
        priority={group:rank for rank, group in enumerate(order)}
        priority[-2]=-2
        priority[-1]=-1
        priority[len(clusters)]=len(clusters)
        rects.sort(key=lambda r: (priority[group_at((r[0]+r[2])/2,(r[1]+r[3])/2)], (r[0]-160)**2+(r[1]-239)**2))
    regions = []
    for x, y, right, bottom in rects:
        payload = b''.join(current[(row * WIDTH + x) * 2:(row * WIDTH + right) * 2] for row in range(y, bottom))
        regions.append(((x, y, right, bottom), payload))
    # Use full-frame transfer if region headers/payload would cost more bytes.
    return regions if priority_rim or sum(len(payload) + 6 for _, payload in regions) < len(current) + 6 else full


def load_frames(folder, stay=False, cues=False):
    manifest = json.loads((folder / 'manifest.json').read_text())
    if not (manifest.get('synthetic') is True and manifest.get('width') == WIDTH
            and manifest.get('height') == HEIGHT and manifest.get('fps') in (2, 4, 8)
            and manifest.get('seconds') == 60 and len(manifest.get('frames', [])) == 60 * manifest['fps']):
        raise ValueError('Expected the finite 60-second synthetic portrait fixture')
    frames, cluster_centers = [], {}
    for entry in manifest['frames']:
        if stay and not cues and entry['scene'] != 'attending':
            continue
        source = (folder / entry['file']).resolve()
        if source.parent != folder.resolve() or source.suffix != '.png':
            raise ValueError('Frame outside the named fixture directory')
        with Image.open(source) as image:
            if image.size != (WIDTH, HEIGHT):
                raise ValueError('Unexpected frame size')
            frames.append((entry['scene'], rgb565(image)))
        if 'clusters' in entry:
            centers=entry['clusters']
            if not (len(centers)==9 and all(len(p)==2 and all(isinstance(v,(float,int)) and 0<=v<=HEIGHT for v in p) for p in centers)):
                raise ValueError('Invalid cluster coordinates')
            cluster_centers[entry['scene']]=centers
    if stay and not cues and len(frames) != 20:
        raise ValueError('Persistent mode needs exactly 20 synthetic face frames')
    if cues and manifest.get('mode') != 'motion-cues':
        raise ValueError('Cue mode needs the exported original motion study')
    bar_angles = [entry['bar']['angle'] for entry in manifest['frames']] if manifest.get('variant') == 'chat-carousel-aggregate' else None
    return frames, manifest['fps'], cluster_centers, bar_angles


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('frames', type=Path)
    parser.add_argument('--check-only', action='store_true')
    parser.add_argument('--stay', action='store_true', help='Keep only the synthetic face running until stopped')
    parser.add_argument('--cues', action='store_true', help='Use the original motion/cue sequence in persistent mode')
    parser.add_argument('--brightness', type=int, default=50, help='Requested percent; upstream warns about high brightness, no panel temperature readback is known')
    parser.add_argument('--detach', action='store_true', help='Detach persistent mode after a bounded first-frame gate')
    parser.add_argument('--replace-pid', type=int, help='Gracefully replace this exact existing Briar display process')
    parser.add_argument('--ready-fd', type=int, help=argparse.SUPPRESS)
    args = parser.parse_args()
    wire_brightness=brightness_wire(args.brightness)
    if args.cues and not args.stay:
        raise ValueError('--cues requires --stay')
    if args.replace_pid is not None and not args.detach:
        raise ValueError('--replace-pid is only supported by the detached launcher')
    if args.detach:
        if not args.stay or args.check_only:
            raise ValueError('--detach requires --stay and a live run')
        if args.replace_pid is not None:
            existing = Path('/proc') / str(args.replace_pid)
            old_args = (existing / 'cmdline').read_bytes().split(b'\0')
            if (existing.stat().st_uid != os.getuid() or len(old_args) < 3
                    or Path(old_args[1].decode()).resolve() != Path(__file__).resolve()
                    or b'--stay' not in old_args):
                raise RuntimeError('Replacement PID is not this user\'s persistent Briar display; nothing stopped')
            descriptor = os.pidfd_open(args.replace_pid)
            try:
                if (existing / 'cmdline').read_bytes().split(b'\0') != old_args:
                    raise RuntimeError('Display process identity changed before replacement')
                signal.pidfd_send_signal(descriptor, signal.SIGTERM)
                if not select.select([descriptor], [], [], 30)[0]:
                    raise RuntimeError('Previous face did not finish its dashboard restoration')
            finally:
                os.close(descriptor)
            print('REPLACED: previous Briar display exited cleanly.', flush=True)
        output_path = args.frames / f'persistent-face-{time.time_ns()}.log'
        read_fd, write_fd = os.pipe()
        try:
            with output_path.open('xb') as output:
                child = subprocess.Popen([sys.executable, str(Path(__file__).resolve()),
                                          str(args.frames.resolve()), '--stay', *(['--cues'] if args.cues else []), '--brightness', str(args.brightness), '--ready-fd', str(write_fd)],
                                         stdin=subprocess.DEVNULL, stdout=output, stderr=subprocess.STDOUT,
                                         start_new_session=True, pass_fds=(write_fd,))
            os.close(write_fd)
            write_fd = None
            # Cue playback decodes 480 RGB565 targets before its six-second
            # live cadence check; 30s can expire during a healthy cold start.
            startup_timeout = 60 if args.cues else 30
            with selectors.DefaultSelector() as events:
                events.register(read_fd, selectors.EVENT_READ)
                if not events.select(startup_timeout) or os.read(read_fd, 128) != b'FIRST_FRAME_SENT':
                    child.terminate()
                    child.wait(timeout=30)
                    raise RuntimeError('Persistent face did not start; see ' + str(output_path))
            print(f'RUNNING: persistent synthetic Briar face; pid={child.pid}; requested_brightness={args.brightness}%; log={output_path}', flush=True)
            for line in output_path.read_text().splitlines():
                if line.startswith('PERF'):
                    print(line, flush=True)
        finally:
            os.close(read_fd)
            if write_fd is not None:
                os.close(write_fd)
        return
    frames, sample_fps, cluster_centers, bar_angles = load_frames(args.frames, args.stay, args.cues)
    priority_enabled = bool(bar_angles) and args.cues
    if args.check_only:
        assert rgb565(Image.new('RGB', (1, 1), 'red')) == bytes((0, 248))
        assert command(197, ex=319, ey=479) == bytes((0, 0, 4, 253, 223, 197))
        assert [brightness_wire(p) for p in (0,50,100)] == [255,127,0]
        assert command(110,x=brightness_wire(100)) == bytes((0,0,0,0,0,110))
        assert [frame_index(t) for t in (0, 3, 21.5, 59.9, 60)] == [0, 6, 43, 119, None]
        assert [frame_index(t, True) for t in (0, 9.9, 10, 60, 1000)] == [0, 19, 0, 0, 0]
        assert frame_index(60, True, 120) == 0
        assert frame_index(1, True, 240, 4) == 4
        if args.stay and not args.cues:
            assert all(scene == 'attending' for scene, _ in frames)
        blank = rgb565(Image.new('RGB', (WIDTH, HEIGHT), 'black'))
        modified = bytearray(blank)
        modified[(100 * WIDTH + 100) * 2:(100 * WIDTH + 100) * 2 + 2] = b'\0\xf8'
        assert not update_regions(blank, blank)
        patches = update_regions(blank, modified)
        assert len(patches) == 1 and len(patches[0][1]) == 128
        # Reconstruct every patch into a full framebuffer, including RGB565 rows.
        for old, new in [(blank, modified), (frames[0][1], frames[1][1]), (frames[0][1], frames[12][1])]:
            reconstructed = bytearray(old)
            for tile in (8, 16):
                reconstructed = bytearray(old)
                for (x, y, right, bottom), payload in update_regions(old, new, tile, cluster_centers.get(frames[0][0])):
                    stride = (right - x) * 2
                    for row in range(y, bottom):
                        reconstructed[(row * WIDTH + x) * 2:(row * WIDTH + right) * 2] = payload[(row-y)*stride:(row-y+1)*stride]
                assert reconstructed == new, 'Partial updates must reconstruct the exact framebuffer'
        plans = [update_regions(frames[a][1], frames[b][1], clusters=cluster_centers.get(frames[b][0])) for a, b in [(0, 1), (0, 4), (4, 12)]]
        print('OFFLINE_BYTES: full=307206; representative patches='+str([sum(len(payload)+6 for _, payload in regions) for regions in plans]), flush=True)
        coarse = [update_regions(frames[a][1], frames[b][1], 16) for a, b in [(0, 1), (0, 4), (4, 12)]]
        print('COMPARE_16PX_BYTES: '+str([sum(len(payload)+6 for _, payload in regions) for regions in coarse]), flush=True)
        if cluster_centers:
            steady_bytes=[]
            for old_frame,new_frame in zip(frames,frames[1:]):
                old_scene,old=old_frame
                new_scene,new=new_frame
                reconstructed=bytearray(old)
                regions=update_regions(old,new,clusters=cluster_centers[new_scene])
                for (x,y,right,bottom),payload in regions:
                    stride=(right-x)*2
                    for row in range(y,bottom):
                        reconstructed[(row*WIDTH+x)*2:(row*WIDTH+right)*2]=payload[(row-y)*stride:(row-y+1)*stride]
                assert reconstructed==new, 'Every exported transition must reconstruct exactly'
                if old_scene==new_scene and regions:
                    steady_bytes.append(sum(len(payload)+6 for _,payload in regions))
            print('CLUSTER_CHECK: '+json.dumps({'transitions_reconstructed':len(frames)-1,'mean_moving_update_bytes':round(sum(steady_bytes)/len(steady_bytes)) if steady_bytes else 0,'max_moving_update_bytes':max(steady_bytes,default=0),'source_samples_per_second':sample_fps}),flush=True)
        print(f'CHECKED: {len(frames)} RGB565 little-endian frames; '+('persistent face only' if args.stay else '60-second tour')+f'; requested brightness {args.brightness}% (wire {wire_brightness}); fixed orientation 101.', flush=True)
        return
    if not PORT.exists():
        raise RuntimeError('Designated TURMO serial device is missing')
    pid = int(subprocess.check_output(['systemctl', '--user', 'show', SERVICE, '--property=MainPID', '--value'], text=True).strip())
    if pid <= 0:
        raise RuntimeError('Expected active dashboard service; nothing changed')
    process_dir = Path('/proc') / str(pid)
    cmdline = (process_dir / 'cmdline').read_bytes().split(b'\0')
    if len(cmdline) < 2 or cmdline[1].decode() != LAUNCHER:
        raise RuntimeError('PID is not the named monitoring dashboard; nothing stopped')
    if process_dir.stat().st_uid != os.getuid():
        raise RuntimeError('Dashboard is not owned by the current user')
    log = args.frames / f'dashboard-restored-{time.time_ns()}.log'
    stopped = False
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, lambda *_: stop.set())
    try:
        if (process_dir / 'cmdline').read_bytes().split(b'\0') != cmdline:
            raise RuntimeError('Dashboard identity changed before handover')
        stopped = True
        subprocess.run(['systemctl', '--user', 'stop', SERVICE], check=True, timeout=15)
        print('DASHBOARD_PAUSED: user service stopped temporarily; collectors unchanged.', flush=True)
        with serial.Serial(str(PORT), 115200, timeout=2, write_timeout=5,
                           rtscts=True, exclusive=True) as screen:
            screen.reset_input_buffer()
            screen.write(bytes([69]) * 6)
            screen.flush()
            if screen.read(6) != bytes([1]) * 6:
                raise RuntimeError('Unexpected handshake; no display commands sent')
            screen.write(command(109))
            screen.write(command(110, x=wire_brightness))
            orientation = bytearray(16)
            orientation[5:11] = bytes((121, 101, 1, 64, 1, 224))
            screen.write(orientation)
            screen.flush()
            stop.wait(0.1)
            start = time.monotonic()
            announced = set()
            previous_pixels = None
            previous_index = 0
            budget = DisplayBudget()
            rim_last = None
            rim_intervals = []
            measured_full = measured_delta = False
            sent_frames = 0
            rate_epoch = None
            rate_count = 0
            rate_printed = False
            while not stop.is_set():
                sample_time = time.monotonic() - start
                index = frame_index(sample_time, args.stay, len(frames), sample_fps)
                if index is None:
                    break
                scene, pixels = frames[index]
                if pixels != previous_pixels:
                    planning = time.monotonic()
                    delta = previous_pixels is not None
                    prioritised = priority_enabled and delta
                    regions = budget.plan(previous_pixels,pixels,cluster_centers.get(scene),sample_time,(bar_angles[previous_index],bar_angles[index])) if prioritised else update_regions(previous_pixels, pixels, clusters=cluster_centers.get(scene))
                    planning_ms = (time.monotonic() - planning) * 1000
                    sending = time.monotonic()
                    deadline = start + (int(sample_time*sample_fps)+1)/sample_fps
                    shadow,delivered,rim_completed = transmit_regions(screen,regions,previous_pixels,deadline,budget if prioritised else None)
                    if rim_completed is not None and not rate_printed:
                        now = rim_completed
                        if rim_last is not None:
                            rim_intervals.append(now-rim_last)
                        rim_last = now
                    sending_ms = (time.monotonic() - sending) * 1000
                    if (delta and not measured_delta) or (not delta and not measured_full):
                        print('PERF: '+json.dumps({'kind':'partial' if delta else 'full','bytes':sum(len(payload)+6 for _, payload in delivered),'regions':len(delivered),'deferred_regions':len(regions)-len(delivered),'priority_scheduler':prioritised,'planning_ms':round(planning_ms,2),'serial_write_flush_ms':round(sending_ms,2)}), flush=True)
                        if delta:
                            measured_delta = True
                        else:
                            measured_full = True
                    previous_pixels = shadow if prioritised else pixels
                    previous_index = index
                    sent_frames += 1
                    if rate_epoch is None:
                        rate_epoch = time.monotonic()
                    else:
                        rate_count += 1
                    rate_elapsed = time.monotonic() - rate_epoch
                    if sample_fps >= 8 and not rate_printed and rate_elapsed >= 6:
                        print('PERF_RATE: '+json.dumps({'source_fps':sample_fps,'delivered_updates_per_second':round(rate_count/rate_elapsed,2),'interval_seconds':round(rate_elapsed,2),'updates':rate_count,'rim_max_interval_ms':round(max(rim_intervals,default=0)*1000,2),'priority_scheduler':priority_enabled,'scope':'single bounded startup window, includes cue transitions; updates may be partial'}),flush=True)
                        rate_printed = True
                if scene not in announced:
                    print(('RUNNING: ' if not announced else 'SCENE_TARGET: ') + scene + '; synthetic display target', flush=True)
                    announced.add(scene)
                if args.ready_fd is not None and sent_frames >= 2 and (sample_fps < 8 or rate_printed):
                    os.write(args.ready_fd, b'FIRST_FRAME_SENT')
                    os.close(args.ready_fd)
                    args.ready_fd = None
                next_sample = (int(sample_time * sample_fps) + 1) / sample_fps
                stop.wait(max(0, start + next_sample - time.monotonic()))
            print('TOUR_FINISHED: port closing; restoring dashboard.', flush=True)
    finally:
        if stopped:
            subprocess.run(['systemctl', '--user', 'start', SERVICE], check=True, timeout=15)
            invocation = subprocess.check_output(['systemctl', '--user', 'show', SERVICE, '--property=InvocationID', '--value'], text=True).strip()
            if not invocation:
                raise RuntimeError('No dashboard service invocation after restart')
            print('DASHBOARD_RESTARTED: same user service; waiting for first-frame event.', flush=True)
            journal = subprocess.Popen(['journalctl', '--user', '_SYSTEMD_INVOCATION_ID=' + invocation,
                                        '--follow', '--output=cat', '--no-pager'], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
            try:
                with selectors.DefaultSelector() as events, log.open('xb') as output:
                    events.register(journal.stdout, selectors.EVENT_READ)
                    deadline = time.monotonic() + 12
                    received = b''
                    confirmed = False
                    while time.monotonic() < deadline:
                        if not events.select(max(0, deadline - time.monotonic())):
                            break
                        data = os.read(journal.stdout.fileno(), 4096)
                        if not data:
                            break
                        output.write(data)
                        received = (received + data)[-8192:]
                        if b'RUNNING: dashboard; first frame sent' in received:
                            print('RESTORED: dashboard reports its first frame sent.', flush=True)
                            confirmed = True
                            break
                    if not confirmed:
                        raise RuntimeError('Dashboard did not confirm its first frame; see ' + str(log))
            finally:
                journal.terminate()
                journal.wait(timeout=3)


if __name__ == '__main__':
    main()
