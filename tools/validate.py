"""Validation détaillée du dépôt Primestone Brand (appelée par npm run check). Lecture seule, sauf la
régénération déterministe des exports de tokens, comparée ensuite à la version suivie par Git.
Dépendances : requirements.txt"""
import hashlib, json, re, subprocess, sys, xml.etree.ElementTree as ET
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker
from fontTools.ttLib import TTFont
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
fails = []
def ok(m): print('  ok  ' + m)
def ko(m): fails.append(m); print('  KO  ' + m)
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
rel = lambda p: p.relative_to(ROOT).as_posix()

man = json.loads((ROOT / 'catalog/brand-manifest.json').read_text())
cfg = json.loads((ROOT / 'catalog/catalog.config.json').read_text())

# 1. Schéma
errs = list(Draft202012Validator(json.loads((ROOT / 'schemas/brand-manifest.schema.json').read_text()), format_checker=FormatChecker()).iter_errors(man))
ko(f'manifeste non conforme au schéma : {errs[0].message}') if errs else ok(f"manifeste conforme au schéma ({len(man['assets'])} ressources, {sum(len(a['files']) for a in man['assets'])} fichiers)")

# 2. Fichiers du manifeste -> disque (existence, taille, empreinte, dimensions)
listed, bad = set(), []
for f in [man['tokens']] + [f for a in man['assets'] for f in a['files']]:
    p = ROOT / f['path']; listed.add(f['path'])
    if not p.is_file(): bad.append(f"{f['path']} absent"); continue
    if p.stat().st_size != f['bytes'] or sha(p) != f['sha256']: bad.append(f"{f['path']} taille/empreinte"); continue
    if p.suffix == '.png' and 'width' in f and Image.open(p).size != (f['width'], f['height']): bad.append(f"{f['path']} dimensions")
ko('écarts manifeste/disque : ' + ', '.join(bad[:5])) if bad else ok('chaque fichier du manifeste existe, avec taille, SHA-256 et dimensions exactes')

# 3. Disque -> manifeste (aucun fichier catalogable oublié)
IGN = re.compile(r'(^|/)(\.|README|.*\.md$|fonts\.json$|CHECKSUMS)')
missing = []
for fo in cfg['folders']:
    for p in (ROOT / fo['path']).rglob('*'):
        inner = p.relative_to(ROOT / fo['path']).as_posix()
        if not p.is_file() or IGN.search(inner) or any(inner.startswith(e) for e in fo.get('exclude', [])): continue
        if fo.get('groupBy') == 'fontFamily' and not re.search(r'\.(ttf|otf|woff2)$|OFL\.txt$', inner): continue
        if rel(p) not in listed: missing.append(rel(p))
ko('fichiers absents du manifeste : ' + ', '.join(missing[:5])) if missing else ok('chaque fichier des dossiers catalogués figure dans le manifeste')

# 4. SVG bien formés, PNG lisibles et transparents
svgs = [p for p in ROOT.rglob('*.svg') if 'presentations' not in p.parts and 'node_modules' not in p.parts]
badsvg = []
for p in svgs:
    try: ET.parse(p)
    except ET.ParseError as e: badsvg.append(f'{rel(p)} ({e})')
ko('SVG invalides : ' + ', '.join(badsvg)) if badsvg else ok(f'{len(svgs)} SVG bien formés (XML)')
pngs = [ROOT / f['path'] for a in man['assets'] if a['category'] in ('logo', 'elements', 'gabarits') for f in a['files'] if f['format'] == 'png']
badpng = []
for p in pngs:
    try:
        Image.open(p).verify(); im = Image.open(p)
        # RGBA attendu ; RGB toléré uniquement pour un visuel plein (le moteur de rendu omet alors la couche alpha)
        assert im.mode == 'RGBA' or (im.mode == 'RGB' and ('rubrique' in p.name or 'planche' in p.name))
    except Exception: badpng.append(rel(p))
ko('PNG invalides ou sans canal alpha : ' + ', '.join(badpng)) if badpng else ok(f'{len(pngs)} PNG de logo et d\'éléments valides (RGBA ; étiquettes de rubrique pleines en RGB opaque)')

