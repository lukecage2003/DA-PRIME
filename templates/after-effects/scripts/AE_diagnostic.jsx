// Primestone · diagnostic After Effects (lecture seule, ne modifie pas le projet ouvert)
// Lancer : After Effects > Fichier > Scripts > Exécuter le fichier script… > AE_diagnostic.jsx
// Prérequis : Préférences > Scripts et expressions > « Autoriser les scripts à écrire des fichiers » coché.
#target aftereffects
#include "../../common/primestone-tokens.jsxinc"
#include "../../common/primestone-diagnostic.jsxinc"
(function () {
  var r = new PS_Report("After Effects");
  var major = parseFloat(app.version);
  r.add(null, "Version After Effects", app.version + " (" + $.os + ")");
  r.add(null, "Moteur ExtendScript", $.version);
  r.add(major >= 23, "Version récente (2023 / v23 ou plus)", "requise pour les modèles Primestone");
  r.add(major >= 16.1, "Export MOGRT par script", major >= 16.1 ? "disponible (exportAsMotionGraphicsTemplate)" : "indisponible : mettre à jour After Effects");
  var canWrite = false;
  try { canWrite = app.preferences.getPrefAsLong("Main Pref Section", "Pref_SCRIPTING_FILE_NETWORK_SECURITY") === 1; } catch (e) {}
  r.add(canWrite, "Scripts autorisés à écrire des fichiers", canWrite ? "oui" : "cocher l'option dans Préférences > Scripts et expressions");
  PS_checkFonts(r, function (ps) {
    if (!app.fonts || !app.fonts.getFontsByPostScriptName) return null; // API polices : AE 24 et plus
    return app.fonts.getFontsByPostScriptName(ps).length > 0;
  });
  if (!canWrite) { alert("Primestone · diagnostic After Effects\n\n" + r.lines.join("\n")); return; }
  var f = r.save();
  alert("Primestone · diagnostic After Effects\n\n" + r.ok + " OK, " + r.ko + " manquant(s).\n\nRapport : " + f.fsName);
})();
