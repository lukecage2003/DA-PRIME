// Primestone · diagnostic Photoshop (lecture seule)
// Lancer : Photoshop > Fichier > Scripts > Parcourir… > PS_diagnostic.jsx
// Résultat : fenêtre de synthèse + fichier Primestone_diagnostic_Photoshop.txt sur le Bureau.
#target photoshop
#include "../../common/primestone-tokens.jsxinc"
#include "../../common/primestone-diagnostic.jsxinc"
(function () {
  var r = new PS_Report("Photoshop");
  r.add(null, "Version Photoshop", app.version + " (" + $.os + ")");
  r.add(null, "Moteur ExtendScript", $.version);
  r.add(parseInt(app.version, 10) >= 24, "Version récente (2023 / v24 ou plus)", "requise pour les gabarits Primestone");
  PS_checkFonts(r, function (ps) { return app.fonts.getByName(ps) ? true : false; });
  var f = r.save();
  alert("Primestone · diagnostic Photoshop\n\n" + r.ok + " OK, " + r.ko + " manquant(s).\n\nRapport : " + f.fsName);
})();
