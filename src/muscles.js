// Fiches anatomiques affichées dans l'onglet « Muscles ».
//
// Le champ `exercises` contient des clés d'exercices de src/program.js : c'est
// ce qui relie la théorie à ce que tu fais réellement dans la semaine. Une clé
// inconnue est ignorée à l'affichage, donc rien ne casse si tu retires un
// exercice du programme.

export const REGIONS = [
  { key: 'poitrine', label: 'Poitrine' },
  { key: 'dos', label: 'Dos' },
  { key: 'epaules', label: 'Épaules' },
  { key: 'bras', label: 'Bras' },
  { key: 'tronc', label: 'Tronc' },
  { key: 'jambes', label: 'Jambes' },
]

export const MUSCLES = [
  // ---------------------------------------------------------------- Poitrine
  {
    key: 'grand_pectoral',
    region: 'poitrine',
    name: 'Grand pectoral',
    aka: 'les « pecs »',
    where:
      "Large éventail qui part de la clavicule, du sternum et des premières côtes, et vient se fixer sur le haut de l'humérus.",
    action:
      "Ramène le bras vers l'avant et vers l'intérieur. C'est lui qui pousse dans tous les développés et qui rapproche les mains dans les écartés. Il participe aussi à la rotation interne du bras.",
    parts: [
      {
        name: 'Faisceau claviculaire (haut)',
        text: "Fibres qui montent vers la clavicule. Elles travaillent quand le bras monte en diagonale, du bas vers le haut : incliné, écarté basse→haute.",
      },
      {
        name: 'Faisceau sterno-costal (moyen)',
        text: "La plus grosse portion du muscle, celle qui domine sur un développé couché à plat.",
      },
      {
        name: 'Faisceau abdominal (bas)',
        text: "Fibres qui descendent vers l'abdomen. Sollicitées quand le bras descend en diagonale : dips buste penché, écarté haute→basse.",
      },
    ],
    tip: "Un développé ne cible pas un faisceau au hasard : c'est l'angle du buste qui décide. 30° pour le haut, à plat pour le milieu, dips penché ou écarté descendant pour le bas. C'est la raison d'être des trois angles de ton programme.",
    exercises: ['dc_barre', 'di_barre', 'di_halteres', 'dips', 'ecarte_basse_haute', 'ecarte_haute_basse'],
  },
  {
    key: 'petit_pectoral',
    region: 'poitrine',
    name: 'Petit pectoral',
    where: "Caché sous le grand pectoral, des côtes 3 à 5 jusqu'au bec de l'omoplate.",
    action: "Tire l'omoplate vers l'avant et vers le bas. Il ne fait pas bouger le bras, il place l'épaule.",
    tip: "Il n'a pas d'exercice dédié, et il n'en a pas besoin : il se raccourcit chez ceux qui poussent beaucoup et tirent peu, ce qui enroule les épaules vers l'avant. Le volume de tirage et les face pulls sont le vrai traitement.",
    exercises: ['face_pull'],
  },

  // --------------------------------------------------------------------- Dos
  {
    key: 'grand_dorsal',
    region: 'dos',
    name: 'Grand dorsal',
    aka: 'latissimus dorsi, « les dorsaux »',
    where:
      "Le plus grand muscle du corps en surface : du bas de la colonne et du bassin jusqu'à l'avant de l'humérus.",
    action:
      "Ramène le bras vers le bas (tractions, tirage vertical) et vers l'arrière (rowing). C'est lui qui donne la largeur du dos, le fameux V.",
    tip: "Tire avec les coudes vers le sol ou vers la hanche, pas avec les mains — sinon les biceps prennent le travail. Et laisse les bras s'allonger complètement en position étirée : le dorsal a besoin de toute l'amplitude.",
    exercises: ['tractions', 'tirage_vertical', 'rowing_barre', 'rowing_haltere', 'tirage_horizontal', 'pullover_poulie'],
  },
  {
    key: 'grand_rond',
    region: 'dos',
    name: 'Grand rond',
    aka: 'teres major, « le petit dorsal »',
    where: "Du bord externe de l'omoplate à l'humérus, juste au-dessus du grand dorsal.",
    action:
      "Même fonction que le grand dorsal, en plus court : il tire le bras vers l'arrière et vers le bas. Il travaille avec lui sur tous les tirages.",
    tip: "Il répond surtout aux tirages verticaux, prise large. Pas besoin de le cibler à part.",
    exercises: ['tractions', 'tirage_vertical', 'pullover_poulie'],
  },
  {
    key: 'trapeze',
    region: 'dos',
    name: 'Trapèze',
    where: "Grand losange de la base du crâne au milieu du dos, et d'une épaule à l'autre.",
    action: "Il ne tire pas le bras : il pilote l'omoplate. Trois faisceaux, trois directions opposées.",
    parts: [
      { name: 'Supérieur', text: "Monte l'épaule (haussement). Travaille dans les développés au-dessus de la tête." },
      { name: 'Moyen', text: "Rapproche les omoplates. C'est la portion des rowings et du tirage horizontal." },
      {
        name: 'Inférieur',
        text: "Abaisse et fait pivoter l'omoplate. Le plus souvent faible, et le plus utile pour la santé de l'épaule.",
      },
    ],
    tip: "Le faisceau moyen et le faisceau inférieur font l'épaisseur du dos et gardent les épaules en place sous la barre. C'est ce qu'entretiennent le face pull et les tirages, pas les haussements d'épaules.",
    exercises: ['rowing_barre', 'tirage_horizontal', 'face_pull', 'oiseau', 'dev_militaire'],
  },
  {
    key: 'rhomboides',
    region: 'dos',
    name: 'Rhomboïdes',
    where: "Sous le trapèze, entre la colonne et le bord interne de l'omoplate.",
    action: "Serrent les omoplates l'une vers l'autre et les collent à la cage thoracique.",
    tip: "Sur un écarté inversé, si tu serres les omoplates, ce sont eux qui travaillent et plus le deltoïde postérieur. Selon ce que tu cherches, c'est une erreur ou l'objectif.",
    exercises: ['rowing_barre', 'tirage_horizontal', 'face_pull', 'oiseau'],
  },
  {
    key: 'erecteurs',
    region: 'dos',
    name: 'Érecteurs du rachis',
    aka: 'les spinaux, « les lombaires »',
    where: "Deux colonnes de muscles qui longent la colonne vertébrale, du bassin à la nuque.",
    action: "Ils redressent le tronc et surtout l'empêchent de s'enrouler vers l'avant sous une charge.",
    tip: "Ils ne se travaillent presque jamais seuls : ils bossent sur chaque squat et chaque roumain. Quand ils lâchent, le dos s'arrondit — c'est le signal d'arrêt de la série, pas quelque chose à négocier.",
    exercises: ['sdt_roumain', 'squat', 'rowing_barre'],
  },

  // ----------------------------------------------------------------- Épaules
  {
    key: 'deltoide',
    region: 'epaules',
    name: 'Deltoïde',
    aka: "« les épaules »",
    where: "Capuchon en trois parties qui recouvre l'articulation de l'épaule, de la clavicule et de l'omoplate à l'humérus.",
    action: "Chaque faisceau lève le bras dans une direction différente. Il faut donc les entraîner séparément.",
    parts: [
      {
        name: 'Antérieur',
        text: "Lève le bras vers l'avant. Déjà très sollicité par tous tes développés — il a rarement besoin de travail en plus.",
      },
      {
        name: 'Moyen (latéral)',
        text: "Lève le bras sur le côté. C'est lui qui donne la largeur des épaules, et seules les élévations latérales le ciblent vraiment.",
      },
      {
        name: 'Postérieur',
        text: "Tire le bras vers l'arrière. Le plus négligé, alors qu'il équilibre l'épaule face au volume de poussée.",
      },
    ],
    tip: "Sur un programme orienté pectoraux, l'antérieur reçoit déjà énormément de volume. Le moyen et le postérieur sont ceux à ajouter : c'est exactement le rôle des élévations, de l'oiseau et du face pull.",
    exercises: ['dev_militaire', 'elev_laterales', 'elev_laterales_poulie', 'oiseau', 'face_pull'],
  },
  {
    key: 'coiffe',
    region: 'epaules',
    name: 'Coiffe des rotateurs',
    aka: 'sus-épineux, sous-épineux, petit rond, sous-scapulaire',
    where: "Quatre petits muscles profonds qui enveloppent la tête de l'humérus et la maintiennent dans son logement.",
    action:
      "Ils font tourner le bras vers l'intérieur et vers l'extérieur, mais leur rôle principal est de centrer l'épaule pendant que les gros muscles poussent ou tirent.",
    tip: "Ils ne se voient pas et ne se chargent pas lourd : ils s'entraînent léger et propre. C'est le prix d'entrée pour continuer à développer couché dans dix ans — d'où le face pull en fin de séance.",
    exercises: ['face_pull', 'oiseau', 'elev_laterales'],
  },

  // -------------------------------------------------------------------- Bras
  {
    key: 'biceps',
    region: 'bras',
    name: 'Biceps brachial',
    where: "Sur l'avant du bras, de l'omoplate au radius. Il croise deux articulations : l'épaule et le coude.",
    action: "Plie le coude et tourne l'avant-bras paume vers le ciel (supination). Il participe aussi à tous les tirages.",
    parts: [
      { name: 'Chef long (externe)', text: "Celui qui fait le pic du biceps. Il s'étire quand le coude part derrière le corps — d'où le curl incliné." },
      { name: 'Chef court (interne)', text: "Donne l'épaisseur vue de face. Plus sollicité coudes devant le corps." },
    ],
    tip: "Il reçoit déjà beaucoup de travail lors des tractions et rowings. Trois ou quatre séries directes suffisent : c'est un petit muscle, il récupère mal si tu l'écrases.",
    exercises: ['curl_incline', 'curl_poulie', 'curl_marteau', 'tractions', 'rowing_barre'],
  },
  {
    key: 'brachial',
    region: 'bras',
    name: 'Brachial antérieur',
    where: "Sous le biceps, de l'humérus au cubitus.",
    action:
      "Plie le coude, sans jamais tourner l'avant-bras. Il est donc au maximum en prise neutre ou en pronation, là où le biceps est désavantagé.",
    tip: "Souvent oublié, alors qu'il est plus volumineux qu'on ne croit : en grossissant, il pousse le biceps vers le haut et rend le bras plus épais. C'est tout l'intérêt du curl marteau.",
    exercises: ['curl_marteau', 'curl_incline'],
  },
  {
    key: 'brachio_radial',
    region: 'bras',
    name: 'Brachio-radial et avant-bras',
    where: "Sur le dessus de l'avant-bras, du coude au poignet.",
    action: "Fléchit le coude en prise neutre, et tient la barre. La prise, c'est lui.",
    tip: "Rarement le facteur limitant sauf en tractions lestées et rowing lourd : quand les mains lâchent avant le dos, ce sont des sangles ou du travail de prise qu'il te faut, pas plus de séries de dos.",
    exercises: ['curl_marteau', 'tractions', 'rowing_haltere'],
  },
  {
    key: 'triceps',
    region: 'bras',
    name: 'Triceps brachial',
    where: "Tout l'arrière du bras. Il représente les deux tiers du volume du bras, largement plus que le biceps.",
    action: "Tend le coude. Il pousse donc sur chaque développé et chaque dips.",
    parts: [
      {
        name: 'Chef long',
        text: "Le seul à s'attacher sur l'omoplate : il ne s'étire complètement que bras au-dessus de la tête. Sans extension overhead, il reste sous-entraîné.",
      },
      { name: 'Chef latéral', text: "Le plus visible de l'extérieur, celui qui dessine le fer à cheval." },
      { name: 'Chef médial', text: "Le plus profond, actif surtout en fin d'extension, sur les mouvements légers et contrôlés." },
    ],
    tip: "Si tu veux du bras, priorise le triceps sur le biceps : plus de masse, et il te rend directement des kilos au développé couché.",
    exercises: ['triceps_overhead', 'barre_au_front', 'triceps_poulie', 'dips', 'dc_barre', 'dev_militaire'],
  },

  // ------------------------------------------------------------------- Tronc
  {
    key: 'grand_droit',
    region: 'tronc',
    name: "Grand droit de l'abdomen",
    aka: 'les « abdos », la tablette',
    where: "Bande verticale du sternum au pubis, coupée par les intersections tendineuses qui dessinent les carrés.",
    action: "Enroule la colonne : il rapproche le sternum du bassin, ou le bassin du sternum.",
    tip: "Le nombre de carrés est génétique et leur visibilité dépend du taux de graisse, pas du nombre de crunchs. Charge-le comme n'importe quel muscle, en 8-15 reps, et laisse le déficit calorique faire le reste.",
    exercises: ['crunch_poulie', 'releve_jambes', 'roue_abdo'],
  },
  {
    key: 'obliques',
    region: 'tronc',
    name: 'Obliques',
    where: "Sur les côtés de l'abdomen, en deux couches croisées : oblique externe en surface, oblique interne dessous.",
    action: "Font tourner le buste et le penchent sur le côté. Surtout, ils résistent à la rotation quand tu veux rester droit.",
    tip: "Le travail anti-rotation (Pallof) est plus utile et plus sûr pour le dos que les flexions latérales lestées, qui épaississent la taille sans grand bénéfice.",
    exercises: ['pallof', 'releve_jambes', 'crunch_poulie'],
  },
  {
    key: 'transverse',
    region: 'tronc',
    name: 'Transverse',
    where: "La couche la plus profonde de la sangle abdominale, enroulée horizontalement comme une ceinture.",
    action:
      "Il comprime le ventre et crée la pression interne qui rigidifie le tronc. C'est le gainage naturel sous une barre lourde.",
    tip: "Il ne se contracte pas en le rentrant : il se travaille en tenant une position que le corps veut casser — planche, roue abdominale, ou simplement squat lourd bien gainé.",
    exercises: ['roue_abdo', 'pallof', 'squat'],
  },
  {
    key: 'psoas',
    region: 'tronc',
    name: 'Psoas-iliaque',
    aka: 'fléchisseur de hanche',
    where: "Des vertèbres lombaires et du bassin jusqu'au haut du fémur, en passant à l'intérieur de l'aine.",
    action: "Ramène la cuisse vers le buste. C'est le muscle qui lève la jambe.",
    tip: "Il vole le travail des abdos sur les relevés de jambes : si tu montes les cuisses sans enrouler le bassin, tu ne fais que du psoas. La rétroversion en fin de mouvement, c'est ce qui fait la différence.",
    exercises: ['releve_jambes'],
  },

  // ------------------------------------------------------------------ Jambes
  {
    key: 'quadriceps',
    region: 'jambes',
    name: 'Quadriceps',
    where: "Quatre muscles sur l'avant de la cuisse, tous terminés sur la rotule.",
    action: "Tendent le genou. Un seul des quatre, le droit fémoral, croise aussi la hanche.",
    parts: [
      {
        name: 'Droit fémoral',
        text: "Part du bassin : il est raccourci quand la hanche est fléchie, donc peu efficace au squat. D'où l'extension de jambes, hanche ouverte.",
      },
      { name: 'Vaste latéral', text: "Le plus gros, sur l'extérieur de la cuisse. C'est lui qui donne la largeur." },
      { name: 'Vaste médial', text: "La goutte au-dessus du genou, à l'intérieur. Sollicité sur toute l'amplitude, surtout en profondeur." },
      { name: 'Vaste intermédiaire', text: "Caché sous le droit fémoral. Il travaille sur tout ce qui tend le genou." },
    ],
    tip: "La profondeur compte plus que la charge : un squat écourté n'entraîne qu'une partie de l'amplitude. Garde la même profondeur d'une séance à l'autre, sinon tes chiffres ne sont plus comparables.",
    exercises: ['squat', 'presse', 'leg_extension'],
  },
  {
    key: 'ischios',
    region: 'jambes',
    name: 'Ischio-jambiers',
    aka: 'biceps fémoral, semi-tendineux, semi-membraneux',
    where: "Tout l'arrière de la cuisse, de l'ischion (l'os sur lequel tu es assis) jusque sous le genou.",
    action:
      "Deux fonctions distinctes : ils plient le genou, et ils tendent la hanche. Un seul exercice ne couvre presque jamais les deux.",
    tip: "C'est pour ça que ton programme a un roumain (extension de hanche, jambes tendues) et un leg curl (flexion du genou). Enlève l'un des deux et tu entraînes la moitié du muscle.",
    exercises: ['sdt_roumain', 'leg_curl_allonge', 'leg_curl_assis', 'squat'],
  },
  {
    key: 'fessiers',
    region: 'jambes',
    name: 'Fessiers',
    where: "Grand fessier en surface, moyen et petit fessiers sur le côté de la hanche.",
    action:
      "Le grand fessier tend la hanche : il redresse le buste au squat et verrouille le roumain. Le moyen et le petit stabilisent le bassin sur une jambe et empêchent les genoux de rentrer.",
    tip: "Ce sont les muscles les plus puissants du corps. Ils répondent surtout à l'amplitude complète et à la charge : squat profond et roumain bien étiré font l'essentiel du travail.",
    exercises: ['squat', 'sdt_roumain', 'presse'],
  },
  {
    key: 'adducteurs',
    region: 'jambes',
    name: 'Adducteurs',
    where: "Intérieur de la cuisse, du pubis au fémur.",
    action:
      "Ramènent la jambe vers l'axe du corps, et participent nettement à l'extension de hanche sur un squat large.",
    tip: "Ils prennent déjà beaucoup au squat, d'autant plus que les pieds sont écartés. Ce sont eux qui tirent les premiers quand tu montes en profondeur : échauffe la hanche avant les séries lourdes.",
    exercises: ['squat', 'presse'],
  },
  {
    key: 'mollets',
    region: 'jambes',
    name: 'Mollets',
    where: "Arrière de la jambe, du genou et du tibia jusqu'au tendon d'Achille.",
    action: "Poussent sur la pointe du pied. Deux muscles superposés, avec deux conditions de travail.",
    parts: [
      {
        name: 'Gastrocnémien (jumeaux)',
        text: "En surface, il croise le genou : il ne travaille à fond que jambe tendue, donc debout.",
      },
      {
        name: 'Soléaire',
        text: "Dessous, il ne croise pas le genou : c'est lui qui prend le relais assis, genou plié.",
      },
    ],
    tip: "Amplitude complète et pause en bas : le tendon d'Achille rend l'énergie du rebond, et un mollet qui rebondit ne travaille pas. C'est un muscle endurant, les séries longues lui vont bien.",
    exercises: ['mollets_debout'],
  },
]

export function musclesByRegion(regionKey) {
  if (!regionKey || regionKey === 'tous') return MUSCLES
  return MUSCLES.filter((m) => m.region === regionKey)
}
