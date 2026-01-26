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
    const { transcript } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!transcript || transcript.length === 0) {
      throw new Error("No transcript provided");
    }

    console.log("Analyzing transcript with", transcript.length, "messages");

    const systemPrompt = `You are an expert psychologist and relationship analyst. Analyze this conversation between a user and an AI guide to create a detailed psychological and personality profile for dating/matching purposes.

Extract the following information from the conversation:

1. **Personal Background**
   - Age range (if mentioned or inferred)
   - Location/city (if mentioned)
   - Occupation/career field
   - Education level
   - Living situation

2. **Personality Traits** (rate each 1-10 with explanation)
   - Openness to experience
   - Conscientiousness
   - Extraversion/Introversion
   - Agreeableness
   - Emotional stability

3. **Life Experiences & Stories**
   - Key life events mentioned
   - Challenges overcome
   - Proud achievements
   - Formative experiences

4. **Values & Beliefs**
   - Core values
   - Religious/spiritual beliefs
   - Political leanings (if any)
   - Life philosophy

5. **Relationship History & Style**
   - Past relationship patterns
   - Attachment style (secure, anxious, avoidant, disorganized)
   - Communication preferences
   - Love languages (words of affirmation, quality time, gifts, acts of service, physical touch)

6. **Goals & Aspirations**
   - Short-term goals
   - Long-term life vision
   - Career ambitions
   - Family/relationship goals

7. **Interests & Hobbies**
   - Active hobbies
   - Passive interests
   - Social activities
   - Solo activities

8. **Deal Breakers & Must-Haves**
   - Non-negotiables in a partner
   - Red flags they mentioned
   - Ideal partner qualities

9. **Communication Style**
   - How they express themselves
   - Emotional expressiveness
   - Conflict resolution style

10. **Emotional Profile**
    - Current emotional state
    - Coping mechanisms
    - Support needs
    - Emotional intelligence indicators

Be thorough and extract as much detail as possible from the conversation. If something wasn't discussed, mark it as "Not discussed" rather than making assumptions.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Here is the conversation transcript to analyze:\n\n${transcript.map((m: { role: string; content: string }) => 
              `${m.role.toUpperCase()}: ${m.content}`
            ).join('\n\n')}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_profile",
              description: "Create a detailed user profile from the conversation analysis",
              parameters: {
                type: "object",
                properties: {
                  personalBackground: {
                    type: "object",
                    properties: {
                      ageRange: { type: "string" },
                      location: { type: "string" },
                      occupation: { type: "string" },
                      education: { type: "string" },
                      livingSituation: { type: "string" }
                    }
                  },
                  personalityTraits: {
                    type: "object",
                    properties: {
                      openness: { type: "object", properties: { score: { type: "number" }, explanation: { type: "string" } } },
                      conscientiousness: { type: "object", properties: { score: { type: "number" }, explanation: { type: "string" } } },
                      extraversion: { type: "object", properties: { score: { type: "number" }, explanation: { type: "string" } } },
                      agreeableness: { type: "object", properties: { score: { type: "number" }, explanation: { type: "string" } } },
                      emotionalStability: { type: "object", properties: { score: { type: "number" }, explanation: { type: "string" } } }
                    }
                  },
                  lifeExperiences: {
                    type: "object",
                    properties: {
                      keyEvents: { type: "array", items: { type: "string" } },
                      challengesOvercome: { type: "array", items: { type: "string" } },
                      achievements: { type: "array", items: { type: "string" } },
                      formativeExperiences: { type: "array", items: { type: "string" } }
                    }
                  },
                  valuesAndBeliefs: {
                    type: "object",
                    properties: {
                      coreValues: { type: "array", items: { type: "string" } },
                      spiritualBeliefs: { type: "string" },
                      lifePhilosophy: { type: "string" }
                    }
                  },
                  relationshipStyle: {
                    type: "object",
                    properties: {
                      pastPatterns: { type: "string" },
                      attachmentStyle: { type: "string" },
                      communicationPreferences: { type: "array", items: { type: "string" } },
                      loveLanguages: { type: "array", items: { type: "string" } }
                    }
                  },
                  goalsAndAspirations: {
                    type: "object",
                    properties: {
                      shortTermGoals: { type: "array", items: { type: "string" } },
                      longTermVision: { type: "string" },
                      careerAmbitions: { type: "string" },
                      relationshipGoals: { type: "string" }
                    }
                  },
                  interestsAndHobbies: {
                    type: "object",
                    properties: {
                      activeHobbies: { type: "array", items: { type: "string" } },
                      passiveInterests: { type: "array", items: { type: "string" } },
                      socialActivities: { type: "array", items: { type: "string" } },
                      soloActivities: { type: "array", items: { type: "string" } }
                    }
                  },
                  dealBreakersAndMustHaves: {
                    type: "object",
                    properties: {
                      nonNegotiables: { type: "array", items: { type: "string" } },
                      redFlags: { type: "array", items: { type: "string" } },
                      idealPartnerQualities: { type: "array", items: { type: "string" } }
                    }
                  },
                  communicationStyle: {
                    type: "object",
                    properties: {
                      expressionStyle: { type: "string" },
                      emotionalExpressiveness: { type: "string" },
                      conflictResolution: { type: "string" }
                    }
                  },
                  emotionalProfile: {
                    type: "object",
                    properties: {
                      currentState: { type: "string" },
                      copingMechanisms: { type: "array", items: { type: "string" } },
                      supportNeeds: { type: "string" },
                      emotionalIntelligence: { type: "string" }
                    }
                  },
                  overallSummary: { type: "string" },
                  matchingKeywords: { type: "array", items: { type: "string" } },
                  compatibilityFactors: { type: "array", items: { type: "string" } }
                },
                required: ["personalBackground", "personalityTraits", "overallSummary", "matchingKeywords"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_profile" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    // Extract the tool call arguments
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const profile = JSON.parse(toolCall.function.arguments);
      console.log("Profile extracted successfully");
      
      return new Response(JSON.stringify({ profile }), {
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
