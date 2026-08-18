#!/usr/bin/env python3
"""Bouwt de GIF en de statische PNG uit de gerenderde frames.

Harde regels:
  · het eerste frame en het laatste frame zijn hetzelfde beeld als de PNG;
  · de stille aanloop is een frame met een lange vertraging, geen 16 losse frames;
  · geen lus. De Netscape-lusblok wordt niet geschreven, dus de GIF speelt een keer.
"""
import json, os, sys
from PIL import Image, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
FR = os.path.join(HERE, '..', 'assets', 'frames')
OUT = os.path.join(HERE, '..', 'assets')

meta = json.load(open(os.path.join(FR, 'times.json')))
times, spec = meta['times'], meta['spec']

names = sorted(f for f in os.listdir(FR) if f.endswith('.png'))
frames = [Image.open(os.path.join(FR, n)).convert('RGB') for n in names]
rest = frames[0]

# Het laatste frame is opnieuw het rustframe. Bewijs dat het identiek is.
seq = frames + [rest]
delays = [int(spec['appear'] * 1000)] + [int(1000 / spec['fps'])] * (len(frames) - 1) \
         + [int((spec['duration'] - spec['motionEnd']) * 1000)]
assert len(seq) == len(delays), (len(seq), len(delays))
assert sum(delays) == int(spec['duration'] * 1000), sum(delays)

def build(colors, path):
    montage = Image.new('RGB', (rest.width, rest.height * len(seq)))
    for i, f in enumerate(seq):
        montage.paste(f, (0, i * rest.height))
    pal = montage.convert('P', palette=Image.Palette.ADAPTIVE, colors=colors, dither=Image.Dither.NONE)
    q = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in seq]
    q[0].save(path, save_all=True, append_images=q[1:], duration=delays,
              disposal=1, optimize=True)   # geen loop parameter, dus geen lus
    err = max(max(ImageChops.difference(f, qi.convert('RGB')).getextrema(),
                  key=lambda x: x[1])[1] for f, qi in zip(seq, q))
    return os.path.getsize(path), err

results = []
for c in (32, 64, 128, 256):
    p = os.path.join(OUT, f'_test-{c}.gif')
    size, err = build(c, p)
    results.append((c, size, err))
    print(f'palet {c:3d}  {size/1024:7.1f} kB   maximale kleurafwijking {err:3d}/255')

choice = int(sys.argv[1]) if len(sys.argv) > 1 else 128
final = os.path.join(OUT, 'maculis-seal-perceive-v1.gif')
size, err = build(choice, final)
rest.save(os.path.join(OUT, 'maculis-seal-rest-v1.png'), optimize=True)
for c, _, _ in results:
    os.remove(os.path.join(OUT, f'_test-{c}.gif'))

png = os.path.getsize(os.path.join(OUT, 'maculis-seal-rest-v1.png'))
gif = Image.open(final)
gif.seek(0); first = gif.convert('RGB').copy()
gif.seek(gif.n_frames - 1); last = gif.convert('RGB').copy()
identical = ImageChops.difference(first, last).getbbox() is None

print()
print(f'GIF   {size/1024:.1f} kB, {gif.n_frames} frames, palet {choice}, afwijking {err}/255')
print(f'PNG   {png/1024:.1f} kB, {rest.width} bij {rest.height}')
print(f'eerste frame gelijk aan laatste frame: {identical}')
print(f'Netscape lusblok aanwezig: {b"NETSCAPE" in open(final, "rb").read()}')
