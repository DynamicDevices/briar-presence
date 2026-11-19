"""Package the accepted TURMO study only. No Git/USB/network. Assisted-by: Briar."""
import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path
import tarfile

VERSION = 'turmo-v0.1.0-alpha.1'
ROOT = Path(__file__).resolve().parents[2]
PROTO = Path('prototypes/portrait-presence-01')
FILES = [
    'index.html', 'README.md', 'check.cjs', 'check-browser.cjs',
    'chat-demo-state.js', 'chat-carousel-renderer.js', 'expressive-renderer.js',
    'turmo-tour.py', 'check-chat-state.cjs', 'check-chat-render.py',
    'check-display-budget.py', 'check-mode-motion.py', 'check-expressive.py',
    'requirements-alpha.txt', 'package-alpha.py',
]
SOURCES = [PROTO / name for name in FILES] + [
    Path('LICENSE'), Path('wiki/TURMO-Protocol.md'),
    Path('design/studies/03-motion/motion-study.html'),
    Path(f'releases/{VERSION}/RELEASE.md'),
]


def build(destination, files):
    """Read once, record exact identities, then create and verify an immutable pack."""
    content = {str(target): source.read_bytes() for target,source in files}
    manifest = {name: hashlib.sha256(data).hexdigest() for name,data in sorted(content.items())}
    content['CONTENTS.sha256.json'] = (json.dumps(manifest,indent=2,sort_keys=True)+'\n').encode()
    with destination.open('xb') as raw, gzip.GzipFile(fileobj=raw,mode='wb',filename='',mtime=0) as compressed:
        with tarfile.open(fileobj=compressed,mode='w') as archive:
            for name,data in sorted(content.items()):
                info = tarfile.TarInfo(f'{VERSION}/{name}')
                info.size = len(data)
                info.mode = 0o644
                archive.addfile(info,io.BytesIO(data))
    # Verify the bytes inside the completed archive, not just the input list.
    with tarfile.open(destination,'r:gz') as archive:
        assert len(archive.getmembers()) == len(content)
        for name,data in content.items():
            assert archive.extractfile(f'{VERSION}/{name}').read() == data, name
    return hashlib.sha256(destination.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('fixture',type=Path)
    parser.add_argument('output',type=Path)
    args = parser.parse_args()
    fixture = args.fixture.resolve()
    manifest = json.loads((fixture/'manifest.json').read_text())
    if not (manifest.get('synthetic') is True and manifest.get('variant') == 'chat-carousel-aggregate'
            and len(manifest.get('frames',[])) == 480 and manifest.get('fps') == 8):
        raise ValueError('Expected the accepted synthetic carousel fixture')
    source_files = [(name,ROOT/name) for name in SOURCES]
    source_files.append((Path('RELEASE.md'),ROOT/f'releases/{VERSION}/RELEASE.md'))
    source_files.append((Path('requirements-alpha.txt'),ROOT/PROTO/'requirements-alpha.txt'))
    fixture_files = [(Path('fixtures/chat-carousel/manifest.json'),fixture/'manifest.json')]
    for frame in manifest['frames']:
        path = (fixture/frame['file']).resolve()
        if path.parent != fixture or path.suffix != '.png':
            raise ValueError('Fixture entry outside named directory')
        fixture_files.append((Path('fixtures/chat-carousel')/path.name,path))
    args.output.mkdir(parents=True,exist_ok=True)
    outputs = [
        (args.output/f'{VERSION}-source.tar.gz',source_files),
        (args.output/f'{VERSION}-hardware-test.tar.gz',source_files+fixture_files),
    ]
    for path,_ in outputs:
        if path.exists():
            raise FileExistsError(f'Refusing to overwrite release: {path}')
    checksums = []
    for path,files in outputs:
        digest = build(path,files)
        checksums.append(f'{digest}  {path.name}\n')
        print(f'VERIFIED: {path.name}; {path.stat().st_size} bytes; sha256={digest}',flush=True)
    with (args.output/'SHA256SUMS').open('x') as output:
        output.writelines(checksums)


if __name__ == '__main__':
    main()
