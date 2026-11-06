// Script Studio › Connaissances : base sourcée (assertions), validation humaine tracée, synchronisation avec les analyses 0.10.
import { db } from '../motion/stockage.js';
import * as K from '../../templates/_systeme/connaissances.js';
import { $, el, bouton, champ, choix, saisie, zone, info, autoTaille } from './ui.js';

export function initConnaissances({ file, libelleComic, ocr = () => null, ouvrirPage = null }) {
  let toutes = [], choisies = new Set(), filtre = { comic: '', categorie: '', statut: '', texte: '' }, page = 1;
  const charger = async () => { toutes = await db.tous('connaissances').catch(() => []); return toutes; };
  const ecrire = async (a) => { await db.ecrire('connaissances', a); const i = toutes.findIndex((x) => x.id === a.id); if (i >= 0) toutes[i] = a; else toutes.push(a); };
  // Synchronise un numéro (événements, transcriptions, personnages) : ajouts, modifications (validation retirée si le texte change), orphelines
  async function synchroniserComic(c) {
    const pages = []; for (const id of c.pages || []) { const p = await db.lire('pages', id); if (p) pages.push({ id: p.id, index: c.pages.indexOf(id), transcriptions: p.transcriptions }); }
    const actions = K.synchroniser(toutes.filter((a) => a.comic === c.id), K.assertionsDepuisComic(c, pages)); let n = 0;
    for (const { action, assertion } of actions) { if (action === 'orpheline') { if (assertion.statut !== 'rejete') { K.changerStatut(assertion, 'rejete', { par: 'synchronisation', motif: 'source supprimée' }); await ecrire(assertion); n++; } continue; } await ecrire(assertion); n++; }
    return n;
  }
  // Validation d'un numéro (cases « Événements » / « Personnages ») répercutée sur ses assertions, avec historique
  async function validerGroupe(comic, genre, valide) {
    let n = 0; for (const a of toutes.filter((x) => x.comic === comic && x.origine?.genre === genre)) {
      if (valide && a.statut === 'a-verifier' && a.categorie !== 'incertain' && a.contenu.trim()) { K.changerStatut(a, 'valide', { motif: `validation du numéro (${genre}s)` }); await ecrire(a); n++; }
      if (!valide && a.statut === 'valide') { K.changerStatut(a, 'a-verifier', { motif: `validation du numéro retirée (${genre}s)` }); await ecrire(a); n++; } }
    return n;
  }
  // Migration 0.10 → 0.11 en tâche de fond (idempotente, reprise possible numéro par numéro)
  file.enregistrer('migration-connaissances', { nom: 'Reprise des analyses dans la base de connaissances', async executer(t, { signal, progres }) {
    const comics = (await db.tous('comics')).filter((c) => c.genre === 'numero'); await charger(); let n = 0;
    for (let i = t.curseur || 0; i < comics.length; i++) { if (signal.aborted) throw Object.assign(new Error('annulé'), { name: 'AbortError' }); n += await synchroniserComic(comics[i]); progres((i + 1) / comics.length, `${libelleComic(comics[i])} : ${n} information(s) à jour.`, i + 1); }
    await db.ecrire('reglages', { id: 'migration-0.11', date: Date.now(), numeros: comics.length }); return { numeros: comics.length, assertions: n };
  } });
  async function migrerSiNecessaire() { if (await db.lire('reglages', 'migration-0.11')) return false; const comics = (await db.tous('comics').catch(() => [])).filter((c) => c.genre === 'numero'); if (!comics.length) { await db.ecrire('reglages', { id: 'migration-0.11', date: Date.now(), numeros: 0 }); return false; } await file.ajouter('migration-connaissances'); return true; }

  // ---------- Vue ----------
  async function afficher(comicsListe) {
    await charger(); const z = $('#connaissances-vue'), st = K.statistiques(toutes), PAGE = 80;
    const sel = (k, opts, tous) => { const s = choix({ '': tous, ...opts }, filtre[k]); s.dataset.filtre = k; s.id = `kb-filtre-${k}`; s.addEventListener('change', () => { filtre[k] = s.value; page = 1; afficher(comicsListe); }); return s; };
    const q = saisie(filtre.texte, { placeholder: 'Rechercher une information…', type: 'search', id: 'kb-recherche' }); q.addEventListener('change', () => { filtre.texte = q.value; page = 1; afficher(comicsListe); });
    const liste = K.filtrer(toutes, filtre).sort((a, b) => String(a.comic).localeCompare(String(b.comic)) || (a.page || 0) - (b.page || 0) || (a.case || 0) - (b.case || 0)), vis = liste.slice(0, page * PAGE);
    const lot = (statut) => bouton(`${K.STATUTS[statut]} (${choisies.size})`, async () => { let n = 0; for (const id of choisies) { const a = toutes.find((x) => x.id === id); if (!a) continue; try { K.changerStatut(a, statut, { motif: 'action groupée' }); await ecrire(a); n++; } catch (e) { info(e.message); } } choisies.clear(); info(`${n} information(s) : ${K.STATUTS[statut].toLowerCase()}.`); afficher(comicsListe); }, { disabled: !choisies.size, dataset: { lot: statut } });
    z.replaceChildren(
      el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Base de connaissances' }),
        el('p', { className: 'note', textContent: 'Chaque information garde son contenu, sa catégorie, son numéro, sa page, sa case, sa méthode d\'extraction, sa confiance et son statut. Seules les informations validées, factuelles ou d\'interprétation, peuvent nourrir un script ; une interprétation reste formulée comme telle. Toute information modifiée après validation redevient « à vérifier ».' }),
        el('div', { className: 'metriques' }, el('span', { textContent: `${st.total} information(s)` }), ...Object.entries(K.STATUTS).map(([k, n]) => el('span', { dataset: { etat: k === 'valide' ? 'ok' : k === 'a-verifier' ? 'alerte' : '' }, textContent: `${n} ${st.parStatut[k] || 0}` }))),
        el('div', { className: 'filtres filtres-kb', role: 'search', 'aria-label': 'Filtrer les informations' }, champ('Rechercher', q), champ('Numéro', sel('comic', Object.fromEntries(comicsListe.map((c) => [c.id, libelleComic(c)])), 'Tous les numéros')), champ('Catégorie', sel('categorie', K.CATEGORIES, 'Toutes les catégories')), champ('Statut', sel('statut', K.STATUTS, 'Tous les statuts'))),
        el('div', { className: 'rangee' }, bouton('Tout sélectionner', () => { choisies = choisies.size ? new Set() : new Set(liste.map((a) => a.id)); afficher(comicsListe); }), lot('valide'), lot('a-verifier'), lot('rejete'),
          bouton('Ajouter une information', () => editer(K.normaliser({ id: `kb:${Date.now().toString(36)}`, contenu: '', categorie: 'visuel', comic: filtre.comic || comicsListe[0]?.id || null, methode: 'manuel', statut: 'brouillon' }), comicsListe), { id: 'kb-ajouter' }))),
      el('div', { className: 'liste-elements', id: 'kb-liste' }, ...vis.map((a) => { const cb = el('input', { type: 'checkbox', checked: choisies.has(a.id), 'aria-label': 'Sélectionner' }); cb.addEventListener('change', () => { cb.checked ? choisies.add(a.id) : choisies.delete(a.id); });
        const c = comicsListe.find((x) => x.id === a.comic);
        return el('div', { className: 'ligne-element', dataset: { assertion: a.id, statut: a.statut } }, el('div', { className: 'pile' }, el('div', { className: 'rangee' }, cb, el('span', { className: 'badge-prov', dataset: { prov: a.categorie === 'dialogue' || a.categorie === 'narration' ? 'dialogue' : a.categorie === 'visuel' ? 'visuel' : a.categorie === 'interpretation' ? 'interpretation' : 'incertain' }, textContent: K.CATEGORIES[a.categorie] }),
          el('span', { className: 'compteur', textContent: `${c ? libelleComic(c) : '—'}${a.page ? ` · p. ${a.page}` : ''}${a.case ? ` · case ${a.case}` : ''} · ${K.METHODES[a.methode] || a.methode} · confiance ${Math.round(a.confiance * 100)} %` })),
          el('span', { textContent: a.contenu || '(vide)' })),
          el('div', { className: 'pile' }, el('b', { className: 'statut-kb', dataset: { statut: a.statut }, textContent: K.STATUTS[a.statut] }), el('div', { className: 'rangee' },
            a.statut !== 'valide' ? bouton('Valider', async () => { try { K.changerStatut(a, 'valide'); await ecrire(a); afficher(comicsListe); } catch (e) { info(e.message); } }, { className: 'accent petit', dataset: { valider: a.id } }) : null,
            a.statut !== 'rejete' ? bouton('Rejeter', async () => { K.changerStatut(a, 'rejete'); await ecrire(a); afficher(comicsListe); }, { className: 'petit' }) : null,
            bouton('Détails', () => editer(a, comicsListe), { className: 'petit' })))); }),
        ...(liste.length > vis.length ? [bouton(`Afficher ${Math.min(PAGE, liste.length - vis.length)} de plus`, () => { page++; afficher(comicsListe); })] : []),
        ...(!liste.length ? [el('p', { className: 'vide', textContent: toutes.length ? 'Aucune information pour ces filtres.' : 'Aucune information : analyser un numéro (espace Comics) — transcriptions, événements et personnages arrivent ici automatiquement.' })] : [])));
  }
  function editer(a, comicsListe) {
    const z = $('#connaissances-vue'), t = autoTaille(zone(a.contenu, { rows: 3, id: 'kb-contenu' })), cat = choix(K.CATEGORIES, a.categorie), co = choix(Object.fromEntries(comicsListe.map((c) => [c.id, libelleComic(c)])), a.comic || ''), pg = el('input', { type: 'number', min: 1, value: a.page || '' }), cs = el('input', { type: 'number', min: 1, value: a.case || '' }), note = saisie(a.note);
    const manuel = a.methode === 'manuel';
    z.replaceChildren(el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Information' }),
      el('p', { className: 'note', textContent: manuel ? 'Information saisie à la main.' : 'Information issue d\'une analyse : la modifier ici la fait repasser « à vérifier ». Pour une transcription ou un événement, préférer la modification dans l\'espace Comics (la source reste cohérente).' }),
      a.ocr ? blocOcr(a) : null,
      champ('Contenu', t), el('div', { className: 'grille2' }, champ('Catégorie', cat), champ('Numéro', co), champ('Page', pg), champ('Case', cs)), champ('Note', note),
      el('div', { className: 'rangee' }, bouton('Enregistrer', async () => { if (!t.value.trim()) return info('Contenu vide : rien n\'est enregistré.'); K.modifierContenu(a, t.value); Object.assign(a, { categorie: cat.value, comic: co.value || null, page: +pg.value || null, case: +cs.value || null, note: note.value, modifie: Date.now() }); if (a.statut === 'brouillon' && a.contenu.trim()) K.changerStatut(a, 'a-verifier', { motif: 'création' }); await ecrire(a); afficher(comicsListe); info('Information enregistrée.'); }, { className: 'accent', id: 'kb-enregistrer' }),
        bouton('Retour', () => afficher(comicsListe))),
      el('h3', { textContent: 'Historique' }), el('ul', {}, ...(a.historique.length ? a.historique : [{ date: a.cree, de: '—', vers: a.statut, par: 'création', motif: '' }]).map((h) => el('li', { className: 'note', textContent: `${new Date(h.date).toLocaleString('fr-FR')} · ${K.STATUTS[h.de] || h.de} → ${K.STATUTS[h.vers] || h.vers} · ${h.par}${h.motif ? ` · ${h.motif}` : ''}${h.ancien !== undefined && h.ancien !== null ? ` · ancien texte : « ${String(h.ancien).slice(0, 160)} »` : ''}` })))));
  }
  // Provenance OCR : texte initial, confiance, langue, prétraitement, zone sur la page source, relance
  function blocOcr(a) {
    const o = a.ocr, ap = el('div', { className: 'image-texte', id: 'kb-ocr-apercu' }), z = a.zone;
    ocr()?.apercuZone(a.origine.pageId, z, { largeur: 420 })?.then((cv) => ap.prepend(cv)).catch(() => {});
    const lignes = [['Texte OCR initial', o.texteInitial ?? o.texteBrut], ['Texte brut de Tesseract', `${o.texteBrut}${o.retires?.length ? ` (fragments retirés : ${o.retires.join(' ')})` : ''}`], ['Confiance Tesseract', `${Math.round(a.confiance * 100)} % (indicateur du moteur, pas un taux d'exactitude)`], ['Langue', o.langues], ['Prétraitement', o.pretraitement],
      ['Découpage', `${o.segmentation} · ${o.zoneMode === 'cases' ? 'case par case' : 'page entière'}`],
      ['Zone sur la page', z ? `x ${Math.round(z.x * 100)} %, y ${Math.round(z.y * 100)} %, ${Math.round(z.w * 100)} × ${Math.round(z.h * 100)} % (zone de texte reconnue, pas le contour d'une bulle)` : '—'],
      ['Ordre de lecture', `${o.ordre}${o.ordreCertain ? '' : ' (approximatif)'}`], ['Moteur', `${o.moteur} · traitement ${o.tache}`], ['Date', new Date(o.date).toLocaleString('fr-FR')]];
    const table = el('table', { className: 'tableau-caps' }, el('tbody', {}, ...lignes.map(([k, v]) => el('tr', {}, el('th', { textContent: k }), el('td', { textContent: String(v) })))));
    const actions = el('div', { className: 'rangee' },
      ouvrirPage ? bouton('Voir la page source', () => ouvrirPage(a.comic, (a.page || 1) - 1), { id: 'kb-voir-page' }) : null,
      bouton("Relancer l'OCR sur cette page", async () => { await ocr()?.relancerPage(a.comic, a.origine.pageId); }, { id: 'kb-relancer-ocr' }));
    return el('div', { className: 'carte-bloc', id: 'kb-ocr' }, el('h3', { textContent: 'Provenance OCR' }), table, ap, actions);
  }
  return {
    charger, afficher, synchroniserComic, validerGroupe, migrerSiNecessaire,
    async pointsPourProjet(ids) { await charger(); return K.pointsPourScript(toutes.filter((a) => ids.includes(a.comic)), ids); },
    async controler(P) { await charger(); return K.controlerScript(P, toutes); },
    // Numéro supprimé : ses informations sont rejetées (conservées pour la traçabilité, plus jamais utilisables dans un script)
    async retirerComic(comic) { await charger(); let n = 0; for (const a of toutes.filter((x) => x.comic === comic && x.statut !== 'rejete')) { K.changerStatut(a, 'rejete', { par: 'synchronisation', motif: 'numéro supprimé' }); await ecrire(a); n++; } return n; },
    lire: (id) => toutes.find((a) => a.id === id) || null,
    // OCR : ajout sans jamais écraser une information existante (reprise d'un traitement interrompu : corrections conservées)
    async ajouterLot(as) { await charger(); let n = 0; for (const a of as) if (!toutes.some((x) => x.id === a.id)) { await ecrire(a); n++; } return n; },
    async ocrDePage(pageId) { await charger(); return toutes.filter((a) => a.origine?.genre === 'ocr' && a.origine.pageId === pageId); },
    async corriger(id, texte) { const a = toutes.find((x) => x.id === id); if (!a) return null; K.modifierContenu(a, texte); await ecrire(a); return a; },
    async statuer(id, statut, motif = '') { const a = toutes.find((x) => x.id === id); if (!a) return null; K.changerStatut(a, statut, { motif }); await ecrire(a); return a; },
    // Validation individuelle (espace Comics) : tracée, refusée pour un contenu vide ou une information incertaine
    async valider(id, motif = 'validation individuelle') { await charger(); const a = toutes.find((x) => x.id === id); if (!a) throw new Error('information introuvable (synchronisation en cours ?)'); if (a.categorie === 'incertain') throw new Error('information incertaine : à requalifier avant validation'); K.changerStatut(a, 'valide', { motif }); await ecrire(a); return a; },
    resume: (comic) => K.statistiques(toutes.filter((a) => a.comic === comic)),
  };
}
