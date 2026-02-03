import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Scenario to dimension mapping for tracking coverage
type Scenario = 'intro' | 'love_history' | 'love_vision' | 'values' | 'family' | 'emotions' | 'lifestyle' | 'dreams' | 'wounds' | 'childhood' | 'traumas' | 'work_career' | 'parenting' | 'sexuality';

const SCENARIO_DIMENSION_MAP: Record<Scenario, { primary: string[], secondary: string[] }> = {
  intro: {
    primary: ['basicInfo'],
    secondary: ['personalityTraits']
  },
  love_history: {
    primary: ['interpersonalStyle', 'relationshipProfile'],
    secondary: ['vulnerabilities', 'emotionRegulation', 'developmentalFactors']
  },
  love_vision: {
    primary: ['relationshipProfile', 'motivation'],
    secondary: ['identityAndSelfConcept', 'interpersonalStyle']
  },
  values: {
    primary: ['identityAndSelfConcept', 'socialCognition'],
    secondary: ['motivation', 'cognitiveStyle']
  },
  family: {
    primary: ['developmentalFactors', 'interpersonalStyle'],
    secondary: ['vulnerabilities', 'socialCognition']
  },
  emotions: {
    primary: ['temperament', 'emotionRegulation'],
    secondary: ['interpersonalStyle', 'personalityTraits']
  },
  lifestyle: {
    primary: ['behavioralPatterns', 'personalityTraits'],
    secondary: ['motivation', 'strengthsAndProtectiveFactors']
  },
  dreams: {
    primary: ['motivation', 'identityAndSelfConcept'],
    secondary: ['strengthsAndProtectiveFactors', 'cognitiveStyle']
  },
  wounds: {
    primary: ['vulnerabilities', 'strengthsAndProtectiveFactors'],
    secondary: ['emotionRegulation', 'developmentalFactors', 'interpersonalStyle']
  },
  // Deep exploration scenarios
  childhood: {
    primary: ['developmentalFactors', 'interpersonalStyle'],
    secondary: ['identityAndSelfConcept', 'vulnerabilities', 'emotionRegulation']
  },
  traumas: {
    primary: ['vulnerabilities', 'emotionRegulation'],
    secondary: ['interpersonalStyle', 'strengthsAndProtectiveFactors', 'developmentalFactors']
  },
  work_career: {
    primary: ['motivation', 'behavioralPatterns'],
    secondary: ['identityAndSelfConcept', 'cognitiveStyle', 'personalityTraits']
  },
  parenting: {
    primary: ['relationshipProfile', 'identityAndSelfConcept'],
    secondary: ['developmentalFactors', 'motivation', 'socialCognition']
  },
  sexuality: {
    primary: ['interpersonalStyle', 'relationshipProfile'],
    secondary: ['temperament', 'emotionRegulation', 'vulnerabilities']
  }
};

