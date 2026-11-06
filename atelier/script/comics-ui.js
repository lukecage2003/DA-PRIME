// Script Studio › Comics : bibliothèque de numéros et d'arcs, lecteur de pages, cases, transcription, analyse et validation humaine.
// Les informations sont toujours rattachées à leur numéro, page et case, avec leur provenance (dialogue, visuel, interprétation, incertain).
import { db } from '../motion/stockage.js';
import { FONCTIONS } from '../../templates/_systeme/script-moteur.js';
import { importerFichiers, detecterCases, MOTEURS, FORMATS_ACCEPTES } from './comics.js';
import { $, el, bouton, champ, choix, saisie, zone, info, sans, PROVENANCES, autoTaille } from './ui.js';

const VALIDATIONS = { resume: 'Résumé du numéro', personnages: 'Personnages', chronologie: 'Chronologie', evenements: 'Événements', revelations: 'Révélations', relations: 'Relations', incertitudes: 'Incertitudes traitées' };
const TYPES_TEXTE = { dialogue: 'Bulle de dialogue', pensee: 'Pensée', cartouche: 'Cartouche', onomatopee: 'Onomatopée', texte: 'Texte dans l\'image' };
const STATUTS = { lu: 'Lu', incertain: 'Incertain', illisible: 'Illisible' };
const nid = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function initComics({ rafraichirProjet, kb, file }) {
  let comics = [], courant = null, pageIdx = 0, pageCache = new Map(), caseSel = null;
  const numeros = () => comics.filter((c) => c.genre === 'numero').sort((a, b) => sans(`${a.serie} ${String(a.numero).padStart(5, '0')}`).localeCompare(sans(`${b.serie} ${String(b.numero).padStart(5, '0')}`)));
  const arcs = () => comics.filter((c) => c.genre === 'arc');
  const libelle = (c) => `${c.serie || 'Sans série'} #${c.numero || '?'}${c.titre ? ` · ${c.titre}` : ''}`;
  async function charger() { comics = await db.tous('comics').catch(() => []); }
  const attenteSync = new Map(), planifierSync = (c) => { if (!kb || c?.genre !== 'numero') return; clearTimeout(attenteSync.get(c.id)); attenteSync.set(c.id, setTimeout(() => { attenteSync.delete(c.id); kb.synchroniserComic(c); }, 400)); };
  const sauverComic = async (c) => { c.modifie = Date.now(); await db.ecrire('comics', c); const i = comics.findIndex((x) => x.id === c.id); if (i >= 0) comics[i] = c; else comics.push(c); planifierSync(c); };
  const page = async (id) => { if (!pageCache.has(id)) pageCache.set(id, await db.lire('pages', id)); return pageCache.get(id); };
  const sauverPage = async (p) => { pageCache.set(p.id, p); await db.ecrire('pages', p); planifierSync(comics.find((x) => x.id === p.comic)); };

  $('#import-comics').accept = FORMATS_ACCEPTES;
  $('#moteurs-statut').replaceChildren(...Object.values(MOTEURS).map((m) => el('span', { className: 'moteur-statut', style: 'display:block;margin-bottom:4px', textContent: `${m.nom} : ${m.note}` })));
  // ---------- Import ----------
  $('#import-comics').addEventListener('change', async (ev) => {
    const fs = [...ev.target.files]; ev.target.value = ''; if (!fs.length) return;
    try { const lots = await importerFichiers(fs, { progres: (x) => info(`Import… ${Math.round(x * 100)} %`) }); let n = 0;
      for (const l of lots) {
        const dbl = numeros().find((c) => c.hash === l.hash); if (dbl) { info(`« ${l.nom} » est déjà dans la bibliothèque (${libelle(dbl)}) : non dupliqué.`); continue; }
        const m = l.nom.match(/^(.*?)[\s_#-]*(\d{1,4})(?:\D.*)?$/), c = { id: nid('cm'), genre: 'numero', serie: (m?.[1] || l.nom).replace(/[_.]+/g, ' ').trim(), numero: m?.[2] ? String(+m[2]) : '', titre: '', editeur: '', auteurs: '', annee: '', source: l.source, hash: l.hash, pages: [], ajoute: Date.now(), notes: '',
          analyse: { resume: '', personnages: [], evenements: [], lieux: '', relations: '', incertitudes: '' }, validation: {} };
        for (const [i, pg] of l.pages.entries()) { const p = { id: nid('pg'), comic: c.id, index: i, nom: pg.nom, blob: pg.blob, w: pg.w, h: pg.h, vignette: pg.vignette, double: pg.double, doublon: pg.doublon, hash: pg.hash, exclue: !!pg.doublon, cases: [], detection: null, transcriptions: [], notesVisuelles: '' }; await db.ecrire('pages', p); c.pages.push(p.id); }
        c.couverture = l.pages[0]?.vignette; await sauverComic(c); courant = c.id; pageIdx = 0; n++;
        const dbls = l.pages.filter((x) => x.doublon).length, dbs = l.pages.filter((x) => x.double).length; info(`« ${libelle(c)} » importé : ${l.pages.length} pages${dbs ? `, ${dbs} double(s) page(s)` : ''}${dbls ? `, ${dbls} page(s) en double exclue(s)` : ''}. Série et numéro déduits du nom de fichier : à vérifier.`); }
      if (n) afficher();
    } catch (e) { info(e.message || 'Import impossible.'); }
  });
  // ---------- Recherche plein texte (métadonnées, analyses, transcriptions) ----------
  $('#recherche-comics').addEventListener('input', async () => {
    const q = sans($('#recherche-comics').value.trim()); if (q.length < 2) return $('#resultats-comics').replaceChildren(); const res = [];
    for (const c of numeros()) { if (sans(`${libelle(c)} ${c.analyse.resume} ${c.analyse.personnages.map((x) => x.nom).join(' ')}`).includes(q)) res.push({ c, i: 0, t: libelle(c) });
      for (const [i, id] of c.pages.entries()) { const p = await page(id); for (const t of p?.transcriptions || []) if (sans(`${t.personnage} ${t.texte}`).includes(q)) res.push({ c, i, t: `${libelle(c)} · p. ${i + 1} : ${t.texte.slice(0, 60)}` }); } }
    $('#resultats-comics').replaceChildren(...res.slice(0, 30).map((r) => el('li', {}, bouton(r.t, () => { courant = r.c.id; pageIdx = r.i; afficher(); }))));
  });
  function lister() {
    $('#liste-comics').replaceChildren(...numeros().map((c) => el('li', {}, bouton(`${libelle(c)} · ${c.pages.length} p.`, () => { courant = c.id; pageIdx = 0; afficher(); }, { 'aria-pressed': String(courant === c.id), dataset: { comic: c.id } }))));
    $('#liste-arcs').replaceChildren(...arcs().map((a) => el('li', {}, bouton(`${a.nom} · ${a.numeros.length} numéro(s)`, () => { courant = a.id; afficher(); }, { 'aria-pressed': String(courant === a.id) }))));
  }
  $('#nouvel-arc').addEventListener('click', async () => { const a = { id: nid('arc'), genre: 'arc', nom: 'Nouvel arc', numeros: [], notes: '' }; await sauverComic(a); courant = a.id; afficher(); });

  async function afficher() {
    await charger(); lister(); const c = comics.find((x) => x.id === courant), z = $('#comic');
    if (!c) return z.replaceChildren(el('p', { className: 'vide', textContent: numeros().length ? 'Choisir un numéro ou un arc.' : 'Importer un ou plusieurs numéros (CBZ, ZIP, PDF ou images).' }));
    if (c.genre === 'arc') return vueArc(z, c);
    const meta = (k, lab) => { const i = saisie(c[k], { dataset: { meta: k } }); i.addEventListener('change', async () => { c[k] = i.value; await sauverComic(c); lister(); }); return champ(lab, i); };
    z.replaceChildren(el('div', { className: 'titre-projet' }, el('h2', { className: 'titre-section', textContent: libelle(c) })),
      el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Fiche du numéro (informations saisies par vous)' }), el('div', { className: 'grille2' }, meta('serie', 'Série'), meta('numero', 'Numéro'), meta('titre', 'Titre'), meta('editeur', 'Éditeur'), meta('auteurs', 'Auteurs'), meta('annee', 'Année')),
        el('p', { className: 'note', textContent: `Source : ${c.source} · empreinte ${c.hash.slice(0, 12)}… · le fichier d'origine n'est pas modifié ; seules des copies des pages sont conservées sur l'appareil.` }),
        bouton('Supprimer ce numéro', async () => { if (!confirm(`Supprimer « ${libelle(c)} », ses pages et son analyse de la bibliothèque ?`)) return; clearTimeout(attenteSync.get(c.id)); attenteSync.delete(c.id); for (const id of c.pages) await db.suppr('pages', id); await db.suppr('comics', c.id); if (kb) await kb.retirerComic(c.id); courant = null; afficher(); }, { className: 'danger' })),
      el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Pages' }), el('div', { className: 'bande-pages', id: 'bande-pages' })), el('div', { id: 'lecteur' }), analyseNumero(c));
    const bande = $('#bande-pages');
    for (const [i, id] of c.pages.entries()) { const p = await page(id); if (!p) continue;
      const b = el('button', { type: 'button', className: 'vignette-page', 'aria-current': String(i === pageIdx), dataset: { exclue: p.exclue ? '1' : '0', page: i + 1 } }, el('img', { src: p.vignette, alt: `Page ${i + 1}`, loading: 'lazy' }), el('span', { textContent: `p. ${i + 1}${p.double ? ' · double' : ''}${p.doublon ? ' · doublon' : ''}${p.exclue ? ' · exclue' : ''}` }));
      b.addEventListener('click', () => { pageIdx = i; caseSel = null; afficher(); }); bande.append(b); }
    lecteur(c);
  }
  // ---------- Lecteur : image, cases, transcription ----------
  async function lecteur(c) {
    const z = $('#lecteur'), p = await page(c.pages[pageIdx]); if (!p) return;
    const url = URL.createObjectURL(p.blob), img = el('img', { src: url, alt: `Page ${pageIdx + 1} de ${c.serie} #${c.numero}` }), cadre = el('div', { className: 'cadre-page', id: 'cadre-page' }, img);
    const dessinerCases = () => { cadre.querySelectorAll('.case').forEach((x) => x.remove()); p.cases.forEach((k, i) => { const d = el('div', { className: 'case', dataset: { sel: caseSel === i ? '1' : '0', case: i + 1 }, style: `left:${k.x * 100}%;top:${k.y * 100}%;width:${k.w * 100}%;height:${k.h * 100}%` }, el('span', { textContent: String(i + 1) })); d.addEventListener('pointerdown', (e) => { e.stopPropagation(); caseSel = i; dessinerCases(); }); cadre.append(d); }); };
    // Découpe manuelle : glisser sur l'image pour tracer une case
    let dep = null, trace = null; const pos = (e) => { const b = img.getBoundingClientRect(); return [(e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height]; };
    cadre.addEventListener('pointerdown', (e) => { dep = pos(e); trace = el('div', { className: 'trace' }); cadre.append(trace); cadre.setPointerCapture(e.pointerId); });
    cadre.addEventListener('pointermove', (e) => { if (!dep) return; const [x, y] = pos(e); Object.assign(trace.style, { left: `${Math.min(x, dep[0]) * 100}%`, top: `${Math.min(y, dep[1]) * 100}%`, width: `${Math.abs(x - dep[0]) * 100}%`, height: `${Math.abs(y - dep[1]) * 100}%` }); });
    cadre.addEventListener('pointerup', async (e) => { if (!dep) return; const [x, y] = pos(e), r = { x: Math.max(0, Math.min(x, dep[0])), y: Math.max(0, Math.min(y, dep[1])), w: Math.abs(x - dep[0]), h: Math.abs(y - dep[1]) }; dep = null; trace.remove();
      if (r.w > 0.03 && r.h > 0.03) { p.cases.push({ ...r, manuel: true }); await sauverPage(p); caseSel = p.cases.length - 1; lecteur(c); } });
    const transcr = el('div', { className: 'liste-elements', id: 'transcriptions' }, ...p.transcriptions.map((t, i) => {
      const ty = choix(TYPES_TEXTE, t.type), pe = saisie(t.personnage, { placeholder: 'Personnage (si certain)' }), tx = autoTaille(zone(t.texte, { rows: 2, placeholder: 'Texte relevé (court) ou résumé de la bulle' })), st = choix(STATUTS, t.statut), ca = choix({ '': 'Case ?', ...Object.fromEntries(p.cases.map((_, k) => [k + 1, `Case ${k + 1}`])) }, t.case || '');
      const maj = async () => { Object.assign(p.transcriptions[i], { type: ty.value, personnage: pe.value, texte: st.value === 'illisible' && !tx.value ? '[illisible]' : tx.value, statut: st.value, case: +ca.value || null }); await sauverPage(p); };
      [pe, tx].forEach((x) => x.addEventListener('change', maj)); [ty, st, ca].forEach((x) => x.addEventListener('change', maj));
      return el('div', { className: 'ligne-element', dataset: { statut: t.statut } }, el('div', { className: 'pile' }, el('div', { className: 'grille2' }, ca, ty, pe, st), tx), bouton('✕', async () => { p.transcriptions.splice(i, 1); await sauverPage(p); lecteur(c); }, { className: 'petit', 'aria-label': 'Supprimer' })); }));
    const nv = autoTaille(zone(p.notesVisuelles, { rows: 2, placeholder: 'Ce qui est visible (actions, lieux, expressions) — décrit par vous', id: 'notes-visuelles' })); nv.addEventListener('change', async () => { p.notesVisuelles = nv.value; await sauverPage(p); });
    const det = p.detection;
    z.replaceChildren(el('div', { className: 'lecteur' }, el('div', { className: 'pile' }, cadre, el('div', { className: 'rangee' },
      bouton('← Page précédente', () => { if (pageIdx > 0) { pageIdx--; caseSel = null; afficher(); } }), bouton('Page suivante →', () => { if (pageIdx < c.pages.length - 1) { pageIdx++; caseSel = null; afficher(); } }),
      bouton('Déplacer à gauche', async () => { if (!pageIdx) return; [c.pages[pageIdx - 1], c.pages[pageIdx]] = [c.pages[pageIdx], c.pages[pageIdx - 1]]; pageIdx--; await sauverComic(c); afficher(); }), bouton('Déplacer à droite', async () => { if (pageIdx >= c.pages.length - 1) return; [c.pages[pageIdx + 1], c.pages[pageIdx]] = [c.pages[pageIdx], c.pages[pageIdx + 1]]; pageIdx++; await sauverComic(c); afficher(); }),
      bouton(p.exclue ? 'Réintégrer la page' : 'Exclure la page', async () => { p.exclue = !p.exclue; await sauverPage(p); afficher(); }),
      el('label', { className: 'bascule' }, (() => { const x = el('input', { type: 'checkbox', checked: !!p.double }); x.addEventListener('change', async () => { p.double = x.checked; await sauverPage(p); }); return x; })(), 'Double page'))),
      el('div', { className: 'pile' }, el('div', { className: 'carte-bloc' }, el('h3', { textContent: `Page ${pageIdx + 1} · cases` }),
        el('div', { className: 'rangee' }, bouton('Détecter les cases', async () => { const bm = await createImageBitmap(p.blob), r = detecterCases(bm, { sens: c.sens || 'gd' }); bm.close?.(); p.cases = r.cases; p.detection = { fiabilite: r.fiabilite, note: r.note }; await sauverPage(p); lecteur(c); info(`${r.cases.length} case(s) détectée(s) · fiabilité ${r.fiabilite}.`); }, { className: 'accent', id: 'detecter-cases' }),
          file ? bouton('Tout le numéro (arrière-plan)', async () => { await file.ajouter('cases-numero', { comic: c.id }, { nom: `Cases · ${libelle(c)}` }); info('Détection des cases du numéro lancée en arrière-plan (suivi dans l\'espace Moteurs ; annulable).'); }, { id: 'cases-arriere-plan' }) : null,
          bouton('Supprimer la case', async () => { if (caseSel === null) return; p.cases.splice(caseSel, 1); caseSel = null; await sauverPage(p); lecteur(c); }), bouton('Effacer les cases', async () => { p.cases = []; p.detection = null; await sauverPage(p); lecteur(c); }),
          el('label', { className: 'bascule' }, (() => { const x = el('input', { type: 'checkbox', checked: c.sens === 'dg' }); x.addEventListener('change', async () => { c.sens = x.checked ? 'dg' : 'gd'; await sauverComic(c); }); return x; })(), 'Lecture de droite à gauche (manga)')),
        el('p', { className: 'note', textContent: det ? `Détection géométrique (fiabilité ${det.fiabilite}) : ${det.note}` : 'Détection géométrique par gouttières (sans IA). Glisser sur la page pour tracer une case à la main.' })),
        el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Transcription' }), el('p', { className: 'moteur-statut', textContent: MOTEURS.ocr.note }), transcr,
          bouton('Ajouter un texte', async () => { p.transcriptions.push({ id: nid('tx'), case: caseSel !== null ? caseSel + 1 : null, type: 'dialogue', personnage: '', texte: '', statut: 'lu' }); await sauverPage(p); lecteur(c); }, { id: 'ajouter-texte' }),
          el('p', { className: 'note', textContent: 'Relever l\'essentiel, pas des pages entières. Un texte illisible reste marqué « illisible » : il n\'est jamais complété par supposition.' })),
        el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Notes visuelles' }), el('p', { className: 'moteur-statut', textContent: MOTEURS.vision.note }), nv))));
    dessinerCases(); img.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
  }
  // ---------- Analyse d'un numéro ----------
  function analyseNumero(c) {
    const A = c.analyse, sv = () => sauverComic(c);
    const resume = autoTaille(zone(A.resume, { rows: 3, placeholder: 'Résumé du numéro, avec vos mots', id: 'resume-numero' })); resume.addEventListener('change', () => { A.resume = resume.value; sv(); });
    const perso = (x, i) => { const n = saisie(x.nom, { placeholder: 'Nom' }), r = saisie(x.role || '', { placeholder: 'Rôle dans ce numéro' }), pr = choix(PROVENANCES, x.provenance || 'dialogue'); const m = () => { Object.assign(A.personnages[i], { nom: n.value, role: r.value, provenance: pr.value }); sv(); }; [n, r].forEach((y) => y.addEventListener('change', m)); pr.addEventListener('change', m); return el('div', { className: 'ligne-element' }, el('div', { className: 'grille2' }, n, r, pr), bouton('✕', () => { A.personnages.splice(i, 1); sv(); afficher(); }, { className: 'petit' })); };
    const evt = (x, i) => { const t = autoTaille(zone(x.texte, { rows: 2, placeholder: 'Événement, en vos mots (paraphrase)' })), pg = el('input', { type: 'number', min: 1, max: c.pages.length, value: x.page || pageIdx + 1, 'aria-label': 'Page', style: 'width:80px' }), ca = el('input', { type: 'number', min: 0, value: x.case || '', 'aria-label': 'Case', style: 'width:70px' }), pr = choix(PROVENANCES, x.provenance || 'dialogue'), im = choix({ 3: 'Essentiel', 2: 'Important', 1: 'Secondaire' }, String(x.importance || 2)), fn = choix({ '': 'Fonction…', ...FONCTIONS }, x.fonction || ''), rv = el('input', { type: 'checkbox', checked: !!x.revelation }), fb = el('input', { type: 'checkbox', checked: !!x.flashback });
      const m = () => { Object.assign(A.evenements[i], { texte: t.value, page: +pg.value || null, case: +ca.value || null, provenance: pr.value, importance: +im.value, fonction: fn.value, revelation: rv.checked, flashback: fb.checked }); sv(); }; [t, pg, ca].forEach((y) => y.addEventListener('change', m)); [pr, im, fn, rv, fb].forEach((y) => y.addEventListener('change', m));
      return el('div', { className: 'ligne-element', dataset: { evenement: x.id } }, el('div', { className: 'pile' }, t, el('div', { className: 'rangee' }, el('label', {}, 'p. ', pg), el('label', {}, 'case ', ca), pr, im, fn, el('label', { className: 'bascule' }, rv, 'Révélation'), el('label', { className: 'bascule' }, fb, 'Flashback'))),
        el('div', { className: 'pile' }, bouton('↑', () => { if (!i) return; [A.evenements[i - 1], A.evenements[i]] = [A.evenements[i], A.evenements[i - 1]]; sv(); afficher(); }, { className: 'petit', 'aria-label': 'Plus tôt' }), bouton('✕', () => { A.evenements.splice(i, 1); sv(); afficher(); }, { className: 'petit' }))); };
    const txt = (k, lab) => { const t = autoTaille(zone(A[k], { rows: 2 })); t.addEventListener('change', () => { A[k] = t.value; sv(); }); return champ(lab, t); };
    const valid = el('div', { className: 'validation', id: 'validation-numero' }, ...Object.entries(VALIDATIONS).map(([k, n]) => { const cb = el('input', { type: 'checkbox', checked: !!c.validation[k], dataset: { valider: k } }); cb.addEventListener('change', async () => { c.validation[k] = cb.checked; await sv(); if (kb && (k === 'evenements' || k === 'personnages')) { clearTimeout(attenteSync.get(c.id)); attenteSync.delete(c.id); await kb.synchroniserComic(c); const n = await kb.validerGroupe(c.id, k === 'evenements' ? 'evenement' : 'personnage', cb.checked); info(`${n} information(s) ${cb.checked ? 'validée(s)' : 'repassée(s) « à vérifier »'} dans la base de connaissances.`); } rafraichirProjet(); }); return el('label', {}, cb, n); }));
    return el('div', { className: 'pile' },
      el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Analyse du numéro' }), el('p', { className: 'note', textContent: 'Analyse construite par vous, page par page : chaque information garde sa provenance. Les informations incertaines ne sont jamais utilisées automatiquement dans un script.' }), champ('Résumé', resume)),
      el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Personnages' }), ...A.personnages.map(perso), el('div', { className: 'rangee' }, bouton('Ajouter un personnage', () => { A.personnages.push({ nom: '', role: '', provenance: 'dialogue' }); sv(); afficher(); }), bouton('Suggérer depuis les transcriptions', () => suggererPersonnages(c), { id: 'suggerer-personnages' }))),
      el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Événements (ordre chronologique du numéro)' }), ...A.evenements.map(evt), bouton('Ajouter un événement (page courante)', () => { A.evenements.push({ id: nid('ev'), texte: '', page: pageIdx + 1, case: caseSel !== null ? caseSel + 1 : null, provenance: 'dialogue', importance: 2, fonction: '' }); sv(); afficher(); }, { id: 'ajouter-evenement' })),
      el('div', { className: 'carte-bloc' }, el('div', { className: 'grille2' }, txt('lieux', 'Lieux'), txt('relations', 'Relations'), txt('incertitudes', 'Incertitudes et points à vérifier'))),
      kb ? el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Base de connaissances' }), (() => { const s = kb.resume(c.id); return el('p', { className: 'note', id: 'resume-kb', textContent: `${s.total} information(s) · ${s.parStatut.valide || 0} validée(s) · ${s.parStatut['a-verifier'] || 0} à vérifier · ${s.parStatut.rejete || 0} rejetée(s).` }); })(),
        bouton('Ouvrir dans Connaissances', () => document.querySelector('[data-espace="connaissances"]').click())) : null,
      el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Validation humaine' }), el('p', { className: 'note', textContent: 'Seuls les événements d\'un numéro validé (case « Événements ») sont repris dans un script.' }), valid));
  }
  // Suggestion déterministe : noms en capitales relevés dans les transcriptions (à confirmer, provenance « dialogue »)
  async function suggererPersonnages(c) {
    const vus = new Map(); for (const id of c.pages) { const p = await page(id); for (const t of p?.transcriptions || []) { if (t.personnage) vus.set(t.personnage, (vus.get(t.personnage) || 0) + 2); for (const m of t.texte.matchAll(/\b([A-ZÉÈ][a-zéèêàç]+(?:\s[A-ZÉÈ][a-zéèêàç]+)?)\b/g)) if (!/^(Le|La|Les|Un|Une|Je|Tu|Il|Elle|Nous|Vous|Ils|Et|Mais|Que|Qui|The|You|I|We|It|And|But|What|When|Is|To|If|There)$/.test(m[1])) vus.set(m[1], (vus.get(m[1]) || 0) + 1); } }
    const deja = new Set(c.analyse.personnages.map((x) => sans(x.nom))), noms = [...vus].filter(([n, k]) => k >= 2 && !deja.has(sans(n))).sort((a, b) => b[1] - a[1]).slice(0, 12);
    if (!noms.length) return info('Aucun nom récurrent dans les transcriptions.'); c.analyse.personnages.push(...noms.map(([nom]) => ({ nom, role: 'à confirmer', provenance: 'incertain' }))); await sauverComic(c); afficher(); info(`${noms.length} nom(s) relevé(s) dans les transcriptions, marqués « incertain » jusqu'à confirmation.`);
  }
  // ---------- Arcs : plusieurs numéros, continuité ----------
  function vueArc(z, a) {
    const nom = saisie(a.nom, { id: 'nom-arc' }); nom.addEventListener('change', async () => { a.nom = nom.value; await sauverComic(a); lister(); });
    const dispo = numeros().filter((c) => !a.numeros.includes(c.id)), ajout = choix({ '': 'Ajouter un numéro…', ...Object.fromEntries(dispo.map((c) => [c.id, libelle(c)])) }, '');
    ajout.addEventListener('change', async () => { if (!ajout.value) return; a.numeros.push(ajout.value); await sauverComic(a); afficher(); });
    const items = a.numeros.map((id) => comics.find((c) => c.id === id)).filter(Boolean);
    z.replaceChildren(el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Arc narratif' }), champ('Nom', nom), ajout,
      el('div', { className: 'liste-elements' }, ...items.map((c, i) => el('div', { className: 'ligne-element' }, el('span', { textContent: `${i + 1}. ${libelle(c)} · ${etatNumero(c).fait}/${Object.keys(VALIDATIONS).length} validé` }), el('div', { className: 'rangee' }, bouton('↑', async () => { if (!i) return; [a.numeros[i - 1], a.numeros[i]] = [a.numeros[i], a.numeros[i - 1]]; await sauverComic(a); afficher(); }, { className: 'petit' }), bouton('Retirer', async () => { a.numeros.splice(i, 1); await sauverComic(a); afficher(); }, { className: 'petit danger' }))))),
      el('div', { className: 'rangee' }, bouton('Créer un projet de script avec cet arc', async () => { const { nouveauProjet } = await import('../../templates/_systeme/script-moteur.js'); const p = nouveauProjet({ nom: a.nom, sujet: `${a.nom} (${items.map(libelle).join(', ')})`, type: 'storytelling', duree: 900 }); p.comics = [...a.numeros]; await db.ecrire('scripts', p); location.assign(`?projet=${p.id}#projets`); }, { className: 'accent', id: 'projet-arc' }),
        bouton('Supprimer l\'arc', async () => { if (!confirm('Supprimer cet arc (les numéros restent) ?')) return; await db.suppr('comics', a.id); courant = null; afficher(); }, { className: 'danger' }))),
      el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Continuité' }), chronologie(items)));
  }
  // Chronologie globale : numéros dans l'ordre de l'arc, événements dans l'ordre de chaque numéro, provenance conservée
  function chronologie(items) {
    const lignes = items.flatMap((c) => c.analyse.evenements.map((e) => ({ c, e })));
    if (!lignes.length) return el('p', { className: 'note', textContent: 'Aucun événement saisi dans ces numéros.' });
    const persos = new Map(); items.forEach((c) => c.analyse.personnages.forEach((p) => { const k = sans(p.nom); if (!k) return; persos.set(k, { nom: p.nom, n: new Set([...(persos.get(k)?.n || []), c.id]) }); }));
    const recurrents = [...persos.values()].filter((p) => p.n.size > 1);
    return el('div', { className: 'pile' }, recurrents.length ? el('p', { textContent: `Personnages récurrents : ${recurrents.map((p) => `${p.nom} (${p.n.size} numéros)`).join(', ')}` }) : null,
      el('ol', {}, ...lignes.map(({ c, e }) => el('li', {}, `${libelle(c)} · p. ${e.page || '?'}${e.case ? ` case ${e.case}` : ''} — ${e.texte} `, el('span', { className: 'badge-prov', dataset: { prov: e.provenance }, textContent: PROVENANCES[e.provenance] }), e.flashback ? ' (flashback)' : '', e.revelation ? ' ★ révélation' : ''))));
  }
  const etatNumero = (c) => ({ fait: Object.keys(VALIDATIONS).filter((k) => c.validation?.[k]).length });
  // ---------- Liens avec les projets ----------
  const api = {
    charger, afficher, numeros,
    etatValidation: (ids) => ({ complets: ids.map((id) => comics.find((c) => c.id === id)).filter((c) => c && etatNumero(c).fait === Object.keys(VALIDATIONS).length).length }),
    async pointsDepuis(ids) { const points = []; let ignores = 0;
      ids.forEach((id, k) => { const c = comics.find((x) => x.id === id); if (!c) return; if (!c.validation?.evenements) { ignores++; return; }
        c.analyse.evenements.forEach((e, j) => points.push({ id: `pt${e.id}`, cle: e.id, texte: e.texte, importance: e.importance || 2, provenance: e.provenance, fonction: e.fonction, ordre: k * 1000 + j, ref: { comic: c.id, page: e.page, case: e.case, pageId: c.pages[(e.page || 1) - 1] }, refTexte: `${c.serie} #${c.numero} p. ${e.page || '?'}${e.case ? ` case ${e.case}` : ''}` })); });
      return { points, ignores }; },
    vueAnalyseProjet(z, P) { const items = P.comics.map((id) => comics.find((c) => c.id === id)).filter(Boolean);
      z.append(el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Analyse des comics du projet' }), el('p', { className: 'note', textContent: 'Chaque numéro est analysé séparément avant la vue d\'ensemble. Corriger et valider dans l\'espace Comics.' }),
        el('div', { className: 'liste-elements' }, ...items.map((c) => el('div', { className: 'ligne-element' }, el('div', { className: 'pile' }, el('b', { textContent: libelle(c) }), el('span', { className: 'note', textContent: c.analyse.resume || 'Résumé non rédigé.' }),
          el('div', { className: 'rangee' }, ...Object.entries(VALIDATIONS).map(([k, n]) => el('span', { className: 'badge-prov', dataset: { prov: c.validation?.[k] ? 'visuel' : 'incertain' }, textContent: `${c.validation?.[k] ? '✓' : '○'} ${n}` })))),
          bouton('Ouvrir', () => { courant = c.id; pageIdx = 0; document.querySelector('[data-espace="comics"]').click(); }))))),
        el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Chronologie d\'ensemble (provenance conservée)' }), chronologie(items))); },
    miniaturesRefs(refs = []) { const d = el('div', { className: 'refs rangee' }); refs.forEach(async (r) => { const p = r.pageId && await page(r.pageId); if (p) d.append(el('figure', { style: 'margin:0' }, el('img', { src: p.vignette, alt: '', style: 'width:64px' }), el('figcaption', { className: 'note', textContent: `p. ${r.page}${r.case ? ` c. ${r.case}` : ''}` }))); }); return d; },
    async infosRefs() { return Object.fromEntries(numeros().map((c) => [c.id, { serie: c.serie, numero: c.numero }])); },
    correspondance(P) { const seqs = P.sequences.filter((s) => s.niveau === 2 && s.refs?.length); if (!seqs.length) return el('p', { className: 'note', textContent: 'Aucune séquence reliée à des pages : reprendre les événements validés des comics (étape Sources) puis construire le plan.' });
      return el('div', {}, ...seqs.map((s) => el('div', { className: 'correspondance' }, el('div', {}, el('b', { textContent: s.titre }), el('p', { className: 'note', textContent: (s.texte || s.objectif).slice(0, 220) })), api.miniaturesRefs(s.refs)))); },
  };
  return api;
}
