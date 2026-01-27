import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, existingProfile, sessionCount = 1 } = await req.json();
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");

    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY is not configured");
    }

    if (!transcript || transcript.length === 0) {
      throw new Error("No transcript provided");
    }

    const isUpdate = existingProfile && sessionCount > 1;
    console.log(`Analyzing transcript with ${transcript.length} messages. Session #${sessionCount}, isUpdate: ${isUpdate}`);

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
Luna est une guide IA qui pose des questions pour découvrir la personne. Elle commence par les bases :
1. Le prénom
2. L'âge approximatif
3. La localisation (ville/région)
4. La profession/occupation
5. La situation amoureuse

Puis elle explore les dimensions psychologiques plus profondes. Les réponses de l'utilisateur contiennent donc les informations clés sur ces sujets. Même si tu ne vois que les réponses de l'utilisateur, déduis les informations de base (prénom, âge, lieu, profession) à partir du contexte de leurs réponses.`;

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

      // Add metadata about the analysis
      const profileWithMetadata = {
        ...profile,
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
