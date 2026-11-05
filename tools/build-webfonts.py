"""Polices web (WOFF2, sous-ensemble latin + français) et métriques de mesure de texte.
Usage : python3 tools/build-webfonts.py
Sorties : brand/03_fonts/web/*.woff2 · templates/_systeme/metrics.js (module ES partagé navigateur/Node) · atelier/polices.css"""
import json
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
ROOT = Path(__file__).resolve().parents[1]; F = ROOT / 'brand/03_fonts'; W = F / 'web'; W.mkdir(exist_ok=True)
FONTS = {  # clé moteur : (fichier statique, famille CSS, graisse, style)
  'display': ('Anton-Regular.ttf', 'Anton', 400, 'normal'),
  'mono': ('JetBrainsMono-Bold.ttf', 'JetBrains Mono', 700, 'normal'),
  'text': ('Archivo-Medium.ttf', 'Archivo', 500, 'normal'),
  'textBold': ('Archivo-Bold.ttf', 'Archivo', 700, 'normal'),
  'serif': ('InstrumentSerif-Italic.ttf', 'Instrument Serif', 400, 'italic'),
}
UNI = list(range(0x20, 0x7F)) + list(range(0xA0, 0x100)) + [0x152, 0x153, 0x178, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026, 0x2013, 0x2014, 0x20AC, 0x2022, 0x2605, 0x2606, 0x202F]
metrics = {}
for key, (fn, fam, wt, st) in FONTS.items():
    out = W / fn.replace('.ttf', '.woff2')
    opt = subset.Options(); opt.flavor = 'woff2'; opt.layout_features = ['kern', 'liga']; opt.name_IDs = ['*']; opt.notdef_outline = True
    f = TTFont(F / fn, recalcTimestamp=False); s = subset.Subsetter(opt); s.populate(unicodes=UNI); s.subset(f); f.flavor = 'woff2'; f.save(out)
    t = TTFont(out); cmap = t.getBestCmap(); hm = t['hmtx']; upm = t['head'].unitsPerEm; os2 = t['OS/2']
    adv = {str(cp): hm[g][0] for cp, g in cmap.items()}
    metrics[key] = dict(family=fam, weight=wt, style=st, file=out.name, upm=upm, cap=os2.sCapHeight, asc=t['hhea'].ascent, desc=t['hhea'].descent,
                        fallback=round(sum(adv.values()) / len(adv)), adv=adv)
    print(f'{out.name}: {out.stat().st_size // 1024} Ko, {len(adv)} glyphes')
(ROOT / 'templates/_systeme/metrics.js').write_text('// GÉNÉRÉ par tools/build-webfonts.py · métriques des polices web Primestone (avances en unités de fonte)\nexport default ' + json.dumps(metrics, separators=(',', ':'), ensure_ascii=False) + ';\n')
css = '/* GÉNÉRÉ par tools/build-webfonts.py · polices web Primestone (OFL) */\n' + ''.join(
    f'@font-face{{font-family:"{v["family"]}";src:url("../brand/03_fonts/web/{v["file"]}") format("woff2");font-weight:{v["weight"]};font-style:{v["style"]};font-display:block}}\n' for v in metrics.values())
(ROOT / 'atelier/polices.css').write_text(css)
print('metrics.js', (ROOT / 'templates/_systeme/metrics.js').stat().st_size // 1024, 'Ko')
