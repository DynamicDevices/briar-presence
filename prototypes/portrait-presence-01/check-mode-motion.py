"""Check within-mode motion without treating decorative motion as source data."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('fixture',type=Path)
args=parser.parse_args()
manifest=json.loads((args.fixture/'manifest.json').read_text())
assert manifest['variant']=='ongoing-mode-highlights'
scenes={}
for frame in manifest['frames']:
    scenes.setdefault(frame['scene'],[]).append(frame['file'])
for scene,files in scenes.items():
    assert len(files)>3,scene
    with Image.open(args.fixture/files[0]) as first,Image.open(args.fixture/files[3]) as later:
        assert ImageChops.difference(first.convert('RGB'),later.convert('RGB')).getbbox() is not None,'No ongoing motion in '+scene
unknown=scenes['Disconnected']
with Image.open(args.fixture/unknown[0]) as first,Image.open(args.fixture/unknown[12]) as later:
    difference=ImageChops.difference(first.convert('RGB'),later.convert('RGB'))
    interior=Image.new('L',first.size,0)
    ImageDraw.Draw(interior).ellipse((29,64,291,414),fill=255)
    masked=Image.composite(difference,Image.new('RGB',first.size,0),interior)
    assert masked.getbbox() is None,'Unknown data field must remain frozen'
    assert difference.crop((0,426,320,480)).getbbox() is None,'Unknown/concern captions must remain unchanged'
print('PASS: ongoing motion in all '+str(len(scenes))+' mode captions; disconnected motion stays outside the frozen data field; unknown and open-concern labels remain unchanged.')