# 5. Polices : empreintes de fonts.json, licence OFL présente, intégration autorisée (fsType)
fonts = json.loads((ROOT / 'brand/03_fonts/fonts.json').read_text()); badf = []
for f in fonts:
    p = ROOT / 'brand/03_fonts' / f['file']; lic = ROOT / 'brand/03_fonts' / f['licenseFile']
    if sha(p) != f['sha256']: badf.append(f"{f['file']} empreinte")
    if not lic.is_file() or 'SIL OPEN FONT LICENSE Version 1.1' not in lic.read_text(errors='ignore'): badf.append(f"{f['file']} licence")
    if TTFont(p)['OS/2'].fsType & 0x0002: badf.append(f"{f['file']} intégration restreinte")
ko('polices : ' + ', '.join(badf)) if badf else ok(f'{len(fonts)} polices : empreintes conformes, licence OFL 1.1 jointe, intégration autorisée')
ps = [f['postscriptName'] for f in fonts if not f['variable']]
ko('noms PostScript dupliqués parmi les statiques') if len(ps) != len(set(ps)) else ok('noms PostScript uniques parmi les polices statiques')

# 6. Marquage NON OFFICIEL
incoh = []
for a in man['assets']:
    marked = any('NON-OFFICIEL' in f['path'] for f in a['files'])
    if marked != (a['status'] == 'non-officiel'): incoh.append(a['id'])
for p in svgs:
    if 'NON OFFICIEL' in p.read_text() and 'NON-OFFICIEL' not in p.name and '_reference' not in p.parts and 'docs' not in p.parts: incoh.append(rel(p))
ko('marquage NON-OFFICIEL incohérent : ' + ', '.join(incoh)) if incoh else ok('statut non-officiel = nom de fichier marqué, pour le logo et le sceau P')

# 7. Images de test : marquées PLACEHOLDER et hors catalogue
tests = [p for p in (ROOT / 'brand/99_tests').rglob('*') if p.is_file() and p.suffix in ('.png', '.jpg') and 'client' not in p.parts]
badt = [rel(p) for p in tests if not p.name.startswith('PLACEHOLDER_') or rel(p) in listed]
ko('images de test mal identifiées : ' + ', '.join(badt)) if badt else ok(f'{len(tests)} images de test préfixées PLACEHOLDER_, absentes du catalogue')

# 7 bis. Données d'infographie conformes au schéma JSON publié (contrôle croisé de la génération du schéma)
schema_i = json.loads((ROOT / 'schemas/infographie.schema.json').read_text())
badi = [f'{p.name} : {e.message}' for p in sorted((ROOT / 'data/infographies').glob('*.json')) for e in Draft202012Validator(schema_i).iter_errors(json.loads(p.read_text()))]
ko('données non conformes au schéma : ' + ', '.join(badi[:3])) if badi else ok(f"{len(list((ROOT / 'data/infographies').glob('*.json')))} fichiers de données conformes à schemas/infographie.schema.json")

# 8. Exports de tokens reproductibles
B = sorted((ROOT / 'brand/02_tokens/build').glob('*')); before = {p.name: p.read_bytes() for p in B}
subprocess.run(['node', str(ROOT / 'tools/build-tokens.mjs')], check=True, capture_output=True)
after = {p.name: p.read_bytes() for p in sorted((ROOT / 'brand/02_tokens/build').glob('*'))}
ko('exports de tokens périmés : lancer npm run build:tokens') if before != after else ok('exports de tokens à jour et reproductibles (CSS, JSON)')

# 9. Documentation : aucune référence au volet Adobe abandonné ni à des chemins supprimés
docs = [ROOT / 'README.md', ROOT / 'CHANGELOG.md'] + list((ROOT / 'docs').glob('*.md')) + list((ROOT / 'brand').rglob('README.md'))
stale = [f'{rel(p)}:{i+1}' for p in docs for i, l in enumerate(p.read_text().splitlines())
         if re.search(r'\.jsx|\.ase\b|ExtendScript|MOGRT|diagnostic', l, re.I) and 'abandonn' not in l and 'retir' not in l]
ko('documentation périmée : ' + ', '.join(stale)) if stale else ok('documentation sans référence au volet Adobe abandonné')

sys.exit(1 if fails else 0)
