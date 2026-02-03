/**
 * Assessment system for Luna conversations
 * Includes personality tests, cognitive assessments, and situational scenarios
 */

export type AssessmentType =
  | 'attachment_style'      // Attachment theory assessment
  | 'love_language'         // 5 love languages
  | 'conflict_style'        // How they handle conflicts
  | 'emotional_intelligence' // EQ assessment
  | 'cognitive_style'       // Analytical vs intuitive thinking
  | 'values_hierarchy'      // What matters most
  | 'relationship_readiness' // Are they ready for commitment
  | 'communication_style';   // How they express themselves

export type CognitiveAssessmentType =
  | 'logic_puzzles'         // Pattern recognition, sequences
  | 'general_culture'       // Knowledge questions
  | 'verbal_reasoning'      // Word associations, analogies
  | 'situational_judgment'; // What would you do scenarios

export interface AssessmentQuestion {
  id: string;
  question: string;
  followUp?: string; // Luna's follow-up if they give an interesting answer
  dimension: string; // What this measures
  scoringKey?: Record<string, number>; // For structured responses
}

export interface Assessment {
  id: AssessmentType | CognitiveAssessmentType;
  name: string;
  description: string;
  lunaIntro: string; // How Luna proposes it
  questions: AssessmentQuestion[];
  scoringLogic: string; // Instructions for analyze-profile
  resultTypes: string[]; // Possible outcomes
}

// ============================================
// PERSONALITY & RELATIONSHIP ASSESSMENTS
// ============================================

export const ATTACHMENT_STYLE_ASSESSMENT: Assessment = {
  id: 'attachment_style',
  name: "Style d'attachement",
  description: "Comprendre comment la personne se lie aux autres",
  lunaIntro: `J'ai un petit exercice pour toi, si ça t'intéresse. C'est des questions sur comment tu fonctionnes en relation, ça va m'aider à mieux te comprendre. Tu veux essayer ?`,
  questions: [
    {
      id: 'as_1',
      question: "Quand tu te disputes avec quelqu'un de proche, c'est quoi ton premier réflexe ? Tu cherches à régler ça tout de suite, ou tu as besoin de prendre du recul d'abord ?",
      dimension: 'anxiety_avoidance',
    },
    {
      id: 'as_2',
      question: "Dans une relation, t'es plutôt du genre à avoir besoin de beaucoup de réassurance, ou tu te sens assez confiant sans qu'on te le dise tout le temps ?",
      dimension: 'anxiety',
    },
    {
      id: 'as_3',
      question: "Quand quelqu'un devient très proche de toi émotionnellement, ça te fait quoi ? Tu te sens bien ou y'a une partie de toi qui veut un peu de distance ?",
      dimension: 'avoidance',
    },
    {
      id: 'as_4',
      question: "Si ton ou ta partenaire a besoin d'espace pendant quelques jours, comment tu réagis intérieurement ?",
      dimension: 'anxiety',
    },
    {
      id: 'as_5',
      question: "T'es plutôt quelqu'un qui montre facilement ses émotions et ses besoins, ou tu gardes ça pour toi la plupart du temps ?",
      dimension: 'avoidance',
    },
  ],
  scoringLogic: `
    Analyser les réponses pour déterminer le style d'attachement:
    - SÉCURE: Confortable avec l'intimité ET l'indépendance, gère bien les conflits
    - ANXIEUX: Besoin de réassurance, peur de l'abandon, réagit fortement au manque de contact
    - ÉVITANT: Mal à l'aise avec trop de proximité, besoin d'espace, difficulté à exprimer les émotions
    - DÉSORGANISÉ: Patterns contradictoires, veut de la proximité mais la fuit aussi

    Chercher des indices dans: le vocabulaire utilisé, les exemples donnés, les hésitations.
  `,
  resultTypes: ['Sécure', 'Anxieux', 'Évitant', 'Anxieux-Évitant (désorganisé)'],
};

