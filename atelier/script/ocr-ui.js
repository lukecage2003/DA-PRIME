// Script Studio › OCR local : réglages, lancement (page, pages choisies, numéro complet) via la file de traitements existante,
// résultats « à vérifier » dans la base de connaissances, comparaison image ↔ texte et entre passages, installation des modèles.
import { db } from '../motion/stockage.js';
import * as O from '../../templates/_systeme/ocr.js';
import * as K from '../../templates/_systeme/connaissances.js';
import { $, el, bouton, champ, choix, saisie, info, autoTaille, zone as zoneTexte } from './ui.js';

// Moteur chargé à la demande : Script Studio reste utilisable (transcription manuelle) si l'OCR est indisponible
let moteurMod = null;
const M = async () => (moteurMod ||= import('./ocr.js').catch((e) => { moteurMod = null; throw new Error(`moteur OCR indisponible (${e.message})`); }));
const pc = (x) => (x === null || x === undefined ? '—' : `${Math.round(x * 100)} %`);
const abandon = () => Object.assign(new Error('annulé'), { name: 'AbortError' });
export function initOcr({ file, kb, ouvrirMoteurs, ouvrirPage }) {
  let reglages = { ...O.REGLAGES_OCR0 }, panneau = null;
  const chargerReglages = async () => { reglages = { ...O.REGLAGES_OCR0, ...(await db.lire('reglages', 'ocr').catch(() => null)), id: 'ocr' }; return reglages; };
  const sauverReglages = () => db.ecrire('reglages', { ...reglages, id: 'ocr' });

  // ---------- Traitement (file existante) : page par page, résultats enregistrés au fur et à mesure ----------
  async function enregistrer(t, c, p, idx, pre, r, mod) {
    const P = t.params, passe = `${t.id}:${p.id}:${pre}`, date = Date.now(), moteur = `${mod.VERSION_MOTEUR} · fast ${O.MODELES.version}`;
    const meta = { langues: P.langues, pretraitement: pre, segmentation: P.segmentation, zoneMode: P.zone, tache: t.id, passe, date, moteur };
    const as = r.blocs.map((b) => K.normaliser({ id: `ocr:${passe}:${b.ordre}`, contenu: b.texte, categorie: b.confiance < 0.5 ? 'incertain' : 'texte', comic: c.id, page: idx, case: b.case, zone: b.zone, methode: 'ocr:tesseract-fast', moteur, confiance: b.confiance, statut: 'a-verifier',
      origine: { genre: 'ocr', passe, pageId: p.id, tache: t.id }, ocr: { ...meta, texteBrut: b.texte, lignes: b.lignes, ordre: b.ordre, ordreCertain: r.ordreCertain, mots: b.mots, motsFaibles: b.motsFaibles } }));
    await db.ecrire('ocr-passes', { id: passe, ...meta, comic: c.id, pageId: p.id, page: idx, blocs: as.length, ignores: r.ignores, ordreCertain: r.ordreCertain, regions: r.regions, duree: r.duree, largeur: r.largeur, hauteur: r.hauteur, texte: r.blocs.map((b) => b.texte).join('\n'), ids: as.map((a) => a.id) });
    await kb.ajouterLot(as); return as.length;
  }
  file.enregistrer('ocr-pages', { nom: 'OCR local', async executer(t, { signal, progres }) {
    const P = t.params, c = await db.lire('comics', P.comic); if (!c) throw new Error('numéro introuvable (supprimé ?)');
    const variantes = P.comparer?.length ? P.comparer : [P.pretraitement], total = P.pages.length * variantes.length, mod = await M();
    const moteur = await mod.creerMoteur(P.langues); let blocs = 0;
    try {
      await moteur.parametrer(P.segmentation);
      for (let k = t.curseur || 0; k < total; k++) {
        if (signal.aborted) throw abandon();
        const pageId = P.pages[Math.floor(k / variantes.length)], pre = variantes[k % variantes.length], p = await db.lire('pages', pageId); if (!p) continue;
        const idx = c.pages.indexOf(pageId) + 1, lib = `Page ${idx}${variantes.length > 1 ? ` · ${O.PRETRAITEMENTS[pre].nom}` : ''}`;
        progres(k / total, `${lib} : reconnaissance…`, k);
        const r = await mod.ocrPage(moteur, p, { pretraitement: pre, zone: P.zone, sens: c.sens, signal, progres: (x) => progres((k + x) / total) });
        const n = await enregistrer(t, c, p, idx, pre, r, mod); blocs += n;
        progres((k + 1) / total, `${lib} : ${n} bloc(s) de texte${r.ignores ? `, ${r.ignores} fragment(s) sans lettre ignoré(s)` : ''}.`, k + 1);
      }
    } finally { await moteur.terminer(); }   // libère le worker et la mémoire WebAssembly
    return { pages: P.pages.length, blocs };
  }, apres: () => panneau?.rafraichir() });
  // Mises à jour en direct de la progression dans le panneau de la page
  file.abonner((t) => { if (t.type === 'ocr-pages' || t.supprime) panneau?.progres(t); });

  async function lancer(c, pageIds, { comparer = null, nom } = {}) {
    const etats = await (await M()).etatModeles(), manquants = O.languesDe(reglages.langues).filter((x) => etats[x].etat !== 'disponible');
    if (manquants.length) { info(`Modèle OCR absent (${manquants.map((x) => O.MODELES.langues[x].nom).join(', ')}) : à installer dans Moteurs › OCR local.`); return null; }
    const t = await file.ajouter('ocr-pages', { comic: c.id, pages: pageIds, langues: reglages.langues, pretraitement: reglages.pretraitement, zone: reglages.zone, segmentation: reglages.segmentation, ...(comparer ? { comparer } : {}) },
      { nom: nom || `OCR · ${c.serie || 'Sans série'} #${c.numero || '?'} · ${pageIds.length} page(s)` });
    info(`OCR lancé en arrière-plan (${pageIds.length} page(s)) : progression ci-dessous et dans Moteurs ; annulable.`); return t;
  }

  // ---------- Aperçu d'une zone (image source ↔ texte) ----------
  async function apercuZone(pageId, z, { largeur = 320 } = {}) {
    const p = await db.lire('pages', pageId); if (!p?.blob || !z) return el('span', { className: 'note', textContent: 'Page source introuvable.' });
    const bm = await createImageBitmap(p.blob), W = bm.width, H = bm.height, m = 0.02, x = Math.max(0, (z.x - m) * W), y = Math.max(0, (z.y - m) * H), w = Math.min(W - x, (z.w + 2 * m) * W), h = Math.min(H - y, (z.h + 2 * m) * H);
    const e = Math.min(1.5, largeur / w), cv = el('canvas', { width: Math.max(1, Math.round(w * e)), height: Math.max(1, Math.round(h * e)), className: 'apercu-zone', 'aria-label': 'Zone de la page où le texte a été reconnu' }), g = cv.getContext('2d');
    g.drawImage(bm, x, y, w, h, 0, 0, cv.width, cv.height); g.strokeStyle = '#ffe500'; g.lineWidth = 2; g.setLineDash([5, 3]); g.strokeRect((z.x * W - x) * e, (z.y * H - y) * e, z.w * W * e, z.h * H * e); bm.close?.();
    return cv;
  }
  // Aperçu d'un prétraitement (copie réduite pour l'affichage, jamais enregistrée)
  async function apercuPretraitement(pageId, preset, largeur = 420) {
    const p = await db.lire('pages', pageId), bm = await createImageBitmap(p.blob), e = Math.min(1, largeur / bm.width), cv = el('canvas', { width: Math.round(bm.width * e), height: Math.round(bm.height * e), className: 'apercu-pre' }), g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(bm, 0, 0, cv.width, cv.height); bm.close?.(); const P = O.PRETRAITEMENTS[preset]; if (P.gris || P.contraste || P.binaire) { const d = g.getImageData(0, 0, cv.width, cv.height); O.traiterPixels(d.data, P); g.putImageData(d, 0, 0); } return cv;
  }

  // ---------- Panneau du lecteur de pages ----------
  function panneauPage(c, p, pageIdx, cadre) {
    const z = el('div', { className: 'carte-bloc', id: 'ocr-panneau' }), resultats = el('div', { id: 'ocr-resultats' }), prog = el('div', { id: 'ocr-progres', className: 'pile' }), etatM = el('p', { className: 'note', id: 'ocr-etat-modeles', textContent: 'Vérification des modèles…' });
    let passeSel = null, montrerZones = true, choisis = new Set();
    const reg = (k, opts) => { const s = choix(opts, reglages[k]); s.id = `ocr-${k}`; s.addEventListener('change', () => { reglages[k] = s.value; sauverReglages(); }); return s; };
    const plage = saisie(String(pageIdx + 1), { id: 'ocr-plage', placeholder: 'ex. 1-5, 8', 'aria-label': 'Pages à reconnaître' });
    const pre2 = choix(Object.fromEntries(Object.entries(O.PRETRAITEMENTS).map(([k, v]) => [k, v.nom])), reglages.pretraitement === 'original' ? 'x2-gris' : 'original'); pre2.id = 'ocr-pre2';
    chargerReglages().then(() => { for (const k of ['langues', 'pretraitement', 'zone', 'segmentation']) { const s = z.querySelector(`#ocr-${k}`); if (s) s.value = reglages[k]; } });
    M().then((m) => m.etatModeles()).then((e) => { const d = Object.values(e).filter((x) => x.etat === 'disponible').map((x) => x.nom); etatM.textContent = d.length ? `Modèles installés : ${d.join(', ')}. Moteur : Tesseract.js dans ce navigateur, aucune image envoyée.` : 'Aucun modèle OCR installé : installer le français et/ou l\'anglais dans Moteurs › OCR local (une seule fois, puis hors ligne).'; etatM.dataset.etat = d.length ? 'ok' : 'alerte'; })
      .catch((e) => { etatM.textContent = `OCR indisponible : ${e.message}. La transcription manuelle reste disponible.`; etatM.dataset.etat = 'alerte'; });
    const zonesSur = (as) => { cadre.querySelectorAll('.zone-ocr').forEach((x) => x.remove()); if (!montrerZones) return; for (const a of as) { if (!a.zone) continue; const d = el('div', { className: 'zone-ocr', dataset: { ocr: a.id, statut: a.statut }, title: `${a.ocr?.ordre ?? ''}. ${a.contenu}`, style: `left:${a.zone.x * 100}%;top:${a.zone.y * 100}%;width:${a.zone.w * 100}%;height:${a.zone.h * 100}%` }, el('span', { textContent: String(a.ocr?.ordre ?? '') }));
      d.addEventListener('pointerdown', (e) => { e.stopPropagation(); const l = z.querySelector(`[data-bloc="${CSS.escape(a.id)}"]`); l?.scrollIntoView({ block: 'nearest' }); l?.querySelector('textarea')?.focus(); }); cadre.append(d); } };
    async function rafraichir() {
      if (!z.isConnected) return; const passes = (await db.tous('ocr-passes').catch(() => [])).filter((x) => x.pageId === p.id).sort((a, b) => b.date - a.date);
      if (!passes.length) { resultats.replaceChildren(el('p', { className: 'vide', textContent: 'Aucun résultat OCR pour cette page.' })); zonesSur([]); return; }
      if (!passes.some((x) => x.id === passeSel)) passeSel = passes[0].id;
      const toutes = await kb.ocrDePage(p.id), P = passes.find((x) => x.id === passeSel), as = toutes.filter((a) => a.origine.passe === passeSel).sort((a, b) => a.ocr.ordre - b.ocr.ordre);
      const sel = choix(Object.fromEntries(passes.map((x) => [x.id, `${new Date(x.date).toLocaleString('fr-FR')} · ${O.COMBINAISONS[x.langues] || x.langues} · ${O.PRETRAITEMENTS[x.pretraitement]?.nom} · ${O.ZONES[x.zoneMode]} · ${x.blocs} bloc(s) · ${(x.duree / 1000).toFixed(1)} s`])), passeSel); sel.id = 'ocr-passe';
      sel.addEventListener('change', () => { passeSel = sel.value; choisis.clear(); rafraichir(); });
      const voir = el('input', { type: 'checkbox', checked: montrerZones, id: 'ocr-voir-zones' }); voir.addEventListener('change', () => { montrerZones = voir.checked; zonesSur(as); });
      const lot = (statut, lib) => bouton(`${lib} (${choisis.size})`, async () => { let n = 0; for (const id of choisis) { try { await kb.statuer(id, statut, 'action groupée (OCR)'); n++; } catch (e) { info(e.message); } } choisis.clear(); info(`${n} bloc(s) : ${K.STATUTS[statut].toLowerCase()}.`); rafraichir(); }, { disabled: !choisis.size, className: 'petit', dataset: { lotOcr: statut } });
      const lignes = await Promise.all(as.map(async (a) => {
        const cb = el('input', { type: 'checkbox', checked: choisis.has(a.id), 'aria-label': `Sélectionner le bloc ${a.ocr.ordre}` }); cb.addEventListener('change', () => { cb.checked ? choisis.add(a.id) : choisis.delete(a.id); rafraichir(); });
        const t = autoTaille(zoneTexte(a.contenu, { rows: 2, 'aria-label': `Texte du bloc ${a.ocr.ordre}` })); t.addEventListener('change', async () => { await kb.corriger(a.id, t.value); info('Texte corrigé (texte OCR initial conservé dans l\'historique).'); rafraichir(); });
        const ligne = el('div', { className: 'ligne-element bloc-ocr', dataset: { bloc: a.id, statut: a.statut } },
          el('div', { className: 'pile' }, el('div', { className: 'rangee' }, cb, el('b', { textContent: `${a.ocr.ordre}.` }), el('span', { className: 'badge-prov', dataset: { prov: a.categorie === 'incertain' ? 'incertain' : 'dialogue' }, textContent: K.CATEGORIES[a.categorie] }),
            el('span', { className: 'compteur', textContent: `confiance Tesseract ${pc(a.confiance)}${a.case ? ` · case ${a.case}` : ''}${a.ocr.motsFaibles ? ` · ${a.ocr.motsFaibles} mot(s) douteux` : ''}` }), el('b', { className: 'statut-kb', dataset: { statut: a.statut }, textContent: K.STATUTS[a.statut] })),
            el('div', { className: 'image-texte' }, await apercuZone(p.id, a.zone, { largeur: 260 }), t),
            a.contenu !== a.ocr.texteBrut ? el('span', { className: 'note', textContent: `Texte OCR initial : « ${a.ocr.texteBrut} »` }) : null),
          el('div', { className: 'pile' }, a.statut !== 'valide' ? bouton('Valider', async () => { try { await kb.statuer(a.id, 'valide', 'validation individuelle (OCR)'); } catch (e) { info(e.message); } rafraichir(); }, { className: 'accent petit', dataset: { validerOcr: a.id } }) : null,
            a.statut !== 'rejete' ? bouton('Rejeter', async () => { await kb.statuer(a.id, 'rejete', 'rejet (OCR)'); rafraichir(); }, { className: 'petit', dataset: { rejeterOcr: a.id } }) : null));
        ligne.addEventListener('pointerenter', () => cadre.querySelector(`.zone-ocr[data-ocr="${CSS.escape(a.id)}"]`)?.classList.add('actif')); ligne.addEventListener('pointerleave', () => cadre.querySelectorAll('.zone-ocr.actif').forEach((x) => x.classList.remove('actif')));
        return ligne; }));
      resultats.replaceChildren(champ('Passage OCR', sel),
        el('p', { className: 'note', textContent: `${P.blocs} bloc(s) · ${P.ignores} fragment(s) sans lettre ignoré(s) · ${P.ordreCertain ? 'ordre de lecture établi par les cases' : 'ordre de lecture APPROXIMATIF (à vérifier)'} · ${P.moteur}. Les zones sont des zones de texte reconnues, pas des contours de bulles ; la confiance Tesseract n'est pas un taux d'exactitude.` }),
        el('div', { className: 'rangee' }, el('label', { className: 'bascule' }, voir, 'Afficher les zones sur la page'), bouton('Tout sélectionner', () => { choisis = choisis.size ? new Set() : new Set(as.map((a) => a.id)); rafraichir(); }, { className: 'petit' }), lot('valide', 'Valider la sélection'), lot('rejete', 'Rejeter la sélection'),
          passes.length > 1 ? bouton('Garder ce passage seul', async () => { let n = 0; for (const a of toutes) if (a.origine.passe !== passeSel && a.statut !== 'valide' && a.statut !== 'rejete') { await kb.statuer(a.id, 'rejete', 'autre passage OCR conservé'); n++; } info(`${n} bloc(s) des autres passages rejeté(s) (conservés dans l'historique).`); rafraichir(); }, { className: 'petit', id: 'ocr-garder' }) : null),
        el('div', { className: 'liste-elements', id: 'ocr-blocs' }, ...lignes),
        passes.length > 1 ? await comparaison(passes, toutes) : null);
      zonesSur(as);
    }
    // Comparaison de deux passages : texte, confiance, durée ; exactitude mesurée seulement s'il existe une référence humaine
    async function comparaison(passes, toutes) {
      const opts = Object.fromEntries(passes.map((x) => [x.id, `${O.PRETRAITEMENTS[x.pretraitement]?.nom} · ${O.COMBINAISONS[x.langues] || x.langues} · ${new Date(x.date).toLocaleTimeString('fr-FR')}`])), a = choix(opts, passes[0].id), b = choix(opts, passes[1].id);
      const ref = [...(p.transcriptions || []).filter((t) => t.statut === 'lu' && t.texte.trim()).map((t) => t.texte), ...toutes.filter((x) => x.statut === 'valide').sort((x, y) => x.ocr.ordre - y.ocr.ordre).map((x) => x.contenu)].join(' ');
      const vue = el('div', { className: 'grille2' }), maj = async () => vue.replaceChildren(...await Promise.all([a.value, b.value].map(async (id) => { const x = passes.find((y) => y.id === id), as = toutes.filter((y) => y.origine.passe === id), conf = as.length ? as.reduce((s, y) => s + y.confiance, 0) / as.length : null, m = ref ? O.mesurer(ref, x.texte) : null;
        return el('div', { className: 'pile comparaison-ocr' }, el('b', { textContent: O.PRETRAITEMENTS[x.pretraitement]?.nom }), await apercuPretraitement(p.id, x.pretraitement, 300),
          el('span', { className: 'note', textContent: `${x.blocs} bloc(s) · confiance moyenne ${pc(conf)} · ${(x.duree / 1000).toFixed(1)} s${m ? ` · exactitude des mots ${pc(m.exactitude)} · WER ${pc(m.wer)} · CER ${pc(m.cer)} (référence : ${m.mots} mots validés ou transcrits)` : ' · exactitude non mesurable : aucune référence validée'}` }),
          el('pre', { className: 'texte-ocr', textContent: x.texte || '(aucun texte)' })); })));
      a.addEventListener('change', maj); b.addEventListener('change', maj); await maj();
      return el('div', { className: 'carte-bloc', id: 'ocr-comparaison' }, el('h3', { textContent: 'Comparer deux passages' }), el('div', { className: 'grille2' }, champ('Passage A', a), champ('Passage B', b)), vue);
    }
    function progres(t) {
      if (!prog.isConnected) return; if (t.supprime || t.params?.comic !== c.id) return;
      if (['termine', 'annule', 'erreur'].includes(t.etat)) { prog.replaceChildren(el('p', { className: 'note', dataset: { etatOcr: t.etat }, textContent: t.etat === 'termine' ? `OCR terminé : ${t.resultat?.blocs ?? 0} bloc(s) sur ${t.resultat?.pages ?? 0} page(s).` : t.etat === 'annule' ? 'OCR annulé : les pages déjà traitées sont conservées.' : `Erreur OCR : ${t.erreur}` })); return; }
      prog.replaceChildren(el('div', { className: 'rangee' }, el('div', { className: 'jauge', role: 'progressbar', 'aria-valuenow': String(Math.round((t.progres || 0) * 100)), 'aria-valuemin': '0', 'aria-valuemax': '100' }, el('i', { style: `width:${Math.round((t.progres || 0) * 100)}%` })),
        bouton('Annuler', () => file.annuler(t.id), { className: 'petit', id: 'ocr-annuler' })), el('span', { className: 'note', textContent: `${t.nom} · ${Math.round((t.progres || 0) * 100)} % ${t.message ? `· ${t.message}` : ''}` }));
    }
    z.append(el('h3', { textContent: 'Texte reconnu (OCR local)' }), etatM,
      el('div', { className: 'grille2' }, champ('Langue', reg('langues', O.COMBINAISONS)), champ('Prétraitement', reg('pretraitement', Object.fromEntries(Object.entries(O.PRETRAITEMENTS).map(([k, v]) => [k, v.nom])))), champ('Zone', reg('zone', O.ZONES)), champ('Découpage du texte', reg('segmentation', Object.fromEntries(Object.entries(O.SEGMENTATIONS).map(([k, v]) => [k, v.nom]))))),
      el('div', { className: 'rangee' }, bouton('Reconnaître cette page', () => lancer(c, [p.id]), { className: 'accent', id: 'ocr-page' }), champ('Pages', plage), bouton('Reconnaître ces pages', () => { try { lancer(c, O.lirePlage(plage.value, c.pages.length).map((i) => c.pages[i])); } catch (e) { info(e.message); } }, { id: 'ocr-selection' }),
        bouton('Tout le numéro (arrière-plan)', () => lancer(c, [...c.pages]), { id: 'ocr-numero' })),
      el('div', { className: 'rangee' }, champ('Comparer avec', pre2), bouton('Comparer les prétraitements sur cette page', () => { if (pre2.value === reglages.pretraitement) return info('Choisir un prétraitement différent pour comparer.'); lancer(c, [p.id], { comparer: [reglages.pretraitement, pre2.value], nom: `OCR · comparaison · p. ${pageIdx + 1}` }); }, { id: 'ocr-comparer' })),
      el('p', { className: 'note', textContent: 'Les traitements passent par la file (Moteurs › Traitements) : une page à la fois, résultats enregistrés page par page (rien de perdu si la page est fermée). Tout résultat arrive « à vérifier » et n\'entre jamais dans un script sans validation.' }),
      prog, resultats, ouvrirMoteurs ? bouton('Installer ou gérer les modèles…', ouvrirMoteurs, { className: 'petit' }) : null);
    panneau = { rafraichir, progres };
    file.lister().then((ts) => { const t = ts.find((x) => x.type === 'ocr-pages' && x.params?.comic === c.id && ['attente', 'en-cours'].includes(x.etat)); if (t) progres(t); });
    rafraichir();
    return z;
  }

  // ---------- Moteurs › OCR local : installation des modèles, hors ligne, test ----------
  function sectionMoteurs() {
    const z = el('div', { className: 'carte-bloc', id: 'ocr-moteur' }), corps = el('div', {}), res = el('p', { className: 'note', id: 'ocr-moteur-resultat' });
    const fichier = el('input', { type: 'file', accept: '.traineddata', id: 'ocr-importer', className: 'masque' });
    fichier.addEventListener('change', async () => { const f = fichier.files[0]; fichier.value = ''; if (!f) return; try { const code = await (await M()).importerModele(f); res.textContent = `Modèle ${O.MODELES.langues[code].nom} importé et vérifié (empreinte SHA-256 conforme).`; } catch (e) { res.textContent = `Import refusé : ${e.message}.`; } afficher(); });
    async function afficher() {
      let m; try { m = await M(); } catch (e) { corps.replaceChildren(el('p', { className: 'moteur-statut', textContent: `${e.message}. La transcription manuelle reste disponible.` })); return; }
      const etats = await m.etatModeles(), cache = await m.moteurEnCache(), dispo = Object.entries(etats).filter(([, e]) => e.etat === 'disponible');
      corps.replaceChildren(
        el('table', { className: 'tableau-caps', id: 'ocr-modeles' }, el('tbody', {}, ...Object.entries(etats).map(([code, e]) => { const jauge = el('progress', { max: 1, value: 0, hidden: true, id: `ocr-dl-${code}` });
          return el('tr', { dataset: { modele: code, etat: e.etat } }, el('th', { textContent: `${e.nom} (${code})` }),
            el('td', {}, el('b', { className: 'statut-kb', dataset: { statut: e.etat === 'disponible' ? 'valide' : e.etat === 'erreur' ? 'rejete' : 'a-verifier' }, textContent: e.etat === 'disponible' ? (e.pret ? 'Prêt' : 'Disponible') : e.etat === 'erreur' ? 'Erreur de chargement' : 'Absent · téléchargement initial nécessaire' }), jauge,
              e.etat === 'disponible' ? el('span', { className: 'note', textContent: ` ${(e.taille / 1048576).toFixed(1)} Mo · vérifié SHA-256 · ${new Date(e.date).toLocaleDateString('fr-FR')}` }) : e.erreur ? el('span', { className: 'note', textContent: ` ${e.erreur}` }) : null),
            el('td', {}, e.etat === 'disponible' ? bouton('Supprimer', async () => { if (!confirm(`Supprimer le modèle ${e.nom} de cet appareil ?`)) return; await m.supprimerModele(code); afficher(); }, { className: 'petit' })
              : bouton(`Télécharger (${(O.MODELES.langues[code].taille / 1048576).toFixed(1)} Mo)`, async (ev) => {
                if (!confirm(`Télécharger le modèle ${e.nom} « fast » (${(O.MODELES.langues[code].taille / 1048576).toFixed(1)} Mo) depuis raw.githubusercontent.com (dépôt officiel ${O.MODELES.depot} ${O.MODELES.version}, licence Apache-2.0) ?\n\nUne seule fois : il sera ensuite conservé sur cet appareil. Aucune image n'est envoyée.`)) return;
                ev.target.disabled = true; jauge.hidden = false; try { await m.telechargerModele(code, { progres: (x) => { jauge.value = x; } }); res.textContent = `Modèle ${e.nom} installé et vérifié.`; } catch (err) { res.textContent = `Échec du téléchargement : ${err.message}. Vous pouvez aussi importer le fichier ${code}.traineddata.`; } afficher(); }, { className: 'accent petit', dataset: { telecharger: code } }))); }))),
        el('p', { className: 'note', textContent: `Hors ligne : ${cache === null ? 'non vérifiable dans ce navigateur' : cache ? 'moteur conservé sur l\'appareil (fonctionne sans réseau)' : 'moteur pas encore mis en cache'} · cœur WebAssembly intégré à DA-PRIME (aucun chargement externe).` }),
        el('div', { className: 'rangee' }, el('label', { className: 'bouton petit', for: 'ocr-importer', textContent: 'Importer un fichier .traineddata…' }), fichier,
          bouton('Préparer le hors-ligne', async () => { res.textContent = (await m.mettreEnCacheMoteur()) ? 'Fichiers du moteur conservés pour une utilisation hors ligne.' : 'Mise en cache impossible dans ce navigateur (le moteur reste utilisable en ligne).'; afficher(); }, { className: 'petit', id: 'ocr-hors-ligne' }),
          dispo.length ? bouton('Tester le moteur', () => tester(m, dispo.map(([c]) => c)), { className: 'petit', id: 'ocr-tester' }) : null), res);
    }
    async function tester(m, codes) {
      res.textContent = 'Test en cours (texte de contrôle dessiné sur l\'appareil)…';
      try { const c = Object.assign(document.createElement('canvas'), { width: 900, height: 220 }), g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 900, 220); g.fillStyle = '#111'; g.font = 'bold 44px sans-serif'; g.fillText('CONTROLE OCR 2026', 60, 130);
        const blob = await new Promise((r) => c.toBlob(r, 'image/png')), t0 = performance.now(), mo = await m.creerMoteur(codes.includes('eng') ? 'eng' : codes[0]); await mo.parametrer('bloc'); const r = await m.ocrPage(mo, { blob, cases: [] }, { pretraitement: 'original' }); await mo.terminer();
        const ok = O.mesurer('CONTROLE OCR 2026', r.blocs.map((b) => b.texte).join(' ')).exactitude === 1;
        if (ok) for (const code of codes) { const x = await db.lire('modeles-ocr', `${code}-fast`); if (x) await db.ecrire('modeles-ocr', { ...x, pret: true }); }
        res.textContent = ok ? `OCR prêt : texte de contrôle reconnu à l'identique en ${Math.round(performance.now() - t0)} ms.` : `Le moteur répond mais le texte de contrôle est mal reconnu (« ${r.blocs.map((b) => b.texte).join(' ')} »).`; afficher();
      } catch (e) { res.textContent = `Erreur de chargement du moteur : ${e.message}`; }
    }
    z.append(el('h3', { textContent: 'OCR local (Tesseract.js)' }),
      el('p', { className: 'note', textContent: `Moteur Tesseract.js 7.0.0 (Apache-2.0) intégré et exécuté dans ce navigateur. Modèles « fast » ${O.MODELES.depot} ${O.MODELES.version} (Apache-2.0), téléchargés seulement à votre demande, vérifiés par empreinte, puis utilisables hors ligne. Les modèles « best » ne sont pas proposés (incompatibles avec Tesseract.js).` }), corps);
    afficher(); return z;
  }
  return { panneauPage, sectionMoteurs, apercuZone, lancer, chargerReglages, relancerPage: async (comicId, pageId) => { const c = await db.lire('comics', comicId); if (c) { await chargerReglages(); return lancer(c, [pageId]); } }, ouvrirPage };
}
