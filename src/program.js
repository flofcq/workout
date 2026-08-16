// Programme "Priorité pectoraux, en déficit calorique" — Bloc 1
// Les clés d'exercice (key) sont stables : elles servent à relier l'historique
// dans la base. Ne les renomme pas, même si tu changes le libellé affiché.

export const PROGRAM = [
  {
    key: 'j1',
    day: 'Lundi',
    title: 'Pecs lourd · Épaules · Triceps',
    focus: 'Force',
    priority: true,
    note: "Séance la plus lourde de la semaine. Échauffe-toi sérieusement : 3-4 montées en charge sur le premier exercice.",
    exercises: [
      {
        key: 'dc_barre',
        name: 'Développé couché barre',
        star: true,
        sets: 4, reps: '5-6', rpe: '8', rest: 180,
        muscles: 'Grand pectoral (faisceau moyen) · deltoïde antérieur, triceps',
        cue: "Omoplates serrées et abaissées toute la série. Coudes à 45-60° du buste. Descente contrôlée 2 s, pas de rebond.",
      },
      {
        key: 'di_halteres',
        name: 'Développé incliné haltères 30°',
        star: true,
        sets: 3, reps: '8-10', rpe: '8', rest: 150,
        muscles: 'Grand pectoral (faisceau claviculaire) · deltoïde antérieur, triceps',
        cue: "30° est le bon angle : au-delà de 45° le deltoïde prend le relais. Ne colle pas les haltères en haut.",
      },
      {
        key: 'dev_militaire',
        name: 'Développé militaire debout',
        sets: 3, reps: '6-8', rpe: '8', rest: 120,
        muscles: 'Deltoïde antérieur · deltoïde moyen, triceps, trapèze supérieur',
        cue: "Gainage serré, fessiers contractés. La cambrure lombaire transforme le mouvement en développé incliné.",
      },
      {
        key: 'elev_laterales',
        name: 'Élévations latérales haltères',
        sets: 3, reps: '12-15', rpe: '9', rest: 60,
        muscles: 'Deltoïde moyen · sus-épineux',
        cue: "Monte jusqu'à l'horizontale, pas au-delà. Épaules basses, descente lente.",
      },
      {
        key: 'triceps_overhead',
        name: 'Extension triceps corde, bras au-dessus de la tête',
        sets: 3, reps: '10-12', rpe: '9', rest: 75,
        muscles: 'Triceps, chef long · chefs latéral et médial',
        cue: "Le chef long n'est étiré que bras au-dessus de la tête. Coudes fixes, seuls les avant-bras bougent.",
      },
      {
        key: 'face_pull',
        name: 'Face pull',
        sets: 3, reps: '15-20', rpe: '8', rest: 45,
        muscles: 'Deltoïde postérieur · rhomboïdes, trapèzes, rotateurs externes',
        cue: "Santé d'épaule, non négociable. Coudes hauts, finis en rotation externe. Léger et propre.",
      },
    ],
  },
  {
    key: 'j2',
    day: 'Mardi',
    title: 'Dos · Biceps · Abdos',
    focus: 'Volume',
    note: "Équilibre le volume de poussée. Un dos fort stabilise aussi tes développés.",
    exercises: [
      {
        key: 'tractions',
        name: 'Tractions lestées pronation',
        sets: 4, reps: '6-8', rpe: '8', rest: 180,
        muscles: 'Grand dorsal · grand rond, biceps, trapèze inférieur',
        cue: "Tire avec les coudes vers le sol, pas le menton vers la barre. Bras tendus en bas.",
      },
      {
        key: 'rowing_barre',
        name: 'Rowing barre buste penché',
        sets: 4, reps: '8-10', rpe: '8', rest: 150,
        muscles: 'Grand dorsal, trapèze moyen, rhomboïdes · deltoïde post., biceps',
        cue: "Vers le nombril = dorsal, vers le sternum = trapèzes. Dos neutre, aucun à-coup lombaire.",
      },
      {
        key: 'tirage_horizontal',
        name: 'Tirage horizontal poulie, prise neutre',
        sets: 3, reps: '10-12', rpe: '9', rest: 90,
        muscles: 'Grand dorsal, trapèze moyen · rhomboïdes, deltoïde postérieur',
        cue: "Laisse les omoplates s'écarter complètement devant, puis tire en les rapprochant. Buste immobile.",
      },
      {
        key: 'pullover_poulie',
        name: 'Pull-over à la poulie haute',
        sets: 3, reps: '12-15', rpe: '9', rest: 90,
        muscles: 'Grand dorsal (isolé) · grand rond, triceps chef long',
        cue: "Bras quasi tendus : ça sort le biceps de l'équation et le dorsal travaille seul.",
      },
      {
        key: 'curl_incline',
        name: 'Curl incliné haltères',
        sets: 3, reps: '10-12', rpe: '9', rest: 90,
        muscles: 'Biceps brachial, chef long · brachial',
        cue: "Le banc incliné étire le chef long avant la première rep. Coudes derrière le corps, immobiles.",
      },
      {
        key: 'curl_marteau',
        name: 'Curl marteau',
        sets: 3, reps: '12-15', rpe: '9', rest: 60,
        muscles: 'Brachial, brachio-radial · biceps',
        cue: "Prise neutre. Le brachial pousse le biceps vers le haut et donne du volume au bras.",
      },
      {
        key: 'crunch_poulie',
        name: 'Crunch à la poulie haute, à genoux',
        sets: 3, reps: '10-12', rpe: '9', rest: 75,
        muscles: 'Grand droit de l\'abdomen · obliques',
        cue: "Enroule la colonne vertèbre par vertèbre. Les hanches ne bougent pas, sinon ce sont les psoas.",
      },
      {
        key: 'releve_jambes',
        name: 'Relevé de jambes suspendu',
        sets: 3, reps: '10-15', rpe: '9', rest: 60,
        muscles: 'Grand droit (portion basse) · psoas-iliaque, obliques',
        cue: "Termine en enroulant le bassin vers le haut. Sans cette rétroversion, tu fais du fléchisseur de hanche.",
      },
    ],
  },
  {
    key: 'j3',
    day: 'Mercredi',
    title: 'Jambes',
    focus: 'Complet',
    note: "Une seule grosse séance jambes dans ce bloc : elle doit être sérieuse.",
    exercises: [
      {
        key: 'squat',
        name: 'Squat barre',
        sets: 4, reps: '5-6', rpe: '8', rest: 180,
        muscles: 'Quadriceps, grand fessier · adducteurs, ischio-jambiers',
        cue: "Garde une profondeur identique d'une séance à l'autre, sinon tu ne peux plus comparer tes charges.",
      },
      {
        key: 'sdt_roumain',
        name: 'Soulevé de terre roumain',
        sets: 3, reps: '8-10', rpe: '8', rest: 150,
        muscles: 'Ischio-jambiers, grand fessier · érecteurs, dorsaux',
        cue: "Le mouvement vient des hanches qui partent en arrière. Remonte dès que le dos veut s'arrondir.",
      },
      {
        key: 'presse',
        name: 'Presse à cuisses',
        sets: 3, reps: '10-12', rpe: '9', rest: 120,
        muscles: 'Quadriceps · grand fessier, adducteurs',
        cue: "Pieds bas = quadriceps, pieds hauts = fessiers/ischios. Ne décolle jamais le bassin du dossier.",
      },
      {
        key: 'leg_curl_allonge',
        name: 'Leg curl allongé',
        sets: 3, reps: '12-15', rpe: '9', rest: 90,
        muscles: 'Ischio-jambiers (flexion du genou) · gastrocnémiens',
        cue: "Complémentaire du roumain : les ischios ont deux fonctions, il faut les deux. Bassin plaqué.",
      },
      {
        key: 'leg_extension',
        name: 'Extension quadriceps',
        sets: 3, reps: '12-15', rpe: '9-10', rest: 90,
        muscles: 'Quadriceps, notamment le droit fémoral',
        cue: "Le droit fémoral croise la hanche : peu sollicité au squat, d'où cet exercice. Dernière série en rest-pause.",
      },
      {
        key: 'mollets_debout',
        name: 'Mollets debout',
        sets: 4, reps: '10-15', rpe: '9', rest: 60,
        muscles: 'Gastrocnémien · soléaire',
        cue: "Pause 1 s en bas en étirement complet, pas de rebond sur le tendon d'Achille.",
      },
    ],
  },
  {
    key: 'j4',
    day: 'Vendredi',
    title: 'Pecs volume · Épaules · Triceps',
    focus: 'Hypertrophie',
    priority: true,
    note: "Deuxième exposition, angles complémentaires. L'amplitude et la tension priment sur le poids affiché.",
    exercises: [
      {
        key: 'di_barre',
        name: 'Développé incliné barre 30-45°',
        star: true,
        sets: 4, reps: '6-8', rpe: '8', rest: 180,
        muscles: 'Grand pectoral (faisceau claviculaire) · deltoïde antérieur, triceps',
        cue: "La barre descend sous les clavicules, pas au sternum. Placé en premier car c'est le faisceau prioritaire.",
      },
      {
        key: 'dips',
        name: 'Dips lestés, buste penché en avant',
        star: true,
        sets: 3, reps: '8-12', rpe: '9', rest: 120,
        muscles: 'Grand pectoral (faisceaux bas et moyen) · triceps, deltoïde antérieur',
        cue: "Buste vertical = triceps. Buste penché 30° + coudes ouverts = pectoraux. C'est la position qui décide.",
      },
      {
        key: 'ecarte_basse_haute',
        name: 'Écarté poulie vis-à-vis, basse vers haute',
        star: true,
        sets: 3, reps: '12-15', rpe: '9-10', rest: 90,
        muscles: 'Grand pectoral (faisceau claviculaire) · deltoïde antérieur',
        cue: "La diagonale bas→haut suit les fibres du faisceau claviculaire. Croise les mains en fin de course.",
      },
      {
        key: 'elev_laterales_poulie',
        name: 'Élévations latérales à la poulie',
        sets: 3, reps: '15-20', rpe: '10', rest: 60,
        muscles: 'Deltoïde moyen · sus-épineux',
        cue: "La poulie garde la tension en bas, là où les haltères n'en ont aucune. Dernière série en dégressif.",
      },
      {
        key: 'barre_au_front',
        name: 'Barre au front (skull crusher)',
        sets: 3, reps: '8-10', rpe: '9', rest: 90,
        muscles: 'Triceps, chefs latéral et médial · chef long',
        cue: "Descends derrière le front, pas sur le nez : ça maintient la tension en position basse.",
      },
      {
        key: 'oiseau',
        name: 'Oiseau poulie ou pec deck inversé',
        sets: 3, reps: '15-20', rpe: '9', rest: 45,
        muscles: 'Deltoïde postérieur · rhomboïdes, trapèze moyen',
        cue: "Bras quasi tendus, ouvre sans serrer les omoplates — sinon les rhomboïdes prennent tout.",
      },
    ],
  },
  {
    key: 'j5',
    day: 'Samedi',
    title: 'Dos · Ischios · Bras · Abdos · Finisher pecs',
    focus: 'Rappel',
    note: "Séance moins lourde, plus de sensations. Le finisher pecs est la 3e exposition de la semaine.",
    exercises: [
      {
        key: 'tirage_vertical',
        name: 'Tirage vertical prise large',
        sets: 3, reps: '10-12', rpe: '9', rest: 120,
        muscles: 'Grand dorsal · grand rond, rhomboïdes, biceps',
        cue: "Barre vers le haut de la poitrine, jamais derrière la nuque.",
      },
      {
        key: 'rowing_haltere',
        name: 'Rowing haltère unilatéral',
        sets: 3, reps: '10-12', rpe: '9', rest: 90,
        muscles: 'Grand dorsal · trapèze moyen, rhomboïdes, deltoïde post., biceps',
        cue: "Laisse l'épaule descendre pour étirer le dorsal, puis tire le coude vers la hanche. Ne tourne pas le buste.",
      },
      {
        key: 'leg_curl_assis',
        name: 'Leg curl assis',
        sets: 3, reps: '12-15', rpe: '9', rest: 90,
        muscles: 'Ischio-jambiers · gastrocnémiens',
        cue: "Hanche fléchie = ischios plus étirés qu'allongé, ce qui sollicite mieux leur portion haute.",
      },
      {
        key: 'ecarte_haute_basse',
        name: 'Écarté poulie haute vers basse (ou pec deck)',
        star: true,
        sets: 3, reps: '15-20', rpe: '10', rest: 60,
        muscles: 'Grand pectoral (faisceaux bas et moyen) · deltoïde antérieur',
        cue: "Mains qui se rejoignent devant le bas-ventre. Pause 1 s, dernière série en myo-reps. Congestion, pas charge.",
      },
      {
        key: 'curl_poulie',
        name: 'Curl poulie basse',
        sets: 3, reps: '12-15', rpe: '9', rest: 60,
        muscles: 'Biceps brachial · brachial',
        cue: "Tension constante sur toute l'amplitude. Coudes collés au buste.",
      },
      {
        key: 'triceps_poulie',
        name: 'Extension triceps poulie corde',
        sets: 3, reps: '12-15', rpe: '9', rest: 60,
        muscles: 'Triceps, chefs latéral et médial · chef long',
        cue: "Écarte la corde en fin de mouvement pour finir en supination. Coudes fixes le long du corps.",
      },
      {
        key: 'roue_abdo',
        name: 'Roue abdominale (ou planche lestée)',
        sets: 3, reps: '8-12', rpe: '9', rest: 75,
        muscles: 'Grand droit · transverse, obliques, grand dorsal',
        cue: "Anti-extension. Bassin en rétroversion, ne descends que tant que le bas du dos reste plat.",
      },
      {
        key: 'pallof',
        name: 'Pallof press à la poulie',
        sets: 3, reps: '12/côté', rpe: '9', rest: 45,
        muscles: 'Obliques interne et externe · transverse, grand droit',
        cue: "Anti-rotation. Tu résistes à la rotation du câble, rien ne bouge.",
      },
    ],
  },
]