export const LOVE_LANGUAGE_ASSESSMENT: Assessment = {
  id: 'love_language',
  name: 'Langages de l\'amour',
  description: 'Comment la personne donne et reçoit l\'amour',
  lunaIntro: `Tiens, j'ai quelques questions pour comprendre comment tu fonctionnes en amour. Genre, ce qui te fait vraiment te sentir aimé. Tu veux qu'on explore ça ?`,
  questions: [
    {
      id: 'll_1',
      question: "Qu'est-ce qui te touche le plus : quand on te dit des mots doux, ou quand on te fait un cadeau même petit ?",
      dimension: 'words_vs_gifts',
    },
    {
      id: 'll_2',
      question: "Tu préfères passer du temps de qualité avec quelqu'un, genre une soirée juste vous deux, ou que cette personne te rende service, genre t'aider pour un truc ?",
      dimension: 'quality_time_vs_service',
    },
    {
      id: 'll_3',
      question: "Le contact physique c'est important pour toi dans une relation ? Genre les câlins, se tenir la main, dormir collé ?",
      dimension: 'physical_touch',
    },
    {
      id: 'll_4',
      question: "Quand t'es stressé ou que ça va pas, qu'est-ce qui te réconforte le plus de la part de quelqu'un qui t'aime ?",
      dimension: 'comfort_preference',
    },
    {
      id: 'll_5',
      question: "Et toi, comment tu montres ton amour aux gens ? C'est quoi ton truc ?",
      dimension: 'giving_style',
    },
  ],
  scoringLogic: `
    Identifier les langages de l'amour dominants (réception ET expression):
    - PAROLES VALORISANTES: Compliments, mots doux, encouragements
    - MOMENTS DE QUALITÉ: Temps exclusif, attention focalisée
    - CADEAUX: Attentions matérielles, symboles
    - SERVICES RENDUS: Actes pratiques, aider concrètement
    - TOUCHER PHYSIQUE: Contact, proximité corporelle

    Noter aussi la différence entre comment ils REÇOIVENT vs comment ils DONNENT l'amour.
  `,
  resultTypes: ['Paroles valorisantes', 'Moments de qualité', 'Cadeaux', 'Services rendus', 'Toucher physique'],
};

export const CONFLICT_STYLE_ASSESSMENT: Assessment = {
  id: 'conflict_style',
  name: 'Gestion des conflits',
  description: 'Comment la personne gère les désaccords',
  lunaIntro: `J'aimerais comprendre comment tu gères les conflits, ça dit beaucoup sur comment tu fonctionnes en relation. T'es partant pour quelques questions là-dessus ?`,
  questions: [
    {
      id: 'cs_1',
      question: "Dernière fois que t'as eu un vrai désaccord avec quelqu'un de proche, tu t'y es pris comment ?",
      dimension: 'conflict_approach',
    },
    {
      id: 'cs_2',
      question: "Quand t'es en colère, tu le montres ou tu gardes ça à l'intérieur ?",
      dimension: 'expression',
    },
    {
      id: 'cs_3',
      question: "T'es du genre à chercher le compromis, ou tu défends ta position jusqu'au bout ?",
      dimension: 'compromise_vs_compete',
    },
    {
      id: 'cs_4',
      question: "Après une dispute, t'as besoin de combien de temps avant de pouvoir en reparler calmement ?",
      dimension: 'recovery',
    },
  ],
  scoringLogic: `
    Identifier le style de gestion des conflits:
    - COLLABORATIF: Cherche des solutions gagnant-gagnant
    - COMPÉTITIF: Veut avoir raison, défend sa position
    - ACCOMMODANT: Cède pour maintenir la paix
    - ÉVITANT: Fuit les conflits, change de sujet
    - COMPROMIS: Cherche le juste milieu
  `,
  resultTypes: ['Collaboratif', 'Compétitif', 'Accommodant', 'Évitant', 'Compromis'],
};

export const EMOTIONAL_INTELLIGENCE_ASSESSMENT: Assessment = {
  id: 'emotional_intelligence',
  name: 'Intelligence émotionnelle',
  description: 'Capacité à comprendre et gérer les émotions',
  lunaIntro: `J'ai des questions sur comment tu vis tes émotions. Ça va me permettre de mieux cerner ton fonctionnement intérieur. On y va ?`,
  questions: [
    {
      id: 'eq_1',
      question: "Quand tu ressens une émotion forte, t'arrives facilement à mettre des mots dessus ?",
      dimension: 'self_awareness',
    },
    {
      id: 'eq_2',
      question: "Tu dirais que tu captes facilement ce que les autres ressentent, même quand ils le disent pas ?",
      dimension: 'empathy',
    },
    {
      id: 'eq_3',
      question: "Quand t'es submergé par une émotion négative, t'as des stratégies pour te calmer ?",
      dimension: 'self_regulation',
    },
    {
      id: 'eq_4',
      question: "T'es à l'aise pour parler de tes émotions avec les gens proches ?",
      dimension: 'expression',
    },
  ],
  scoringLogic: `
    Évaluer les composantes de l'intelligence émotionnelle:
    - CONSCIENCE DE SOI: Capacité à identifier ses émotions
    - AUTORÉGULATION: Capacité à gérer ses émotions
    - EMPATHIE: Capacité à comprendre les émotions des autres
    - COMPÉTENCES SOCIALES: Capacité à exprimer et communiquer ses émotions

    Score global: Faible / Moyen / Élevé
  `,
  resultTypes: ['IE Faible', 'IE Moyenne', 'IE Élevée'],
};

