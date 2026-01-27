import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, userId } = await req.json();
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY is not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get messages from this session
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("role, content, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      throw new Error(`Failed to fetch messages: ${messagesError.message}`);
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages found for this session" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating summary for session ${sessionId} with ${messages.length} messages`);

    const systemPrompt = `Tu es un assistant qui analyse des conversations entre Luna (une guide IA) et un utilisateur.
Ton rôle est d'extraire un résumé structuré de cette conversation pour permettre à Luna de se souvenir du contexte lors des prochaines sessions.

IMPORTANT : Toutes tes réponses doivent être EN FRANÇAIS.

=== LES 12 DIMENSIONS PSYCHOLOGIQUES À TRACKER ===
1. Identité & Concept de soi
2. Tempérament & Réactivité émotionnelle
3. Régulation émotionnelle & Coping
4. Style cognitif & Patterns de pensée
5. Motivation & Architecture des objectifs
6. Traits de personnalité
7. Style interpersonnel & Attachement
8. Cognition sociale & Vision du monde
9. Patterns comportementaux & Auto-gestion
10. Forces, Vertus & Facteurs protecteurs
11. Vulnérabilités & Signaux d'alerte
12. Facteurs développementaux & Contextuels

=== CE QUE TU DOIS EXTRAIRE ===

1. SUJETS ABORDÉS : Liste des thèmes explorés

2. RÉVÉLATIONS CLÉS : Informations importantes sur l'utilisateur

3. HISTOIRES & SOUVENIRS RACONTÉS :
   - Histoires d'enfance
   - Anecdotes familiales
   - Expériences relationnelles
   - Moments marquants

4. TRAUMAS & ÉPREUVES (CRITIQUE POUR LE MATCHING) :
   Pour chaque trauma/épreuve mentionné, note :
   - Le type (violence, abandon, deuil, harcèlement, trahison, échec...)
   - Le contexte (enfance, adolescence, relation, travail...)
   - L'impact décrit
   - Le niveau de gravité perçu (léger/modéré/sévère)

5. DIMENSIONS PSYCHOLOGIQUES COUVERTES :
   Indique quelles dimensions (1-12) ont été abordées dans cette session

6. MOMENTS ÉMOTIONNELS : Sujets sensibles, réactions fortes

7. RÉSUMÉ POUR CONTEXTE : 2-3 phrases pour la prochaine session

8. SUJETS À EXPLORER : Ce qui n'a pas encore été approfondi

Sois minutieux sur les traumas et épreuves - ce sont des informations CRUCIALES pour le matching.`;

    const transcriptText = messages.map((m: { role: string; content: string }) =>
      `${m.role === 'assistant' ? 'LUNA' : 'UTILISATEUR'}: ${m.content}`
    ).join('\n\n');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
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
                { text: `${systemPrompt}\n\nVoici la conversation à analyser :\n\n${transcriptText}` }
              ]
            }
          ],
          tools: [
            {
              functionDeclarations: [
                {
                  name: "create_session_summary",
                  description: "Crée un résumé structuré de la conversation avec focus sur les dimensions psychologiques",
                  parameters: {
                    type: "object",
                    properties: {
                      user_name: {
                        type: "string",
                        description: "Le prénom de l'utilisateur s'il a été mentionné"
                      },
                      topics_covered: {
                        type: "array",
                        items: { type: "string" },
                        description: "Liste des sujets abordés durant la conversation"
                      },
                      key_revelations: {
                        type: "array",
                        items: { type: "string" },
                        description: "Informations importantes révélées sur l'utilisateur"
                      },
                      stories_shared: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            type: { type: "string", description: "enfance/famille/relation/travail/autre" },
                            summary: { type: "string", description: "Résumé de l'histoire" },
                            emotional_tone: { type: "string", description: "positif/neutre/négatif/mixte" }
                          }
                        },
                        description: "Histoires et souvenirs racontés par l'utilisateur"
                      },
                      traumas_and_hardships: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            type: { type: "string", description: "violence/abandon/deuil/harcèlement/trahison/échec/abus/négligence/autre" },
                            context: { type: "string", description: "enfance/adolescence/relation_amoureuse/famille/travail/école/autre" },
                            description: { type: "string", description: "Description de l'épreuve" },
                            impact_described: { type: "string", description: "Impact décrit par l'utilisateur" },
                            severity: { type: "string", enum: ["léger", "modéré", "sévère", "non_déterminé"] },
                            matching_relevance: { type: "string", description: "Pourquoi c'est important pour le matching" }
                          }
                        },
                        description: "Traumas et épreuves mentionnés - CRUCIAL pour le matching"
                      },
                      dimensions_covered: {
                        type: "array",
                        items: { type: "string" },
                        description: "Dimensions psychologiques (1-12) abordées dans cette session"
                      },
                      dimensions_to_explore: {
                        type: "array",
                        items: { type: "string" },
                        description: "Dimensions psychologiques pas encore explorées"
                      },
                      emotional_moments: {
                        type: "array",
                        items: { type: "string" },
                        description: "Moments émotionnels ou sujets sensibles abordés"
                      },
                      summary_for_context: {
                        type: "string",
                        description: "Résumé concis (2-3 phrases) pour le contexte de la prochaine session"
                      },
                      topics_to_explore: {
                        type: "array",
                        items: { type: "string" },
                        description: "Sujets spécifiques à explorer dans les prochaines sessions"
                      },
                      red_flags_for_matching: {
                        type: "array",
                        items: { type: "string" },
                        description: "Red flags identifiés qui affecteront le matching (violence, abus, patterns toxiques)"
                      },
                      positive_indicators: {
                        type: "array",
                        items: { type: "string" },
                        description: "Indicateurs positifs pour le matching (résilience, ouverture, maturité)"
                      }
                    },
                    required: ["topics_covered", "key_revelations", "summary_for_context", "dimensions_covered", "dimensions_to_explore"]
                  }
                }
              ]
            }
          ],
          toolConfig: {
            functionCallingConfig: {
              mode: "ANY",
              allowedFunctionNames: ["create_session_summary"]
            }
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google AI API error:", response.status, errorText);
      throw new Error(`Google AI API error: ${response.status}`);
    }

    const data = await response.json();
    const functionCall = data.candidates?.[0]?.content?.parts?.[0]?.functionCall;

    if (functionCall?.name === "create_session_summary" && functionCall?.args) {
      const summary = functionCall.args;
      console.log("Summary generated:", summary);

      // Build extended key_revelations that includes trauma info
      const extendedRevelations = [
        ...(summary.key_revelations || []),
        ...(summary.traumas_and_hardships || []).map((t: { type: string; description: string; severity: string }) =>
          `[TRAUMA-${t.severity?.toUpperCase() || 'NON_DÉTERMINÉ'}] ${t.type}: ${t.description}`
        )
      ];

      // Save to context_summaries table
      const { error: insertError } = await supabase
        .from("context_summaries")
        .insert({
          user_id: userId,
          session_id: sessionId,
          topics_covered: summary.topics_covered || [],
          key_revelations: extendedRevelations,
          emotional_moments: summary.emotional_moments || [],
          summary_for_context: summary.summary_for_context || "",
          topics_to_explore: summary.topics_to_explore || []
        });

      if (insertError) {
        console.error("Failed to save summary:", insertError);
        throw new Error(`Failed to save summary: ${insertError.message}`);
      }

      // Update user name if discovered
      if (summary.user_name) {
        const { error: updateError } = await supabase
          .from("users")
          .update({ name: summary.user_name })
          .eq("id", userId);

        if (updateError) {
          console.error("Failed to update user name:", updateError);
        }
      }

      return new Response(JSON.stringify({ success: true, summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Failed to extract summary from AI response");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error generating summary:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