const SCENARIO_LABELS: Record<Scenario, string> = {
  intro: 'Introduction',
  love_history: 'Historique amoureux',
  love_vision: "Vision de l'amour",
  values: 'Valeurs & identité',
  family: 'Famille & origines',
  emotions: 'Émotions & sensibilité',
  lifestyle: 'Mode de vie',
  dreams: 'Rêves & aspirations',
  wounds: 'Blessures & forces',
  // Deep exploration scenarios
  childhood: 'Enfance & construction',
  traumas: 'Traumatismes & résilience',
  work_career: 'Vie professionnelle',
  parenting: 'Parentalité & avenir',
  sexuality: 'Intimité & connexion'
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, existingProfile, sessionCount = 1, scenariosCovered = [] } = await req.json();
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");

    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY is not configured");
    }

    if (!transcript || transcript.length === 0) {
      throw new Error("No transcript provided");
    }

    const isUpdate = existingProfile && sessionCount > 1;
    const scenarioLabelsStr = scenariosCovered.map((s: Scenario) => SCENARIO_LABELS[s] || s).join(', ') || 'Non spécifié';
    console.log(`Analyzing transcript with ${transcript.length} messages. Session #${sessionCount}, isUpdate: ${isUpdate}, scenarios: ${scenarioLabelsStr}`);

    const systemPrompt = `Tu es un expert en psychologie et en analyse relationnelle. Analyse cette conversation entre un utilisateur et Luna (guide IA) pour créer un profil psychologique complet basé sur 12 dimensions à des fins de matching amoureux.

IMPORTANT : Toutes tes réponses doivent être EN FRANÇAIS.

=== LES 12 DIMENSIONS PSYCHOLOGIQUES À ÉVALUER ===

1. IDENTITÉ & CONCEPT DE SOI
   - Stabilité de l'estime de soi (stable vs fluctuante)
   - Cohérence identitaire (valeurs claires vs fragmentées)
   - Sentiment d'efficacité personnelle
   - Locus de contrôle (interne vs externe)
   - Valeurs fondamentales et sources de sens
   - Mentalité de croissance vs fixe
   - Identité morale et intégrité

2. TEMPÉRAMENT & RÉACTIVITÉ ÉMOTIONNELLE
   - Intensité émotionnelle
   - Labilité émotionnelle (stabilité de l'humeur)
   - Sensibilité à la menace
   - Sensibilité à la récompense/nouveauté
   - Réactivité et récupération au stress
   - Niveau d'activation de base
   - Tolérance à la frustration

3. RÉGULATION ÉMOTIONNELLE & COPING
   - Conscience et étiquetage des émotions
   - Stratégies de régulation adaptatives
   - Stratégies de régulation inadaptées
   - Contrôle des impulsions
   - Orientation coping (problème vs émotion vs évitement)
   - Résilience
   - Mécanismes de défense dominants

4. STYLE COGNITIF & PATTERNS DE PENSÉE
   - Style analytique vs intuitif
   - Tolérance à la complexité
   - Flexibilité cognitive
   - Contrôle attentionnel
   - Métacognition
   - Style d'attribution
   - Distorsions cognitives tendancielles
   - Curiosité et humilité épistémique

5. MOTIVATION & ARCHITECTURE DES OBJECTIFS
   - Orientation approche vs évitement
   - Profil de besoins (autonomie, compétence, connexion, sécurité, accomplissement)
   - Motivation intrinsèque vs extrinsèque
   - Horizon temporel
   - Persévérance / Grit
   - Style d'accomplissement (maîtrise vs performance)
   - Type de procrastination
   - Tolérance au risque

6. STRUCTURE DES TRAITS DE PERSONNALITÉ
   Big Five :
   - Névrosisme (1-10)
   - Extraversion (1-10)
   - Ouverture (1-10)
   - Agréabilité (1-10)
   - Conscienciosité (1-10)
   Traits additionnels :
   - Honnêteté-humilité
   - Perfectionnisme
   - Recherche de sensations
   - Empathie trait
   - Style d'assertivité

7. STYLE INTERPERSONNEL & ATTACHEMENT
   - Pattern d'attachement (sécure/anxieux/évitant/désorganisé)
   - Style de confiance
   - Style de communication
   - Style de gestion des conflits
   - Qualité des limites personnelles
   - Empathie et mentalisation
   - Réciprocité sociale
   - Style d'influence

8. COGNITION SOCIALE & VISION DU MONDE
   - Croyances sur les gens
   - Sensibilité à la justice
   - Orientation distance au pouvoir
   - Biais ingroup/outgroup
   - Cynisme vs idéalisme
   - Tendance aux théories du complot
   - Tolérance à la différence

9. PATTERNS COMPORTEMENTAUX & AUTO-GESTION
   - Stabilité des routines
   - Fiabilité du self-care
   - Boucles d'habitudes
   - Tendances addictives potentielles
   - Expression de la colère
   - Patterns de responsabilité
   - Constance et fiabilité

10. FORCES, VERTUS & FACTEURS PROTECTEURS
    - Forces de caractère principales
    - Qualité des supports sociaux
    - Répertoire de compétences
    - Systèmes de sens
    - Identité adaptative

11. VULNÉRABILITÉS & SIGNAUX D'ALERTE (non-diagnostique)
    - Dérégulation chronique
    - Patterns rigides
    - Indicateurs de trauma éventuels
    - Zones de fragilité

12. FACTEURS DÉVELOPPEMENTAUX & CONTEXTUELS
    - Environnement précoce
    - Histoire d'apprentissage
    - Contexte culturel
    - Événements de vie marquants
    - Environnement actuel

=== INSTRUCTIONS ===
- Évalue chaque dimension avec les informations disponibles
- Pour chaque dimension, indique un niveau de confiance (faible/moyen/élevé) basé sur les données
- Si une dimension n'a pas été abordée, indique "Non évalué - données insuffisantes"
- Sois nuancé et évite les généralisations hâtives
- Note les contradictions et incohérences observées
- Identifie les patterns récurrents

=== CONTEXTE IMPORTANT ===
Luna est une guide IA qui pose des questions pour découvrir la personne à travers des scénarios thématiques :
- intro: Faire connaissance (prénom, âge, lieu, activité, situation)
- love_history: Histoire amoureuse (ex, patterns, blessures)
- love_vision: Vision de l'amour (attentes, besoins, deal-breakers)
- values: Valeurs & identité (ce qui compte, convictions)
- family: Famille & origines (parents, fratrie, culture)
- emotions: Émotions & sensibilité (rapport aux émotions)
- lifestyle: Mode de vie (hobbies, rythme, projets)
- dreams: Rêves & aspirations (espoirs, ambitions)
- wounds: Blessures & forces (épreuves, résilience)
- childhood: Enfance & construction (environnement familial, modèles)
- traumas: Traumatismes & résilience (événements difficiles)
- work_career: Vie professionnelle (carrière, ambitions, équilibre)
- parenting: Parentalité & avenir (désir d'enfants, vision)
- sexuality: Intimité & connexion (rapport à l'intimité physique)

=== ÉVALUATION DES ASSESSMENTS ===
Si Luna a fait passer des tests/évaluations pendant la conversation, analyse les réponses pour scorer :

TYPES D'ASSESSMENTS POSSIBLES :
1. STYLE D'ATTACHEMENT (attachment_style) :
   - Analyse : anxiété (peur abandon, besoin réassurance) vs évitement (inconfort proximité, besoin espace)
   - Résultats possibles : Sécure, Anxieux, Évitant, Anxieux-Évitant (désorganisé)

2. LANGAGES DE L'AMOUR (love_language) :
   - Analyse comment la personne donne ET reçoit l'amour
   - Résultats possibles : Paroles valorisantes, Moments de qualité, Cadeaux, Services rendus, Toucher physique

3. GESTION DES CONFLITS (conflict_style) :
   - Analyse les stratégies face aux désaccords
   - Résultats possibles : Collaboratif, Compétitif, Accommodant, Évitant, Compromis

4. INTELLIGENCE ÉMOTIONNELLE (emotional_intelligence) :
   - Évalue conscience de soi, autorégulation, empathie, compétences sociales
   - Résultats possibles : IE Faible, IE Moyenne, IE Élevée

5. JUGEMENT SITUATIONNEL (situational_judgment) :
   - Analyse les valeurs et le processus de décision
   - Résultats possibles : Principiel, Pragmatique, Loyal, Indépendant

6. RAISONNEMENT LOGIQUE (logic_puzzles) :
   - Évalue capacité de raisonnement et résolution de problèmes
   - Résultats possibles : Excellent, Bon, Moyen, À développer

7. CULTURE GÉNÉRALE (general_culture) :
   - Évalue connaissances et curiosité intellectuelle
   - Résultats possibles : Très cultivé, Bonne culture, Culture moyenne, En développement

Pour chaque assessment détecté, fournis :
- Le résultat principal
- Une explication basée sur les réponses
- Un niveau de confiance (faible/moyen/élevé)

=== DÉTECTION DES SCÉNARIOS EXPLORÉS ===
IMPORTANT: Analyse le transcript et DÉTECTE quels scénarios ont été réellement abordés dans cette conversation.
Un scénario est considéré "exploré" si Luna a posé des questions substantielles sur ce thème ET a obtenu des réponses significatives.

Marque explored=true pour CHAQUE scénario qui a été discuté, même partiellement.
Ne te limite PAS à ce qui est indiqué ci-dessous - analyse toi-même le contenu de la conversation.

(Indication client, peut être incomplète : ${scenarioLabelsStr})

Pour chaque scénario exploré, remplis le champ scenarioSummaries correspondant avec un résumé de ce qu'on a appris.`;

    // Build the merging instructions if we have an existing profile
    const mergingInstructions = isUpdate ? `

=== INSTRUCTIONS DE MISE À JOUR DU PROFIL ===
Tu as accès au PROFIL EXISTANT de cette personne basé sur ${sessionCount - 1} session(s) précédente(s).

PROFIL EXISTANT À METTRE À JOUR :
${JSON.stringify(existingProfile, null, 2)}

RÈGLES DE MISE À JOUR :
1. **Confirmer ou affiner** : Si les nouvelles données confirment les évaluations existantes, AUGMENTE le niveau de confiance
2. **Enrichir** : Ajoute les nouvelles informations découvertes sans perdre les anciennes
3. **Corriger avec prudence** : Ne modifie les scores existants que si les nouvelles données contredisent clairement
4. **Pondération par confiance** :
   - Confiance "faible" : peut être facilement mise à jour avec de nouvelles données
   - Confiance "moyen" : nécessite des données cohérentes pour changer
   - Confiance "élevé" : ne change que si contradiction forte et répétée
5. **Documenter les évolutions** : Note dans "contradictionsObserved" si tu observes des changements significatifs
6. **Fusionner les listes** : Pour les tableaux (coreValues, characterStrengths, etc.), fusionne les anciennes et nouvelles valeurs sans doublons
7. **Journal des conversations** :
   - CONSERVE toutes les entrées existantes dans conversationJournal.sessions
   - AJOUTE une nouvelle entrée pour la session actuelle (session #${sessionCount})
   - Mets à jour cumulativeNarrative pour refléter l'ensemble des sessions
   - Identifie les recurringThemes qui apparaissent à travers les sessions
   - Documente dans progressionNotes l'évolution observée

` : '';

    // Combine base prompt with merging instructions if applicable
    const fullSystemPrompt = systemPrompt + mergingInstructions;

    const transcriptText = transcript.map((m: { role: string; content: string }) =>
      `${m.role === 'assistant' ? 'LUNA' : 'UTILISATEUR'}: ${m.content}`
    ).join('\n\n');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: `${fullSystemPrompt}\n\nVoici la conversation à analyser :\n\n${transcriptText}` }
              ]
            }
          ],
          tools: [
            {
              functionDeclarations: [
                {
                  name: "create_psychological_profile",
                  description: "Crée un profil psychologique complet basé sur les 12 dimensions",
                  parameters: {
                    type: "object",
                    properties: {
                      // Basic info
                      basicInfo: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          ageRange: { type: "string" },
                          location: { type: "string" },
                          occupation: { type: "string" },
                          livingSituation: { type: "string" }
                        }
                      },

                      // Dimension 1: Identity & Self-Concept
                      identityAndSelfConcept: {
                        type: "object",
                        properties: {
                          selfEsteemStability: { type: "string", description: "Stable vs fluctuante selon validation externe" },
                          identityCoherence: { type: "string", description: "Valeurs claires et histoire cohérente vs fragmentée" },
                          selfEfficacy: { type: "string", description: "Sentiment de pouvoir gérer vs impuissance" },
                          locusOfControl: { type: "string", description: "Interne vs externe" },
                          coreValues: { type: "array", items: { type: "string" } },
                          meaningSource: { type: "string", description: "Sources de sens et de but" },
                          growthMindset: { type: "string", description: "Croissance vs fixe" },
                          moralIdentity: { type: "string", description: "Intégrité, culpabilité, réparation" },
                          confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                        }
                      },

                      // Dimension 2: Temperament
                      temperament: {
                        type: "object",
                        properties: {
                          emotionalIntensity: { type: "string", description: "Faible à élevée" },
                          emotionalLability: { type: "string", description: "Humeur stable vs changeante" },
                          threatSensitivity: { type: "string", description: "Hypervigilance, inquiétude" },
                          rewardSensitivity: { type: "string", description: "Recherche nouveauté, excitation" },
                          stressReactivity: { type: "string", description: "Montée rapide, récupération" },
                          baselineArousal: { type: "string", description: "Calme vs activé par défaut" },
                          frustrationTolerance: { type: "string", description: "Persévérance sous l'inconfort" },
                          confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                        }
                      },

                      // Dimension 3: Emotion Regulation
                      emotionRegulation: {
                        type: "object",
                        properties: {
                          emotionalAwareness: { type: "string", description: "Capacité à nommer les émotions" },
                          adaptiveStrategies: { type: "array", items: { type: "string" }, description: "Réévaluation, résolution, acceptation, soutien" },
                          maladaptiveStrategies: { type: "array", items: { type: "string" }, description: "Évitement, rumination, suppression" },
                          impulseControl: { type: "string" },
                          copingOrientation: { type: "string", description: "Problème vs émotion vs évitement" },
                          resilience: { type: "string" },
                          defenseMechanisms: { type: "array", items: { type: "string" } },
                          confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                        }
                      },

                      // Dimension 4: Cognitive Style
                      cognitiveStyle: {
                        type: "object",
                        properties: {
                          analyticalVsIntuitive: { type: "string" },
                          complexityTolerance: { type: "string", description: "Nuancé vs noir/blanc" },
                          cognitiveFlexibility: { type: "string" },
                          attentionControl: { type: "string" },
                          metacognition: { type: "string", description: "Insight sur ses propres biais" },
                          attributionStyle: { type: "string", description: "Interne/externe, stable/instable" },
                          cognitiveDistortions: { type: "array", items: { type: "string" } },
                          curiosityAndHumility: { type: "string" },
                          confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                        }
                      },

                      // Dimension 5: Motivation
                      motivation: {
                        type: "object",
                        properties: {
                          approachVsAvoidance: { type: "string" },
                          needsProfile: { type: "object", properties: {
                            autonomy: { type: "string" },
                            competence: { type: "string" },
                            relatedness: { type: "string" },
                            security: { type: "string" },
                            achievement: { type: "string" },
                            novelty: { type: "string" }
                          }},
                          intrinsicVsExtrinsic: { type: "string" },
                          timeHorizon: { type: "string", description: "Court terme vs long terme" },
                          grit: { type: "string" },
                          achievementStyle: { type: "string", description: "Maîtrise vs performance" },
                          procrastinationType: { type: "string" },
                          riskTolerance: { type: "string" },
                          confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                        }
                      },

                      // Dimension 6: Personality Traits
                      personalityTraits: {
                        type: "object",
                        properties: {
                          neuroticism: { type: "object", properties: { score: { type: "number" }, explanation: { type: "string" } } },
                          extraversion: { type: "object", properties: { score: { type: "number" }, explanation: { type: "string" } } },
                          openness: { type: "object", properties: { score: { type: "number" }, explanation: { type: "string" } } },
                          agreeableness: { type: "object", properties: { score: { type: "number" }, explanation: { type: "string" } } },
                          conscientiousness: { type: "object", properties: { score: { type: "number" }, explanation: { type: "string" } } },
                          honestyHumility: { type: "string" },
                          perfectionism: { type: "string" },
                          sensationSeeking: { type: "string" },
                          traitEmpathy: { type: "string" },
                          assertivenessStyle: { type: "string", description: "Passif / assertif / agressif" },
                          confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                        }
                      },

                      // Dimension 7: Interpersonal Style
                      interpersonalStyle: {
                        type: "object",
                        properties: {
                          attachmentPattern: { type: "string", description: "Sécure / anxieux / évitant / désorganisé" },
                          trustStyle: { type: "string" },
                          communicationStyle: { type: "string", description: "Direct/indirect, expressif/réservé" },
                          conflictStyle: { type: "string", description: "Évitement / accommodation / compétition / compromis / collaboration" },
                          boundaryQuality: { type: "string", description: "Poreuses / rigides / saines" },
                          empathyAndMentalization: { type: "string" },
                          socialReciprocity: { type: "string" },
                          influenceStyle: { type: "string" },
                          confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                        }
                      },

                      // Dimension 8: Social Cognition & Worldview
                      socialCognition: {
                        type: "object",
                        properties: {
                          beliefsAboutPeople: { type: "string", description: "Bons vs dangereux/égoïstes" },
                          justiceSensitivity: { type: "string" },
                          powerDistanceOrientation: { type: "string" },
                          ingroupOutgroupBias: { type: "string" },
                          cynicismVsIdealism: { type: "string" },
                          conspiracyProneness: { type: "string" },
                          toleranceForDifference: { type: "string" },
                          confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                        }
                      },

                      // Dimension 9: Behavioral Patterns
                      behavioralPatterns: {
                        type: "object",
                        properties: {
                          routineStability: { type: "string" },
                          selfCareReliability: { type: "string" },
                          habitLoops: { type: "array", items: { type: "string" } },
                          addictiveTendencies: { type: "string" },
                          angerExpression: { type: "string" },
                          responsibilityPatterns: { type: "string", description: "Ownership vs blâme" },
                          consistency: { type: "string", description: "Fiabilité, ponctualité, promesses" },
                          confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                        }
                      },

                      // Dimension 10: Strengths & Protective Factors
                      strengthsAndProtectiveFactors: {
                        type: "object",
                        properties: {
                          characterStrengths: { type: "array", items: { type: "string" } },
                          socialSupports: { type: "string" },
                          skillsRepertoire: { type: "array", items: { type: "string" } },
                          meaningSystems: { type: "string" },
                          adaptiveIdentity: { type: "string", description: "Peut intégrer l'échec" },
                          confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                        }
                      },

                      // Dimension 11: Vulnerabilities
                      vulnerabilities: {
                        type: "object",
                        properties: {
                          chronicDysregulation: { type: "string" },
                          rigidPatterns: { type: "string" },
                          traumaIndicators: { type: "string" },
                          fragilityZones: { type: "array", items: { type: "string" } },
                          confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                        }
                      },

                      // Dimension 12: Developmental & Contextual Factors
                      developmentalFactors: {
                        type: "object",
                        properties: {
                          earlyEnvironment: { type: "string" },
                          learningHistory: { type: "string" },
                          culturalContext: { type: "string" },
                          lifeEvents: { type: "array", items: { type: "string" } },
                          currentEnvironment: { type: "string" },
                          confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                        }
                      },

                      // Relationship specific
                      relationshipProfile: {
                        type: "object",
                        properties: {
                          loveLanguages: { type: "array", items: { type: "string" } },
                          dealBreakers: { type: "array", items: { type: "string" } },
                          idealPartnerQualities: { type: "array", items: { type: "string" } },
                          relationshipGoals: { type: "string" },
                          pastRelationshipPatterns: { type: "string" }
                        }
                      },

                      // Conversation Journal - Summary of all discussions
                      conversationJournal: {
                        type: "object",
                        properties: {
                          sessions: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                sessionNumber: { type: "number" },
                                date: { type: "string", description: "Date de la session (ISO format)" },
                                topicsDiscussed: { type: "array", items: { type: "string" }, description: "Principaux sujets abordés" },
                                keyMoments: { type: "array", items: { type: "string" }, description: "Moments clés ou révélations importantes" },
                                emotionalTone: { type: "string", description: "Ton émotionnel général de la session" },
                                briefSummary: { type: "string", description: "Résumé bref de la session (2-3 phrases)" }
                              }
                            },
                            description: "Entrées du journal pour chaque session"
                          },
                          cumulativeNarrative: { type: "string", description: "Récit cumulatif de l'évolution de la personne à travers les sessions" },
                          recurringThemes: { type: "array", items: { type: "string" }, description: "Thèmes récurrents observés à travers les sessions" },
                          progressionNotes: { type: "string", description: "Notes sur l'évolution et les changements observés au fil des sessions" }
                        }
                      },

                      // Scenario-based summaries - one entry per explored scenario
                      scenarioSummaries: {
                        type: "object",
                        description: "Résumés par scénario exploré",
                        properties: {
                          intro: {
                            type: "object",
                            properties: {
                              explored: { type: "boolean" },
                              summary: { type: "string", description: "Ce qu'on a appris sur les bases" },
                              keyFindings: { type: "array", items: { type: "string" } },
                              confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                            }
                          },
                          love_history: {
                            type: "object",
                            properties: {
                              explored: { type: "boolean" },
                              summary: { type: "string", description: "Ce qu'on a appris sur l'historique amoureux" },
                              keyFindings: { type: "array", items: { type: "string" } },
                              patterns: { type: "array", items: { type: "string" }, description: "Patterns répétitifs observés" },
                              confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                            }
                          },
                          love_vision: {
                            type: "object",
                            properties: {
                              explored: { type: "boolean" },
                              summary: { type: "string", description: "Vision de l'amour et attentes" },
                              keyFindings: { type: "array", items: { type: "string" } },
                              confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                            }
                          },
                          values: {
                            type: "object",
                            properties: {
                              explored: { type: "boolean" },
                              summary: { type: "string", description: "Valeurs et identité" },
                              keyFindings: { type: "array", items: { type: "string" } },
                              confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                            }
                          },
                          family: {
                            type: "object",
                            properties: {
                              explored: { type: "boolean" },
                              summary: { type: "string", description: "Famille et origines" },
                              keyFindings: { type: "array", items: { type: "string" } },
                              confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                            }
                          },
                          emotions: {
                            type: "object",
                            properties: {
                              explored: { type: "boolean" },
                              summary: { type: "string", description: "Rapport aux émotions" },
                              keyFindings: { type: "array", items: { type: "string" } },
                              confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                            }
                          },
                          lifestyle: {
                            type: "object",
                            properties: {
                              explored: { type: "boolean" },
                              summary: { type: "string", description: "Mode de vie et énergie" },
                              keyFindings: { type: "array", items: { type: "string" } },
                              confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                            }
                          },
                          dreams: {
                            type: "object",
                            properties: {
                              explored: { type: "boolean" },
                              summary: { type: "string", description: "Rêves et aspirations" },
                              keyFindings: { type: "array", items: { type: "string" } },
                              confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                            }
                          },
                          wounds: {
                            type: "object",
                            properties: {
                              explored: { type: "boolean" },
                              summary: { type: "string", description: "Blessures et forces (si abordé)" },
                              keyFindings: { type: "array", items: { type: "string" } },
                              confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                            }
                          },
                          // Deep exploration scenarios
                          childhood: {
                            type: "object",
                            properties: {
                              explored: { type: "boolean" },
                              summary: { type: "string", description: "Enfance et construction de soi" },
                              keyFindings: { type: "array", items: { type: "string" } },
                              confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                            }
                          },
                          traumas: {
                            type: "object",
                            properties: {
                              explored: { type: "boolean" },
                              summary: { type: "string", description: "Traumatismes et résilience" },
                              keyFindings: { type: "array", items: { type: "string" } },
                              confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                            }
                          },
                          work_career: {
                            type: "object",
                            properties: {
                              explored: { type: "boolean" },
                              summary: { type: "string", description: "Vie professionnelle et ambitions" },
                              keyFindings: { type: "array", items: { type: "string" } },
                              confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                            }
                          },
                          parenting: {
                            type: "object",
                            properties: {
                              explored: { type: "boolean" },
                              summary: { type: "string", description: "Parentalité et vision de l'avenir" },
                              keyFindings: { type: "array", items: { type: "string" } },
                              confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                            }
                          },
                          sexuality: {
                            type: "object",
                            properties: {
                              explored: { type: "boolean" },
                              summary: { type: "string", description: "Intimité et connexion physique" },
                              keyFindings: { type: "array", items: { type: "string" } },
                              confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                            }
                          }
                        }
                      },

                      // Assessment results - scored tests and evaluations
                      assessmentResults: {
                        type: "object",
                        description: "Résultats des évaluations/tests passés",
                        properties: {
                          attachment_style: {
                            type: "object",
                            properties: {
                              completed: { type: "boolean" },
                              result: { type: "string", description: "Sécure, Anxieux, Évitant, ou Anxieux-Évitant" },
                              anxietyScore: { type: "string", description: "Faible, Moyen, Élevé" },
                              avoidanceScore: { type: "string", description: "Faible, Moyen, Élevé" },
                              explanation: { type: "string" },
                              confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                            }
                          },
                          love_language: {
                            type: "object",
                            properties: {
                              completed: { type: "boolean" },
                              primary: { type: "string", description: "Langage principal pour recevoir" },
                              secondary: { type: "string", description: "Langage secondaire" },
                              givingStyle: { type: "string", description: "Comment la personne donne l'amour" },
                              explanation: { type: "string" },
                              confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                            }
                          },
                          conflict_style: {
                            type: "object",
                            properties: {
                              completed: { type: "boolean" },
                              result: { type: "string", description: "Collaboratif, Compétitif, Accommodant, Évitant, ou Compromis" },
                              explanation: { type: "string" },
                              confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                            }
                          },
                          emotional_intelligence: {
                            type: "object",
                            properties: {
                              completed: { type: "boolean" },
                              result: { type: "string", description: "IE Faible, IE Moyenne, ou IE Élevée" },
                              selfAwareness: { type: "string" },
                              selfRegulation: { type: "string" },
                              empathy: { type: "string" },
                              socialSkills: { type: "string" },
                              explanation: { type: "string" },
                              confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                            }
                          },
                          situational_judgment: {
                            type: "object",
                            properties: {
                              completed: { type: "boolean" },
                              result: { type: "string", description: "Principiel, Pragmatique, Loyal, ou Indépendant" },
                              valuesRevealed: { type: "array", items: { type: "string" } },
                              explanation: { type: "string" },
                              confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                            }
                          },
                          logic_puzzles: {
                            type: "object",
                            properties: {
                              completed: { type: "boolean" },
                              result: { type: "string", description: "Excellent, Bon, Moyen, ou À développer" },
                              correctAnswers: { type: "number" },
                              totalQuestions: { type: "number" },
                              explanation: { type: "string" },
                              confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                            }
                          },
                          general_culture: {
                            type: "object",
                            properties: {
                              completed: { type: "boolean" },
                              result: { type: "string", description: "Très cultivé, Bonne culture, Culture moyenne, ou En développement" },
                              areasOfStrength: { type: "array", items: { type: "string" } },
                              explanation: { type: "string" },
                              confidence: { type: "string", enum: ["faible", "moyen", "élevé"] }
                            }
                          }
                        }
                      },

                      // Track which assessments have been completed
                      completedAssessments: { type: "array", items: { type: "string" }, description: "IDs des assessments complétés" },

                      // Summary & Matching
                      overallSummary: { type: "string", description: "Résumé narratif du profil psychologique" },
                      keyInsights: { type: "array", items: { type: "string" }, description: "Insights clés sur la personne" },
                      contradictionsObserved: { type: "array", items: { type: "string" }, description: "Contradictions ou incohérences notées" },
                      matchingKeywords: { type: "array", items: { type: "string" } },
                      compatibilityFactors: { type: "array", items: { type: "string" } },
                      dimensionsCovered: { type: "array", items: { type: "string" }, description: "Dimensions suffisamment évaluées" },
                      dimensionsToExplore: { type: "array", items: { type: "string" }, description: "Dimensions nécessitant plus d'exploration" }
                    },
                    required: ["basicInfo", "personalityTraits", "overallSummary", "matchingKeywords", "dimensionsCovered", "dimensionsToExplore"]
                  }
                }
              ]
            }
          ],
          toolConfig: {
            functionCallingConfig: {
              mode: "ANY",
              allowedFunctionNames: ["create_psychological_profile"]
            }
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google AI API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 403) {
        return new Response(JSON.stringify({ error: "API key invalid or quota exceeded." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`Google AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    // Extract the function call from Google's response format
    const functionCall = data.candidates?.[0]?.content?.parts?.[0]?.functionCall;
    if (functionCall?.name === "create_psychological_profile" && functionCall?.args) {
      const profile = functionCall.args;

      // Process scenarioSummaries - trust the LLM's detection but also preserve existing data
      const scenarioSummaries = profile.scenarioSummaries || {};

      // Log what the LLM detected as explored
      const llmDetectedScenarios = Object.entries(scenarioSummaries)
        .filter(([_, data]) => (data as { explored?: boolean })?.explored)
        .map(([id]) => id);
      console.log(`LLM detected scenarios explored this session: ${llmDetectedScenarios.join(', ') || 'none'}`);

      // Also ensure client-indicated scenarios are marked (as fallback)
      for (const scenario of scenariosCovered) {
        if (!scenarioSummaries[scenario]) {
          scenarioSummaries[scenario] = { explored: true, summary: 'Exploré cette session', keyFindings: [], confidence: 'moyen' };
        } else if (!scenarioSummaries[scenario].explored) {
          // Only force if LLM didn't already set it
          scenarioSummaries[scenario].explored = true;
        }
      }

      // CRITICAL: Preserve existing explored scenarios from previous profile
      // This ensures we never lose track of what was explored in past sessions
      if (existingProfile?.scenarioSummaries) {
        for (const [scenarioId, existingData] of Object.entries(existingProfile.scenarioSummaries as Record<string, { explored?: boolean; summary?: string; keyFindings?: string[]; confidence?: string }>)) {
          if (existingData?.explored) {
            if (!scenarioSummaries[scenarioId]) {
              // Scenario was explored before but not this session - preserve it entirely
              scenarioSummaries[scenarioId] = { ...existingData };
            } else {
              // Scenario exists in both - ensure explored stays true and merge data
              scenarioSummaries[scenarioId].explored = true;
              // Merge keyFindings if both have them
              if (existingData.keyFindings && scenarioSummaries[scenarioId].keyFindings) {
                const existingFindings = new Set(existingData.keyFindings);
                const newFindings = scenarioSummaries[scenarioId].keyFindings || [];
                scenarioSummaries[scenarioId].keyFindings = [...existingFindings, ...newFindings.filter((f: string) => !existingFindings.has(f))];
              }
            }
          }
        }
      }

      // Final log of all explored scenarios
      const allExploredScenarios = Object.entries(scenarioSummaries)
        .filter(([_, data]) => (data as { explored?: boolean })?.explored)
        .map(([id]) => id);
      console.log(`Final explored scenarios (including previous sessions): ${allExploredScenarios.join(', ')}`);

      // Add metadata about the analysis
      const profileWithMetadata = {
        ...profile,
        scenarioSummaries, // Override with our forced values
        _metadata: {
          sessionCount: sessionCount,
          lastUpdated: new Date().toISOString(),
          isUpdate: isUpdate,
          model: 'gemini-2.5-flash'
        }
      };

      console.log(`Psychological profile ${isUpdate ? 'updated' : 'created'} successfully (session #${sessionCount})`);

      return new Response(JSON.stringify({ profile: profileWithMetadata }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Failed to extract profile from AI response");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error analyzing profile:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