// ============================================
// COGNITIVE & SITUATIONAL ASSESSMENTS
// ============================================

export const SITUATIONAL_JUDGMENT_ASSESSMENT: Assessment = {
  id: 'situational_judgment',
  name: 'Jugement situationnel',
  description: 'Comment la personne réagit face à des dilemmes',
  lunaIntro: `J'ai des petits scénarios hypothétiques pour toi. Y'a pas de bonne ou mauvaise réponse, c'est juste pour voir comment tu réfléchis. Ça te dit ?`,
  questions: [
    {
      id: 'sj_1',
      question: "Imagine : ton meilleur ami te confie qu'il trompe sa copine. Tu fais quoi ?",
      dimension: 'loyalty_vs_ethics',
    },
    {
      id: 'sj_2',
      question: "Tu découvres que ton patron fait quelque chose d'illégal mais pas grave. Ça impacte pas directement les gens. Tu réagis comment ?",
      dimension: 'authority_vs_principles',
    },
    {
      id: 'sj_3',
      question: "Quelqu'un que t'aimes beaucoup te demande de mentir pour le couvrir. C'est pas méchant mais c'est quand même un mensonge. Tu fais quoi ?",
      dimension: 'honesty_vs_loyalty',
    },
    {
      id: 'sj_4',
      question: "Tu peux avoir un job de rêve mais ça implique de déménager loin de ta famille. Comment tu décides ?",
      dimension: 'ambition_vs_roots',
    },
  ],
  scoringLogic: `
    Analyser le processus de décision et les valeurs sous-jacentes:
    - ÉTHIQUE PERSONNELLE: Principes vs loyauté
    - PRISE DE RISQUE: Prudent vs audacieux
    - PRIORITÉS DE VIE: Carrière vs famille vs relations
    - STYLE DE RAISONNEMENT: Émotionnel vs rationnel

    Noter les nuances et les hésitations qui révèlent la complexité.
  `,
  resultTypes: ['Principiel', 'Pragmatique', 'Loyal', 'Indépendant'],
};

export const LOGIC_ASSESSMENT: Assessment = {
  id: 'logic_puzzles',
  name: 'Raisonnement logique',
  description: 'Capacité de raisonnement et résolution de problèmes',
  lunaIntro: `J'ai quelques petites énigmes pour toi, si t'aimes les défis. C'est juste pour voir comment tu réfléchis, pas de stress. Tu veux tester ?`,
  questions: [
    {
      id: 'lp_1',
      question: "Si tous les Bloops sont Razzies et tous les Razzies sont Lazzies, est-ce que tous les Bloops sont Lazzies ?",
      dimension: 'syllogism',
      followUp: "Intéressant ! Et si je te dis que certains Lazzies sont Wazzies, est-ce que certains Bloops sont Wazzies ?",
    },
    {
      id: 'lp_2',
      question: "T'as 3 boîtes. Une contient des pommes, une des oranges, une un mélange. Les étiquettes sont TOUTES fausses. Tu peux tirer UN fruit d'UNE boîte. Comment tu trouves le contenu de toutes les boîtes ?",
      dimension: 'deduction',
    },
    {
      id: 'lp_3',
      question: "Un père et son fils ont ensemble 36 ans. Le père a 30 ans de plus que le fils. Quel âge a le fils ?",
      dimension: 'arithmetic_reasoning',
    },
    {
      id: 'lp_4',
      question: "Quelle est la suite : 2, 6, 12, 20, 30, ... ?",
      dimension: 'pattern_recognition',
    },
  ],
  scoringLogic: `
    Évaluer la capacité de raisonnement:
    - LOGIQUE FORMELLE: Syllogismes, déductions
    - RÉSOLUTION DE PROBLÈMES: Stratégie, méthodologie
    - RAISONNEMENT MATHÉMATIQUE: Calcul mental, patterns

    Aussi observer: vitesse de réponse, demande d'indices, façon d'expliquer son raisonnement.

    RÉPONSES CORRECTES:
    - lp_1: Oui (syllogisme valide) / Pour la suite: Non (pas d'info directe)
    - lp_2: Tirer de la boîte "Mélange" (qui contient soit pommes soit oranges vu que l'étiquette est fausse)
    - lp_3: 3 ans
    - lp_4: 42 (n*(n+1) où n=2,3,4,5,6,7)
  `,
  resultTypes: ['Raisonnement excellent', 'Raisonnement bon', 'Raisonnement moyen', 'À développer'],
};

