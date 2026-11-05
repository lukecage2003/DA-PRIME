"""Vectorisation PROVISOIRE (NON OFFICIELLE) du logo Primestone à partir des bitmaps d'origine.
Ne modifie pas les originaux. Usage : python3 tools/vectorize_logo.py
Sorties : brand/01_logo/NON-OFFICIEL/*.svg + masques de référence pour la comparaison."""
import json, numpy as np, potrace
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
ORIG = ROOT / 'brand/00_originaux'; OUT = ROOT / 'brand/01_logo/NON-OFFICIEL'; OUT.mkdir(parents=True, exist_ok=True)
REF = OUT / '_reference'; REF.mkdir(exist_ok=True)

JOBS = {
  # nom : (fichier, fonction de masque, échelle de suréchantillonnage)
  'PS_LOGO_logotype': ('PS_LOGO_logotype-slogan_original.png', lambda a: a[..., 1] * (a[..., 2] < 0.45 * a[..., 1] + 4), 8),
  'PS_LOGO_icone-P':  ('PS_LOGO_icone-P_original.png',          lambda a: a[..., 1] * (a[..., 2] < 0.45 * a[..., 1] + 4), 16),
}
PARAMS = dict(turdsize=4, alphamax=0.75, opticurve=True, opttolerance=0.15)

def fmt(v): return f'{v:.3f}'.rstrip('0').rstrip('.')

def trace(mask, scale):
    h, w = mask.shape
    big = Image.fromarray(mask.astype(np.uint8)).resize((w * scale, h * scale), Image.BICUBIC)
    bm = potrace.Bitmap(np.asarray(big) < 128)  # potracer trace les pixels False
    d = []
    for curve in bm.trace(**PARAMS):
        sx, sy = curve.start_point.x, curve.start_point.y
        d.append(f'M{fmt(sx/scale)} {fmt(sy/scale)}')
        for s in curve.segments:
            if s.is_corner:
                d.append(f'L{fmt(s.c.x/scale)} {fmt(s.c.y/scale)}L{fmt(s.end_point.x/scale)} {fmt(s.end_point.y/scale)}')
            else:
                d.append(f'C{fmt(s.c1.x/scale)} {fmt(s.c1.y/scale)} {fmt(s.c2.x/scale)} {fmt(s.c2.y/scale)} {fmt(s.end_point.x/scale)} {fmt(s.end_point.y/scale)}')
        d.append('Z')
    return ''.join(d)

report = {}
for name, (fn, maskf, scale) in JOBS.items():
    a = np.asarray(Image.open(ORIG / fn).convert('RGB')).astype(float)
    m = np.clip(maskf(a) * 255 / maskf(a).max(), 0, 255)
    ys, xs = np.where(m > 128); pad = 6
    x0, x1, y0, y1 = xs.min() - pad, xs.max() + pad + 1, ys.min() - pad, ys.max() + pad + 1
    crop = m[y0:y1, x0:x1]
    Image.fromarray(crop.astype(np.uint8)).save(REF / f'{name}_masque-original.png')
    d = trace(crop, scale)
    h, w = crop.shape
    for variant, fill in {'jaune': '#FFE500', 'noir': '#111111', 'blanc': '#FFFFFF'}.items():
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">\n'
               f'<!-- PRIMESTONE · VECTORISATION PROVISOIRE NON OFFICIELLE · source : {fn} · ne pas diffuser comme logo officiel -->\n'
               f'<title>{name} (NON OFFICIEL)</title>\n<path fill="{fill}" fill-rule="evenodd" d="{d}"/>\n</svg>\n')
        (OUT / f'{name}_{variant}_NON-OFFICIEL.svg').write_text(svg)
    report[name] = dict(source=fn, crop_px=[int(x0), int(y0), int(w), int(h)], upscale=scale, potrace=PARAMS, path_chars=len(d))
(REF / 'vectorisation.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=1))
