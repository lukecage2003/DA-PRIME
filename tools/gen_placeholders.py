"""Génère des illustrations de substitution (styles variés) pour tester le système Primestone.
Usage : python3 tools/gen_placeholders.py <dossier_sortie>"""
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFilter
out = sys.argv[1]; rng = np.random.default_rng(7)

def noise(h, w, octaves=6):
    acc = np.zeros((h, w)); amp = 1; tot = 0
    for o in range(octaves):
        s = 2 ** (o + 2)
        g = rng.random((s, int(s * w / h) + 1))
        im = Image.fromarray((g * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
        acc += np.asarray(im) / 255 * amp; tot += amp; amp *= .5
    return acc / tot

# A — Cosmos peint : nébuleuse, planète, silhouette lumineuse
W, H = 1600, 900
n1, n2 = noise(H, W), noise(H, W)
c1 = np.array([60, 20, 110]); c2 = np.array([230, 60, 140]); c3 = np.array([20, 150, 170]); bg = np.array([6, 6, 18])
t = np.clip((n1 - .35) * 2.2, 0, 1)[..., None]; u = np.clip((n2 - .45) * 2.5, 0, 1)[..., None]
img = bg * (1 - t) + c1 * t; img = img * (1 - u * .8) + c2 * u * .8
img = img + c3 * np.clip((n2 - .62) * 3, 0, 1)[..., None] * .6
yy, xx = np.mgrid[0:H, 0:W]
cx, cy, r = 1250, 640, 330
d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2); m = d < r
shade = np.clip(((xx - cx) * -.6 + (yy - cy) * -.8) / r * .5 + .5, 0, 1)
planet = np.dstack([90 + 120 * shade, 50 + 70 * shade, 30 + 20 * shade]) * (.75 + .25 * n1[..., None])
img[m] = planet[m]
rim = np.exp(-((d - r) / 10) ** 2)[..., None] * np.array([255, 229, 0]) * .9
img = np.clip(img + rim, 0, 255)
s = rng.random((H, W)) > .9975; img[s] = 255
im = Image.fromarray(img.astype(np.uint8))
glow = Image.new('L', (W, H), 0); g = ImageDraw.Draw(glow)
fx, fy = 520, 470
fig = [(fx-14,fy-110),(fx+14,fy-110),(fx+18,fy-80),(fx+150,fy-120),(fx+155,fy-108),(fx+30,fy-50),(fx+28,fy+40),(fx+45,fy+170),(fx+28,fy+172),(fx,fy+60),(fx-28,fy+172),(fx-45,fy+170),(fx-28,fy+40),(fx-30,fy-50),(fx-155,fy-108),(fx-150,fy-120),(fx-18,fy-80)]
g.polygon(fig, fill=255); g.ellipse((fx-26, fy-170, fx+26, fy-112), fill=255)
halo = glow.filter(ImageFilter.GaussianBlur(40))
arr = np.asarray(im).astype(float); h = np.asarray(halo)[..., None] / 255; f = np.asarray(glow)[..., None] / 255
arr = arr + h * np.array([255, 220, 120]) * 1.2; arr = arr * (1 - f) + f * np.array([255, 250, 225])
Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(f'{out}/art-cosmos.jpg', quality=86)

# B — Noir encré : skyline, pluie, silhouette à cape
im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im)
for y in range(H):
    k = y / H; d.line([(0, y), (W, y)], fill=(int(14 + 20 * k), int(18 + 22 * k), int(34 + 30 * k)))
d.ellipse((1080, 90, 1380, 390), fill=(236, 232, 214))
x = 0
while x < W:
    bw = int(rng.integers(70, 170)); bh = int(rng.integers(260, 620))
    d.rectangle((x, H - bh, x + bw, H), fill=(8, 9, 14))
    for wy in range(H - bh + 20, H, 28):
        for wx in range(x + 10, x + bw - 10, 22):
            if rng.random() > .86: d.rectangle((wx, wy, wx + 8, wy + 12), fill=(255, 214, 90))
    x += bw + int(rng.integers(0, 12))
