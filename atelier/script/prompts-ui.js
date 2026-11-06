// Script Studio › Prompt Studio : bibliothèque de modèles, variables du projet, versions compacte/détaillée, favoris, historique.
// Un prompt n'est JAMAIS envoyé : il est copié par l'utilisateur vers l'outil de son choix.
import { db } from '../motion/stockage.js';
import { MODELES, CATEGORIES, variables, remplir, estimationTokens, VARIABLES } from '../../templates/_systeme/script-prompts.js';
import { $, el, bouton, champ, choix, saisie, zone, info, telecharger, sans } from './ui.js';

export function initPrompts({ projets, profilDe, critique }) {
  let perso = [], historique = [], favoris = new Set(), courant = 'creation', version = 'compact', projetId = null, seqId = '';
  $('#categorie-prompts').append(el('option', { value: '', textContent: 'Toutes les catégories' }), ...Object.entries(CATEGORIES).map(([k, v]) => el('option', { value: k, textContent: v })));
  async function charger() { const tout = await db.tous('prompts').catch(() => []); perso = tout.filter((x) => x.genre === 'modele'); historique = tout.filter((x) => x.genre === 'historique').sort((a, b) => b.date - a.date); favoris = new Set(tout.find((x) => x.id === 'favoris')?.ids || []); }
  const tous = () => ({ ...MODELES, ...Object.fromEntries(perso.map((m) => [m.id, m])) });
  function lister() {
    const q = sans($('#recherche-prompts').value), cat = $('#categorie-prompts').value, fav = $('#favoris-prompts').checked;
    $('#liste-prompts').replaceChildren(...Object.entries(tous()).filter(([k, m]) => (!q || sans(`${m.nom} ${(m.tags || []).join(' ')}`).includes(q)) && (!cat || m.categorie === cat) && (!fav || favoris.has(k))).map(([k, m]) => el('li', {}, bouton(`${favoris.has(k) ? '★ ' : ''}${m.nom}${m.genre === 'modele' ? ' (perso)' : ''}`, () => { courant = k; rendre(); }, { 'aria-pressed': String(k === courant), dataset: { modele: k } }))));
    $('#historique-prompts').replaceChildren(...historique.slice(0, 20).map((h) => el('li', {}, bouton(`${new Date(h.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })} · ${h.nom}`, () => { const t = $('#texte-prompt'); if (t) t.value = h.texte; info('Prompt de l\'historique rechargé.'); }))));
  }
  ['#recherche-prompts', '#categorie-prompts', '#favoris-prompts'].forEach((s) => $(s).addEventListener('input', lister));
  function rendre() {
    lister(); const m = tous()[courant], ps = projets().filter((p) => !p.archive); if (!projetId || !ps.some((p) => p.id === projetId)) projetId = ps[0]?.id || null;
    const p = ps.find((x) => x.id === projetId), seqs = p ? p.sequences.filter((s) => s.niveau === 2) : [], sq = seqs.find((s) => s.id === seqId);
    const vars = p ? variables(p, { profil: profilDe(p), sequence: sq, problemes: critique()?.problemes?.filter((x) => x.statut === 'ouvert') || [] }) : {};
    const texte = remplir(m[version] || m.detaille || m.compact, vars), t = el('textarea', { id: 'texte-prompt', className: 'apercu-export', value: texte }), jet = el('span', { className: 'compteur', textContent: `≈ ${estimationTokens(texte)} jetons · ${texte.length} caractères` });
    t.addEventListener('input', () => { jet.textContent = `≈ ${estimationTokens(t.value)} jetons · ${t.value.length} caractères`; });
    const sp = choix(Object.fromEntries(ps.map((x) => [x.id, x.nom])), projetId || ''); sp.addEventListener('change', () => { projetId = sp.value; seqId = ''; rendre(); });
    const ss = choix({ '': 'Aucune séquence', ...Object.fromEntries(seqs.map((s) => [s.id, s.titre])) }, seqId); ss.addEventListener('change', () => { seqId = ss.value; rendre(); });
    const vv = choix({ compact: 'Version compacte', detaille: 'Version détaillée' }, version); vv.addEventListener('change', () => { version = vv.value; rendre(); });
    $('#prompt').replaceChildren(el('div', { className: 'carte-bloc' }, el('h3', { textContent: m.nom }), el('p', { className: 'note', textContent: `${CATEGORIES[m.categorie] || ''} · le prompt est assemblé sur l'appareil à partir du projet. Il n'est jamais envoyé : le copier vers l'outil d'IA de votre choix.` }),
      el('div', { className: 'grille2' }, champ('Projet', sp), champ('Séquence (réécriture)', ss), champ('Longueur', vv)), t, el('div', { className: 'rangee' }, jet,
        bouton('Copier', async () => { try { await navigator.clipboard.writeText(t.value); } catch { t.select(); document.execCommand?.('copy'); } const h = { id: `h${Date.now().toString(36)}`, genre: 'historique', nom: m.nom, texte: t.value, date: Date.now() }; await db.ecrire('prompts', h); historique.unshift(h); for (const x of historique.slice(50)) await db.suppr('prompts', x.id); historique = historique.slice(0, 50); lister(); info('Prompt copié (rien n\'a été envoyé).'); }, { className: 'accent', id: 'copier-prompt' }),
        bouton(favoris.has(courant) ? '★ Favori' : '☆ Favori', async () => { favoris.has(courant) ? favoris.delete(courant) : favoris.add(courant); await db.ecrire('prompts', { id: 'favoris', genre: 'favoris', ids: [...favoris] }); rendre(); }, { id: 'favori-prompt' }),
        bouton('Enregistrer comme modèle personnel', () => editer({ id: `pm${Date.now().toString(36)}`, genre: 'modele', nom: `${m.nom} (personnalisé)`, categorie: m.categorie, tags: [], compact: m.compact || '', detaille: m.detaille || '' }), { id: 'personnaliser-prompt' }),
        m.genre === 'modele' ? bouton('Modifier le modèle', () => editer(m)) : null)),
      el('details', { className: 'carte-bloc' }, el('summary', { textContent: 'Variables disponibles' }), el('p', { className: 'note', textContent: VARIABLES.map((v) => `{{${v}}}`).join('  ') })));
  }
  function editer(m) {
    const n = saisie(m.nom), c = choix(CATEGORIES, m.categorie), tg = saisie((m.tags || []).join(', ')), co = zone(m.compact, { rows: 5 }), de = zone(m.detaille, { rows: 10 });
    $('#prompt').replaceChildren(el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Modèle personnel' }), el('div', { className: 'grille2' }, champ('Nom', n), champ('Catégorie', c), champ('Tags', tg)), champ('Version compacte', co), champ('Version détaillée', de),
      el('div', { className: 'rangee' }, bouton('Enregistrer', async () => { Object.assign(m, { nom: n.value, categorie: c.value, tags: tg.value.split(',').map((x) => x.trim()).filter(Boolean), compact: co.value, detaille: de.value }); await db.ecrire('prompts', m); await charger(); courant = m.id; rendre(); info('Modèle enregistré.'); }, { className: 'accent', id: 'enregistrer-modele-prompt' }),
        perso.some((x) => x.id === m.id) ? bouton('Supprimer', async () => { if (!confirm('Supprimer ce modèle ?')) return; await db.suppr('prompts', m.id); await charger(); courant = 'creation'; rendre(); }, { className: 'danger' }) : null, bouton('Annuler', rendre))));
  }
  $('#exporter-prompts').addEventListener('click', () => telecharger(JSON.stringify({ format: 'da-prime-prompts', version: 1, modeles: perso }, null, 2), 'modeles-prompts.json', 'application/json'));
  $('#importer-prompts').addEventListener('change', async (ev) => { const f = ev.target.files[0]; ev.target.value = ''; if (!f) return; try { const j = JSON.parse(await f.text()); let n = 0; for (const m of j.modeles || []) if (m?.id && m.genre === 'modele') { await db.ecrire('prompts', m); n++; } await charger(); rendre(); info(`${n} modèle(s) importé(s).`); } catch { info('Fichier de modèles non reconnu.'); } });
  return { async afficher(P) { if (P) projetId = P.id; await charger(); rendre(); } };
}
