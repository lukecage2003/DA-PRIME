"""Indexe les polices de brand/03_fonts (famille, style, nom PostScript, licence) -> brand/03_fonts/fonts.json"""
import json, hashlib
from pathlib import Path
from fontTools.ttLib import TTFont
D = Path(__file__).resolve().parents[1] / 'brand/03_fonts'
out = []
for f in sorted(D.glob('*.ttf')) + sorted((D / '_variable').glob('*.ttf')):
    n = TTFont(f)['name']
    fam = f.name.split('-')[0].split('[')[0]
    lic = 'Archivo-OFL.txt' if fam.startswith('Archivo') else f'{fam}-OFL.txt'
    out.append(dict(file=str(f.relative_to(D)), family=n.getDebugName(16) or n.getDebugName(1), style=n.getDebugName(17) or n.getDebugName(2),
                    postscriptName=n.getDebugName(6), variable='fvar' in TTFont(f), license='SIL Open Font License 1.1', licenseFile=lic,
                    sha256=hashlib.sha256(f.read_bytes()).hexdigest()))
(D / 'fonts.json').write_text(json.dumps(out, indent=2, ensure_ascii=False))
for o in out: print(o['postscriptName'], '|', o['family'], o['style'])