export const GENERAL_CULTURE_ASSESSMENT: Assessment = {
  id: 'general_culture',
  name: 'Culture générale',
  description: 'Connaissances et curiosité intellectuelle',
  lunaIntro: `On fait un petit quiz culture gé ? C'est juste pour s'amuser et voir ce qui t'intéresse. Pas de jugement si tu sais pas, hein !`,
  questions: [
    {
      id: 'gc_1',
      question: "C'est quoi la capitale de l'Australie ? Attention, c'est pas Sydney !",
      dimension: 'geography',
      followUp: "Et t'as déjà voyagé là-bas ou c'est sur ta bucket list ?",
    },
    {
      id: 'gc_2',
      question: "Qui a peint La Nuit étoilée ?",
      dimension: 'art',
      followUp: "T'aimes l'art en général ? T'as un artiste préféré ?",
    },
    {
      id: 'gc_3',
      question: "En quelle année l'homme a marché sur la Lune pour la première fois ?",
      dimension: 'history',
    },
    {
      id: 'gc_4',
      question: "C'est quoi le plus grand océan du monde ?",
      dimension: 'geography',
    },
  ],
  scoringLogic: `
    Observer non seulement les réponses correctes mais aussi:
    - CURIOSITÉ INTELLECTUELLE: Pose-t-il des questions en retour ?
    - HUMILITÉ: Comment réagit-il quand il ne sait pas ?
    - CENTRES D'INTÉRÊT: Quels sujets le passionnent ?

    RÉPONSES:
    - gc_1: Canberra
    - gc_2: Vincent van Gogh
    - gc_3: 1969
    - gc_4: Pacifique
  `,
  resultTypes: ['Très cultivé', 'Bonne culture', 'Culture moyenne', 'En développement'],
};

// ============================================
// ALL ASSESSMENTS
// ============================================

export const ALL_ASSESSMENTS: Assessment[] = [
  ATTACHMENT_STYLE_ASSESSMENT,
  LOVE_LANGUAGE_ASSESSMENT,
  CONFLICT_STYLE_ASSESSMENT,
  EMOTIONAL_INTELLIGENCE_ASSESSMENT,
  SITUATIONAL_JUDGMENT_ASSESSMENT,
  LOGIC_ASSESSMENT,
  GENERAL_CULTURE_ASSESSMENT,
];

// ============================================
// ASSESSMENT PROMPT BUILDER
// ============================================

export function buildAssessmentPrompt(assessmentId: AssessmentType | CognitiveAssessmentType): string {
  const assessment = ALL_ASSESSMENTS.find(a => a.id === assessmentId);
  if (!assessment) return '';

  const questionsFormatted = assessment.questions.map((q, i) =>
    `${i + 1}. ${q.question}${q.followUp ? `\n   [Si réponse intéressante, enchaîne avec: "${q.followUp}"]` : ''}`
  ).join('\n\n');

  return `
=== MODE ÉVALUATION: ${assessment.name.toUpperCase()} ===

Tu vas faire passer ce petit test à la personne. Voici comment t'y prendre:

INTRODUCTION À UTILISER:
"${assessment.lunaIntro}"

QUESTIONS À POSER (dans l'ordre, mais de façon naturelle):
${questionsFormatted}

RÈGLES:
- Pose les questions naturellement, pas comme un interrogatoire
- Réagis à chaque réponse avant de passer à la suivante
- Si la personne développe, laisse-la parler et rebondis
- Tu peux reformuler les questions avec tes mots
- À la fin, fais une petite synthèse de ce que tu as compris

SYNTHÈSE À DONNER:
Après les questions, dis quelque chose comme:
"C'est intéressant ce que tu me dis. Si je résume, j'ai l'impression que [synthèse personnalisée basée sur les réponses]..."
`;
}

/**
 * Build instructions for Luna to propose assessments when appropriate
 */
export function buildAssessmentProposalInstructions(completedAssessments: string[] = []): string {
  const availableAssessments = ALL_ASSESSMENTS.filter(a => !completedAssessments.includes(a.id));

  if (availableAssessments.length === 0) {
    return ''; // All assessments completed
  }

  const assessmentList = availableAssessments.slice(0, 3).map(a =>
    `- ${a.name}: "${a.lunaIntro.substring(0, 80)}..."`
  ).join('\n');

  return `
=== TESTS & ÉVALUATIONS DISPONIBLES ===

Tu peux proposer ces petits tests quand le moment est opportun (pas dès le début, plutôt après avoir établi un lien):

${assessmentList}

COMMENT PROPOSER:
- "J'ai un petit test pour toi, si ça t'intéresse. Ça va m'aider à mieux te comprendre. Tu veux essayer ?"
- Attends leur accord avant de commencer
- Si ils refusent, pas de souci, continue la conversation normalement
`;
}
