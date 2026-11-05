"""Compare le jaune proposé (#FFE500) aux jaunes mesurés dans les fichiers d'origine.
Usage : python3 tools/compare_yellow.py   Sorties : docs/assets/comparaison-jaunes.{json,svg}
Mesures : couleur dominante des pixels jaunes saturés, ΔE2000, contraste WCAG sur #000000 et #111111."""
import json, math, re
from collections import Counter
from pathlib import Path
from PIL import Image
import numpy as np
ROOT = Path(__file__).resolve().parents[1]; O = ROOT / 'brand/00_originaux'; OUT = ROOT / 'docs/assets'
SRC = {'icone-P': 'PS_LOGO_icone-P_original.png', 'logotype': 'PS_LOGO_logotype-slogan_original.png', 'miniature': 'PS_MIN_superman-espoir_original.png'}
PROPOSAL = '#FFE500'

def dominant(fn):
    a = np.asarray(Image.open(O / fn).convert('RGB')).reshape(-1, 3)
    c = Counter(map(tuple, a[(a[:, 0] > 180) & (a[:, 1] > 180) & (a[:, 2] < 80)].tolist()))
    (rgb, n), total = c.most_common(1)[0], sum(c.values())
    return '#%02X%02X%02X' % rgb, round(n / total * 100, 1)
def hex2rgb(h): return [int(h[i:i+2], 16) for i in (1, 3, 5)]
def lin(c): c /= 255; return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def lum(h): r, g, b = map(lin, hex2rgb(h)); return 0.2126 * r + 0.7152 * g + 0.0722 * b
def contrast(a, b): la, lb = sorted([lum(a), lum(b)], reverse=True); return round((la + 0.05) / (lb + 0.05), 2)
def lab(h):
    r, g, b = map(lin, hex2rgb(h))
    x, y, z = (0.4124*r + 0.3576*g + 0.1805*b) / 0.95047, 0.2126*r + 0.7152*g + 0.0722*b, (0.0193*r + 0.1192*g + 0.9505*b) / 1.08883
    f = lambda t: t ** (1/3) if t > 0.008856 else 7.787 * t + 16/116
    return 116*f(y) - 16, 500*(f(x) - f(y)), 200*(f(y) - f(z))
def de2000(h1, h2):
    L1, a1, b1 = lab(h1); L2, a2, b2 = lab(h2)
    C1, C2 = math.hypot(a1, b1), math.hypot(a2, b2); Cb = (C1 + C2) / 2
    G = 0.5 * (1 - math.sqrt(Cb**7 / (Cb**7 + 25**7))); a1p, a2p = a1*(1+G), a2*(1+G)
    C1p, C2p = math.hypot(a1p, b1), math.hypot(a2p, b2)
    h1p, h2p = math.degrees(math.atan2(b1, a1p)) % 360, math.degrees(math.atan2(b2, a2p)) % 360
    dL, dC = L2 - L1, C2p - C1p
    dh = 0 if C1p*C2p == 0 else (h2p - h1p if abs(h2p - h1p) <= 180 else h2p - h1p - 360 if h2p > h1p else h2p - h1p + 360)
    dH = 2 * math.sqrt(C1p*C2p) * math.sin(math.radians(dh / 2))
    Lb, Cbp = (L1 + L2) / 2, (C1p + C2p) / 2
    hb = (h1p + h2p) / 2 if abs(h1p - h2p) <= 180 else (h1p + h2p + 360) / 2 if h1p + h2p < 360 else (h1p + h2p - 360) / 2
    T = 1 - 0.17*math.cos(math.radians(hb-30)) + 0.24*math.cos(math.radians(2*hb)) + 0.32*math.cos(math.radians(3*hb+6)) - 0.20*math.cos(math.radians(4*hb-63))
    Sl = 1 + 0.015*(Lb-50)**2 / math.sqrt(20 + (Lb-50)**2); Sc = 1 + 0.045*Cbp; Sh = 1 + 0.015*Cbp*T
    Rt = -2*math.sqrt(Cbp**7/(Cbp**7+25**7)) * math.sin(math.radians(60*math.exp(-((hb-275)/25)**2)))
    return round(math.sqrt((dL/Sl)**2 + (dC/Sc)**2 + (dH/Sh)**2 + Rt*(dC/Sc)*(dH/Sh)), 2)

mes = {k: dict(zip(('hex', 'part_des_pixels_jaunes_pct'), dominant(f))) | {'source': f} for k, f in SRC.items()}
rows = [dict(nom=k, hex=v['hex'], deltaE2000_vs_proposition=de2000(PROPOSAL, v['hex']), contraste_sur_000000=contrast(v['hex'], '#000000'), contraste_sur_111111=contrast(v['hex'], '#111111')) for k, v in mes.items()]
res = dict(proposition=dict(hex=PROPOSAL, contraste_sur_000000=contrast(PROPOSAL, '#000000'), contraste_sur_111111=contrast(PROPOSAL, '#111111')),
           mesures_originales=mes, comparaison=rows, lecture="ΔE2000 < 1 : imperceptible ; 1-2 : visible de près ; 2-10 : visible d'un coup d'œil ; > 10 : couleurs différentes.")
OUT.mkdir(exist_ok=True); (OUT / 'comparaison-jaunes.json').write_text(json.dumps(res, indent=2, ensure_ascii=False) + '\n')

P = (ROOT / 'brand/01_logo/NON-OFFICIEL/PS_LOGO_icone-P_noir_NON-OFFICIEL.svg').read_text()
d, (vw, vh) = re.search(r' d="([^"]+)"', P).group(1), map(float, re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', P).groups())
cols = [('Proposition', PROPOSAL, '')] + [(r['nom'], r['hex'], f"ΔE {r['deltaE2000_vs_proposition']}") for r in rows]
W, cw = 1200, 300; g = []
for i, (nom, h, de) in enumerate(cols):
    x = i * cw; s = 150 / vh
    g.append(f'<rect x="{x}" y="0" width="{cw}" height="300" fill="#000"/><path fill="{h}" fill-rule="evenodd" transform="translate({x + (cw - vw*s)/2:.1f} 60) scale({s:.3f})" d="{d}"/>'
             f'<rect x="{x}" y="300" width="{cw}" height="160" fill="{h}"/>'
             f'<text x="{x+20}" y="500" font-size="22" font-weight="700">{nom}</text><text x="{x+20}" y="530" font-size="20">{h}</text><text x="{x+20}" y="560" font-size="18" fill="#555">{de}</text>')
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} 590" width="{W}" height="590" font-family="Archivo, Arial, sans-serif">\n'
       '<!-- Primestone · comparaison des jaunes · P NON OFFICIEL (vectorisation provisoire) · généré par tools/compare_yellow.py -->\n'
       f'<rect width="{W}" height="590" fill="#ECEBE6"/>{"".join(g)}\n</svg>\n')
(OUT / 'comparaison-jaunes.svg').write_text(svg)
print(json.dumps(rows, ensure_ascii=False))
