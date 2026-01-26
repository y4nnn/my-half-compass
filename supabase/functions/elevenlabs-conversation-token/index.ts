import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// IMPORTANT: You need to create an ElevenLabs Conversational AI Agent in the ElevenLabs dashboard
// and replace this with your agent ID
const ELEVENLABS_AGENT_ID = Deno.env.get("ELEVENLABS_AGENT_ID") || "YOUR_AGENT_ID";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    
    if (!ELEVENLABS_API_KEY) {
      console.error("ELEVENLABS_API_KEY not configured");
      throw new Error("ElevenLabs API key not configured");
    }

    if (ELEVENLABS_AGENT_ID === "YOUR_AGENT_ID") {
      console.error("ELEVENLABS_AGENT_ID not configured");
      throw new Error("ElevenLabs Agent ID not configured. Please create an agent in the ElevenLabs dashboard and add the ELEVENLABS_AGENT_ID secret.");
    }

    console.log("Requesting conversation token for agent:", ELEVENLABS_AGENT_ID);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${ELEVENLABS_AGENT_ID}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Token received successfully");

    return new Response(
      JSON.stringify({ token: data.token }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error getting conversation token:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
