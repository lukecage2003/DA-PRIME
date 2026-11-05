"""Compare la vectorisation NON OFFICIELLE aux masques extraits des bitmaps d'origine.
Rendu SVG via Chromium (Playwright), métriques en Python. Usage : python3 tools/compare_logo.py
Sortie : brand/01_logo/NON-OFFICIEL/_reference/comparaison.json + planches PNG."""
import json, subprocess, numpy as np
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
D = ROOT / 'brand/01_logo/NON-OFFICIEL'; REF = D / '_reference'
NAMES = ['PS_LOGO_logotype', 'PS_LOGO_icone-P']; SCALES = [1, 4]

JS = r"""
const {chromium}=require('playwright');(async()=>{const [svg,out,w,h,s]=process.argv.slice(1);
const b=await chromium.launch();const p=await b.newPage({viewport:{width:+w,height:+h},deviceScaleFactor:+s});
await p.goto('file://'+svg);
await p.waitForTimeout(150);await p.screenshot({path:out});await b.close()})()"""

res = {}
for n in NAMES:
    orig = np.asarray(Image.open(REF / f'{n}_masque-original.png')).astype(float)
    h, w = orig.shape; res[n] = {}
    for s in SCALES:
        png = REF / f'{n}_rendu-x{s}.png'
        subprocess.run(['node', '-e', JS, str(D / f'{n}_noir_NON-OFFICIEL.svg'), str(png), str(w), str(h), str(s)], check=True, cwd=ROOT)
        vec = np.clip((255 - np.asarray(Image.open(png).convert('L')).astype(float)) * 255 / 238, 0, 255)  # #111 sur blanc -> alpha
        ref = orig if s == 1 else np.asarray(Image.fromarray(orig.astype(np.uint8)).resize((w*s, h*s), Image.BICUBIC)).astype(float)
        A, B = ref >= 128, vec >= 128
        iou = (A & B).sum() / max((A | B).sum(), 1)
        res[n][f'x{s}'] = dict(ecart_moyen_alpha=round(float(np.abs(ref - vec).mean()), 3),
                              iou=round(float(iou), 5), pixels_divergents_pct=round(float((A ^ B).mean() * 100), 4))
        if s == 4:  # planche : rouge = original seul, cyan = vecteur seul, blanc = commun
            rgb = np.zeros((*A.shape, 3), np.uint8); rgb[A & B] = 235; rgb[A & ~B] = (255, 40, 40); rgb[~A & B] = (0, 210, 255)
            Image.fromarray(rgb).save(REF / f'{n}_diff-x4.png')
(REF / 'comparaison.json').write_text(json.dumps(res, indent=2))
print(json.dumps(res, indent=1))
