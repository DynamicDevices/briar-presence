"""Offline acceptance checks for the five selected expressive-display changes."""
import argparse
import json
from collections import defaultdict
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('fixture',type=Path)
args=parser.parse_args()
manifest=json.loads((args.fixture/'manifest.json').read_text())
assert manifest['variant']=='expressive-work-streams'
assert manifest['synthetic'] is True and manifest['fps']==8
frames=manifest['frames']
assert len(frames)==480
scenes=defaultdict(list)
for i,frame in enumerate(frames):
    scenes[frame['scene']].append((i,frame))
    streams=frame['streams']
    assert [s['id'] for s in streams]==['orchard','beacon']
    assert [s['shape'] for s in streams]==['circle','diamond']
    assert streams[0]['concern'] is False
    if frame['scene'] in ('Holding a concern','Waiting for a choice','Correction / rethink','Urgent','Disconnected'):
        assert streams[1]['concern'] is True,frame['scene']
    if frame['scene'] in ('Resolution','Simulated resolution'):
        assert streams[1]['concern'] is False
    if frame['scene']=='Disconnected':
        assert frame['sourceFresh'] is False and not frame['transitioning']
        assert all(s['state']=='unknown' and s['fresh'] is False for s in streams)
    else:
        assert frame['sourceFresh'] is True
assert len(scenes)==12
for scene,entries in scenes.items():
    stable=[f for _,f in entries if not f['transitioning']]
    assert len(stable)>=2,'No settled samples in '+scene
    with Image.open(args.fixture/stable[0]['file']) as a,Image.open(args.fixture/stable[-1]['file']) as b:
        assert ImageChops.difference(a.convert('RGB'),b.convert('RGB')).getbbox() is not None,'No within-mode motion in '+scene
    if scene!='Disconnected':
        assert any(f['transitioning'] for _,f in entries),'No staged transition in '+scene
unknown=[f for _,f in scenes['Disconnected']]
with Image.open(args.fixture/unknown[0]['file']) as a,Image.open(args.fixture/unknown[-1]['file']) as b:
    difference=ImageChops.difference(a.convert('RGB'),b.convert('RGB'))
    mask=Image.new('L',a.size,0)
    ImageDraw.Draw(mask).ellipse((29,54,291,404),fill=255)
    assert Image.composite(difference,Image.new('RGB',a.size,0),mask).getbbox() is None
    assert difference.crop((0,416,320,480)).getbbox() is None,'Unknown stream/concern labels changed'
assert all(s['state']=='working' for s in scenes['Focused work'][0][1]['streams'])
assert scenes['Holding a concern'][0][1]['streams'][0]['state']=='working'
assert scenes['Holding a concern'][0][1]['streams'][1]['state']=='decision needed'
print('PASS: 8Hz source; 12 moving modes; staged cluster transitions; stable named/shape-coded concurrent streams; concern ownership and explicit resolution; frozen unknown field and preserved concern labels. Browser appearance still needs human feedback.')