d.polygon([(560, 640), (900, 640), (880, 900), (580, 900)], fill=(4, 4, 6))
cx, cy = 730, 640
cape = [(cx-20,cy-200),(cx+20,cy-200),(cx+30,cy-170),(cx+150,cy-120),(cx+220,cy-10),(cx+170,cy+5),(cx+110,cy-20),(cx+60,cy),(cx-60,cy),(cx-110,cy-20),(cx-170,cy+5),(cx-220,cy-10),(cx-150,cy-120),(cx-30,cy-170)]
d.polygon(cape, fill=(2, 2, 4))
d.polygon([(cx-22,cy-200),(cx-26,cy-240),(cx-12,cy-215),(cx+12,cy-215),(cx+26,cy-240),(cx+22,cy-200),(cx+18,cy-175),(cx-18,cy-175)], fill=(2,2,4))
d.polygon([(cx-12,cy-205),(cx-3,cy-200),(cx-12,cy-198)], fill=(255,255,255)); d.polygon([(cx+12,cy-205),(cx+3,cy-200),(cx+12,cy-198)], fill=(255,255,255))
rain = Image.new('L', (W, H), 0); rd = ImageDraw.Draw(rain)
for _ in range(900):
    rx, ry = rng.integers(0, W), rng.integers(0, H); rd.line([(rx, ry), (rx - 8, ry + 40)], fill=int(rng.integers(40, 110)), width=1)
arr = np.asarray(im).astype(float) + np.asarray(rain)[..., None] * .7
Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(f'{out}/art-noir.jpg', quality=86)

# C — Encre liquide (créature symbiotique), PNG transparent
S = 1200; n = noise(S, S, 5); yy, xx = np.mgrid[0:S, 0:S]
dist = np.sqrt(((xx - S/2) / (S*.42)) ** 2 + ((yy - S*.48) / (S*.46)) ** 2)
field = 1.15 - dist + (n - .5) * .9
ink = field > .5
a = (ink * 255).astype(np.uint8)
rgb = np.zeros((S, S, 3), np.uint8) + 8
hl = (np.abs(field - .62) < .012) | (np.abs(field - .85) < .008)
rgb[hl & ink] = (70, 80, 110)
im = Image.fromarray(np.dstack([rgb, a])); d = ImageDraw.Draw(im)
d.polygon([(330,470),(560,520),(540,600),(380,560),(300,500)], fill=(255,255,255,255))
d.polygon([(870,470),(640,520),(660,600),(820,560),(900,500)], fill=(255,255,255,255))
mouth = [(380,720)]
for i in range(12): mouth += [(380 + i*37 + 18, 720 + (60 if i % 2 == 0 else 0))]
mouth += [(820,720),(780,800),(420,800)]
d.polygon([(380,720),(820,720),(780,820),(420,820)], fill=(180,20,40,255))
for i in range(11):
    x0 = 395 + i*38; d.polygon([(x0,720),(x0+34,720),(x0+17,770)], fill=(255,255,255,255)); d.polygon([(x0+10,820),(x0+40,820),(x0+25,780)], fill=(255,255,255,255))
im = im.filter(ImageFilter.SMOOTH)
im.save(f'{out}/art-encre.png')

# D — Pop-art tramé (gros plan d'œil)
im = Image.new('RGB', (W, H), (250, 214, 190)); d = ImageDraw.Draw(im)
for y in range(0, H, 16):
    for x in range((y // 16 % 2) * 8, W, 16): d.ellipse((x-4, y-4, x+4, y+4), fill=(235, 120, 120))
d.ellipse((380, 180, 1220, 720), fill=(255, 255, 255), outline=(10, 10, 10), width=16)
d.ellipse((640, 240, 960, 660), fill=(40, 120, 220), outline=(10, 10, 10), width=12)
for y in range(250, 660, 12):
    for x in range(650, 960, 12):
        if (x-800)**2/160**2 + (y-450)**2/210**2 < 1: d.ellipse((x-3, y-3, x+3, y+3), fill=(20, 70, 160))
d.ellipse((730, 360, 870, 540), fill=(10, 10, 10)); d.ellipse((770, 380, 820, 430), fill=(255, 255, 255))
d.arc((340, 120, 1260, 760), 195, 345, fill=(10, 10, 10), width=30)
for i in range(9):
    x = 450 + i * 90; d.line([(x, 205 - abs(i-4)*8), (x - 30 + i*8, 120 - abs(i-4)*12)], fill=(10, 10, 10), width=12)
d.polygon([(1150, 640), (1180, 720), (1150, 780), (1120, 720)], fill=(170, 220, 255), outline=(10,10,10))
d.arc((300, 20, 1300, 300), 200, 340, fill=(10, 10, 10), width=24)
im.save(f'{out}/art-pop.jpg', quality=88)
print('ok')