export const EXERCISES = PROGRAM.flatMap((d) =>
  d.exercises.map((e) => ({ ...e, dayKey: d.key, dayTitle: d.title }))
)

export function getDay(key) {
  return PROGRAM.find((d) => d.key === key)
}

export function getExercise(key) {
  return EXERCISES.find((e) => e.key === key)
}

// ---------- Exercices hors programme ----------
// Quand une machine est occupée, on enregistre ce qu'on a fait à la place.
// Ces exercices ne sont pas dans PROGRAM : leur libellé est stocké en base
// (sets.exercise_name), et leur clé est dérivée du nom pour que deux séances
// saisies pareil se regroupent et donnent une courbe de progression.

export const CUSTOM_PREFIX = 'libre_'

export const isCustomKey = (key) => String(key || '').startsWith(CUSTOM_PREFIX)

/**
 * « Presse à cuisses 45° » → « libre_presse_a_cuisses_45 ». Les accents sont
 * réduits et la casse aplatie : sans ça « Pec deck » et « pec-deck » seraient
 * deux exercices distincts et la progression serait coupée en deux.
 */
export function customKey(name) {
  const slug = String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // marques diacritiques laissées par NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
  return slug ? CUSTOM_PREFIX + slug : null
}

/** Gabarit d'exercice pour l'affichage : mêmes champs que ceux de PROGRAM. */
export function customExercise(key, name) {
  return {
    key,
    name,
    sets: 4, // on ne connaît pas l'intention : 4 lignes, les vides sont ignorées
    reps: '—',
    rpe: '—',
    rest: 120,
    muscles: 'Hors programme',
    cue: "Exercice ajouté en séance, faute de machine disponible. Note la charge et les répétitions comme d'habitude : la progression se suivra sur ce nom.",
    custom: true,
  }
}

// Estimation de 1RM (formule d'Epley). Peu fiable au-delà de 12 reps,
// on la borne pour éviter des valeurs absurdes sur les séries longues.
export function estimate1RM(weight, reps) {
  if (!weight || !reps) return null
  if (reps > 12) return null
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}
