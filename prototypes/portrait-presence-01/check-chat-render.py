"""Generated-fixture checks, not real chat or panel telemetry."""
import argparse,json,math
from pathlib import Path
from PIL import Image,ImageChops,ImageDraw
p=argparse.ArgumentParser(description=__doc__);p.add_argument('fixture',type=Path);args=p.parse_args()
m=json.loads((args.fixture/'manifest.json').read_text());frames=m['frames']
assert m['variant']=='chat-carousel-aggregate' and m['fps']==8 and len(frames)==480
seen=set();changes=0;previous=None
for f in frames:
    assert len(f['streams'])==8 and len(f['page']['rows'])==2
    seen.update(f['page']['rows'])
    assert f['overall']['concerns']==sum(c['concern'] for c in f['streams'])
    assert f['overall']['active']==sum(c['fresh'] and c['state'] in ('working','revising','reviewing') for c in f['streams'])
    for weights in f['weights']:assert abs(sum(weights)-1)<1e-6 and min(weights)>-1e-6
    if previous and f['overall']['mode']!=previous['overall']['mode']:
        assert f['weights']==previous['weights'],'Retarget starts at the current geometry, never an anchor jump'
        changes+=1
    elif previous and not f['overall']['unknown']:
        target=f['overall']['mode']
        assert all(a[target]>=b[target]-1e-9 for a,b in zip(f['weights'],previous['weights'])),'Each group must advance smoothly, not change transition order mid-morph'
    if f['overall']['unknown']:
        assert all(not c['fresh'] and c['state']=='unknown' for c in f['streams'])
        assert f['overall']['concerns']>0
    assert .1<=f['bar']['speed']<=1.5
    if previous:assert f['bar']['angle']>=previous['bar']['angle']
    previous=f
assert len(seen)==8 and changes>3
assert frames[0]['weights']==frames[-1]['weights'],'Loop geometry must close without a snap'
def rgb(n):return Image.open(args.fixture/frames[n]['file']).convert('RGB')
a,b=rgb(46*8),rgb(50*8)
mask=Image.new('L',a.size,0);ImageDraw.Draw(mask).ellipse((29,54,291,404),fill=255)
assert Image.composite(ImageChops.difference(a,b),Image.new('RGB',a.size,0),mask).getbbox() is None,'Settled unknown data must stay frozen'
assert ImageChops.difference(a,b).getbbox() is not None,'Circumference bar must keep moving'
assert max(frames[i]['bar']['speed'] for i in range(39*8,43*8))>frames[50*8]['bar']['speed'],'Event speed changes'
assert math.dist(frames[41*8]['bar']['color'],frames[50*8]['bar']['color'])>0,'Event colour changes'
print('PASS: eight rotating demo chats; aggregate counts from all chats; continuous retarget/loop geometry; frozen unknown field; retained concerns; travelling event-colour/speed bar.')
