// Primestone · diagnostic Illustrator (lecture seule)
// Lancer : Illustrator > Fichier > Scripts > Autre script… > AI_diagnostic.jsx
#target illustrator
#include "../../common/primestone-tokens.jsxinc"
#include "../../common/primestone-diagnostic.jsxinc"
(function () {
  var r = new PS_Report("Illustrator");
  r.add(null, "Version Illustrator", app.version + " (" + $.os + ")");
  r.add(null, "Moteur ExtendScript", $.version);
  r.add(parseInt(app.version, 10) >= 27, "Version récente (2023 / v27 ou plus)", "requise pour les gabarits Primestone");
  PS_checkFonts(r, function (ps) { return app.textFonts.getByName(ps) ? true : false; });
  var f = r.save();
  alert("Primestone · diagnostic Illustrator\n\n" + r.ok + " OK, " + r.ko + " manquant(s).\n\nRapport : " + f.fsName);
})();
