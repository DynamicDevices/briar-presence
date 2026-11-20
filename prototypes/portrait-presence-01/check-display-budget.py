"""Deterministic transport-budget regression tests. Assisted-by: Briar."""
import importlib.util
import math
import sys
from pathlib import Path

spec = importlib.util.spec_from_file_location('tour',Path(__file__).with_name('turmo-tour.py'))
tour = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tour)


class Transport:
    def __init__(self):
        self.now = 0
        self.data = bytearray()

    def clock(self):
        return self.now

    def write(self,data):
        self.data.extend(data)
        self.now += len(data)/160000

    def flush(self):
        self.now += .0001


blank = bytes(tour.WIDTH*tour.HEIGHT*2)
target = bytes([255])*len(blank)
budget = tour.DisplayBudget()
plan = budget.plan(blank,target,None,0)
assert plan and all(len(payload)<=5120 for _,payload in plan)
assert all(box[0]%4==box[1]%4==0 for box,_ in plan)
priorities = [0 if tour.rim_tile(box[0],box[1]) else 1 if box[1]>=416 else 2 for box,_ in plan]
assert priorities == sorted(priorities), 'Rim, status, face ordering'
for step in range(720):
    angle = step*math.pi/360
    for offset in (-2,0,2):
        x = int(160+(139+offset)*math.cos(angle))
        y = int(229+(183+offset)*math.sin(angle))
        assert tour.rim_tile(x//4*4,y//4*4), 'Every bar edge must have priority'
for head in (0,1,3,6):
    for step in range(71):
        angle = head-step/100
        for offset in (-2,0,2):
            x = int(160+(139+offset)*math.cos(angle))
            y = int(229+(183+offset)*math.sin(angle))
            assert tour.rim_tile(x//4*4,y//4*4,angles=(head,)), 'Arc priority must cover the entire bar'

# Apply every chunk and reconstruct the target, even at split boundaries.
shadow = bytearray(blank)
for region in plan:
    tour.apply_region(shadow,region)
assert shadow == target

# Nonuniform pixels expose incorrect strides when a rectangle splits sideways.
pattern = bytes(range(256))*(len(blank)//256)
shadow = bytearray(blank)
for region in tour.bounded_regions([((0,0,tour.WIDTH,tour.HEIGHT),pattern)],tile=4):
    tour.apply_region(shadow,region)
assert shadow == pattern, 'Horizontal and vertical splits preserve exact pixels'

# An overloaded all-pixel change must yield, while completing all rim patches.
transport = Transport()
shadow,sent,rim_done = tour.transmit_regions(transport,plan,blank,.125,budget,transport.clock)
assert 0 < len(sent) < len(plan)
assert rim_done is not None
assert shadow != target, 'Partial delivery must not pretend the entire frame arrived'
assert budget.dirty_since, 'Deferred work retains its waiting age'
for (x,y,right,bottom),_ in sent:
    assert all((left//4,top//4) not in budget.dirty_since for top in range(y,bottom,4) for left in range(x,right,4)), 'Delivered tiles reset their waiting age'
for region in plan:
    if tour.rim_tile(region[0][0],region[0][1]):
        assert region in sent

# Abandon the unsent old target. Replan from the real shadow to a newer target.
latest = bytes([85])*len(blank)
next_plan = budget.plan(shadow,latest,None,1)
for region in next_plan:
    tour.apply_region(shadow,region)
assert shadow == latest, 'Skipped frames must not corrupt the shadow framebuffer'
assert not budget.plan(shadow,latest,None,2), 'Identical pixels generate no traffic'

# Under repeated deadlines, even low-priority dirty face tiles eventually arrive.
budget = tour.DisplayBudget()
transport = Transport()
shadow = bytearray(blank)
for tick in range(80):
    transport.now = max(transport.now,tick*.125)
    plan = budget.plan(shadow,target,None,tick)
    if not plan:
        break
    shadow,_,_ = tour.transmit_regions(transport,plan,shadow,transport.now+.125,budget,transport.clock)
assert shadow == target, 'Deferred face changes must not starve'

# A moving face must get fair service too, not just an unchanging target.
budget = tour.DisplayBudget()
transport = Transport()
shadow = bytearray(blank)
seen = set()
expected = {(x,y) for y in range(128,320,4) for x in range(112,208,4)}
for tick in range(24):
    moving = bytearray(blank)
    for y in range(128,320):
        moving[(y*tour.WIDTH+112)*2:(y*tour.WIDTH+208)*2] = bytes([tick+1])*192
    plan = budget.plan(shadow,moving,None,tick)
    shadow,sent,_ = tour.transmit_regions(transport,plan,shadow,transport.now+.04,budget,transport.clock)
    for (x,y,right,bottom),_ in sent:
        seen.update((left,top) for top in range(y,bottom,4) for left in range(x,right,4))
assert expected <= seen, 'Continuously changing face tiles must not starve'

# Neither narrow columns nor broad rows may become long visible sweeps.
for box in ((0,0,4,480),(0,0,320,4),(0,0,320,480)):
    x,y,right,bottom = box
    chunks = tour.bounded_regions([(box,bytes((right-x)*(bottom-y)*2))],tile=4)
    assert all(r-x<=32 and b-y<=32 and len(p)<=5120 for (x,y,r,b),p in chunks), 'Bound both patch dimensions'
    assert sum(len(p) for _,p in chunks) == (right-x)*(bottom-y)*2

# Equal-age background patches should not march down a scanline frontier.
budget = tour.DisplayBudget()
moving = bytearray(blank)
for y in range(128,320):
    moving[(y*tour.WIDTH+112)*2:(y*tour.WIDTH+208)*2] = bytes([85])*192
plan = budget.plan(blank,moving,None,0)
assert max(box[1] for box,_ in plan[:4])-min(box[1] for box,_ in plan[:4])>=64, 'Disperse equal-age face patches'
print('PASS: rim coverage/order; bounded atomic patches; overload yields; actual-frame shadow; newest-target replanning; eventual background delivery.')
print('PASS: continuously animated face fairness; two-dimensional patch bounds; spatially dispersed updates.')

if len(sys.argv)>1:
    frames,fps,clusters,angles = tour.load_frames(Path(sys.argv[1]),True,True)
    assert angles
    budget = tour.DisplayBudget()
    transport = Transport()
    shadow = bytearray(frames[0][1])
    last_rim = None
    intervals = []
    deferred = 0
    for tick in range(1,len(frames)):
        transport.now = max(transport.now,tick/fps)
        scene,pixels = frames[tick]
        plan = budget.plan(shadow,pixels,clusters.get(scene),tick/fps,(angles[tick-1],angles[tick]))
        shadow,sent,rim_done = tour.transmit_regions(transport,plan,shadow,(tick+1)/fps,budget,transport.clock)
        deferred += len(plan)-len(sent)
        for region in plan:
            if budget.is_rim(region[0][0],region[0][1]):
                assert region in sent, 'Actual fixture rim must never be deferred'
        if rim_done is not None:
            if last_rim is not None:
                intervals.append(rim_done-last_rim)
            last_rim = rim_done
    print(f'FIXTURE_SIMULATION: {len(frames)} targets; deferred patches={deferred}; max rim interval={max(intervals)*1000:.2f}ms at simulated 160000 bytes/s. Not hardware measurement.')
