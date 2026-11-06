// Primestone · base locale de personnages pour les suggestions de l'assistant et des campagnes.
// Contenu volontairement minimal : nom, éditeur, ambiance visuelle SUGGÉRÉE (choix artistique, pas un fait) et étiquettes de thème.
// Aucune biographie, date ou première apparition : ces faits ne sont jamais inventés et restent à fournir ou à vérifier.
const P = (nom, editeur, univers, ...tags) => ({ nom, editeur, univers, tags });
export const PERSONNAGES = [
  // Héroïnes et héros noirs (campagne « un super-héros noir par jour »)
  P('Black Panther', 'Marvel', 'techno', 'noir', 'heros'), P('Shuri', 'Marvel', 'techno', 'noir', 'heros'), P('Storm', 'Marvel', 'mystique', 'noir', 'heros'),
  P('Miles Morales', 'Marvel', 'urbain', 'noir', 'heros'), P('Luke Cage', 'Marvel', 'urbain', 'noir', 'heros'), P('Blade', 'Marvel', 'urbain', 'noir', 'heros'),
  P('Sam Wilson', 'Marvel', 'techno', 'noir', 'heros'), P('War Machine', 'Marvel', 'techno', 'noir', 'heros'), P('Misty Knight', 'Marvel', 'urbain', 'noir', 'heros'),
  P('Monica Rambeau', 'Marvel', 'cosmique', 'noir', 'heros'), P('Ironheart', 'Marvel', 'techno', 'noir', 'heros'), P('Bishop', 'Marvel', 'techno', 'noir', 'heros'),
  P('Brother Voodoo', 'Marvel', 'mystique', 'noir', 'heros'), P('Moon Girl', 'Marvel', 'techno', 'noir', 'heros'), P('Black Lightning', 'DC', 'urbain', 'noir', 'heros'),
  P('Static', 'DC', 'urbain', 'noir', 'heros'), P('Cyborg', 'DC', 'techno', 'noir', 'heros'), P('John Stewart', 'DC', 'cosmique', 'noir', 'heros'),
  P('Vixen', 'DC', 'mystique', 'noir', 'heros'), P('Mister Terrific', 'DC', 'techno', 'noir', 'heros'), P('Steel', 'DC', 'techno', 'noir', 'heros'),
  P('Icon', 'DC', 'cosmique', 'noir', 'heros'), P('Nubia', 'DC', 'mystique', 'noir', 'heros'), P('Bumblebee', 'DC', 'techno', 'noir', 'heros'),
  P('Thunder', 'DC', 'urbain', 'noir', 'heros'), P('Naomi', 'DC', 'cosmique', 'noir', 'heros'), P('Hardware', 'DC', 'techno', 'noir', 'heros'), P('Spawn', 'Image', 'mystique', 'noir', 'heros'),
  // Personnages cosmiques
  P('Galactus', 'Marvel', 'cosmique', 'cosmique', 'entite'), P('Silver Surfer', 'Marvel', 'cosmique', 'cosmique', 'heros'), P('Thanos', 'Marvel', 'cosmique', 'cosmique', 'vilain'),
  P('Captain Marvel', 'Marvel', 'cosmique', 'cosmique', 'heros'), P('Nova', 'Marvel', 'cosmique', 'cosmique', 'heros'), P('Adam Warlock', 'Marvel', 'cosmique', 'cosmique', 'heros'),
  P('Gamora', 'Marvel', 'cosmique', 'cosmique', 'heros'), P('Darkseid', 'DC', 'cosmique', 'cosmique', 'vilain'), P('Martian Manhunter', 'DC', 'cosmique', 'cosmique', 'heros'),
  P('Green Lantern', 'DC', 'cosmique', 'cosmique', 'heros'), P('Starfire', 'DC', 'cosmique', 'cosmique', 'heros'),
  // Grandes figures
  P('Batman', 'DC', 'urbain', 'heros'), P('Superman', 'DC', 'cosmique', 'heros'), P('Wonder Woman', 'DC', 'mystique', 'heros'), P('The Flash', 'DC', 'techno', 'heros'),
  P('Nightwing', 'DC', 'urbain', 'heros'), P('Catwoman', 'DC', 'urbain', 'heros'), P('Zatanna', 'DC', 'mystique', 'heros'), P('Raven', 'DC', 'mystique', 'heros'),
  P('Spider-Man', 'Marvel', 'urbain', 'heros'), P('Daredevil', 'Marvel', 'urbain', 'heros'), P('Iron Man', 'Marvel', 'techno', 'heros'), P('Captain America', 'Marvel', 'urbain', 'heros'),
  P('Thor', 'Marvel', 'mystique', 'heros'), P('Hulk', 'Marvel', 'urbain', 'heros'), P('Wolverine', 'Marvel', 'urbain', 'heros'), P('Doctor Strange', 'Marvel', 'mystique', 'heros'),
  P('Scarlet Witch', 'Marvel', 'mystique', 'heros'), P('Moon Knight', 'Marvel', 'mystique', 'heros'),
  // Antagonistes
  P('Joker', 'DC', 'urbain', 'vilain'), P('Lex Luthor', 'DC', 'techno', 'vilain'), P('Bane', 'DC', 'urbain', 'vilain'), P('Doctor Doom', 'Marvel', 'techno', 'vilain'),
  P('Magneto', 'Marvel', 'mystique', 'vilain'), P('Venom', 'Marvel', 'urbain', 'vilain'), P('Red Skull', 'Marvel', 'urbain', 'vilain'), P('Ultron', 'Marvel', 'techno', 'vilain'),
];
export const UNIVERS = { cosmique: 'Cosmique', urbain: 'Urbain nocturne', mystique: 'Mystique', techno: 'Technologique' };
const sans = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const trouverPersonnage = (nom) => PERSONNAGES.find((p) => sans(p.nom) === sans(nom)) || null;
// Personnages cités dans un texte (noms complets, du plus long au plus court)
export function personnagesDans(texte) {
  const t = ' ' + sans(texte).replace(/[^a-z0-9' -]/g, ' ') + ' ', vus = [];
  for (const p of [...PERSONNAGES].sort((a, b) => b.nom.length - a.nom.length)) { const n = sans(p.nom); const i = t.indexOf(' ' + n + ' '); if (i >= 0 && !vus.some((v) => sans(v.p.nom).includes(n))) vus.push({ p, i }); }
  return vus.sort((a, b) => a.i - b.i).map((v) => v.p);
}
export { sans };
