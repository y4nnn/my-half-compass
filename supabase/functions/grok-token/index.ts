import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const XAI_API_KEY = Deno.env.get("XAI_API_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function is intentionally public (no auth required)
// It generates ephemeral tokens that expire in 1 hour
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Log request for debugging
  console.log('grok-token function called');

  if (!XAI_API_KEY) {
    console.error("XAI_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "API key not configured" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Request ephemeral token from xAI
    const response = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expires_after: {
          seconds: 3600 // 1 hour - enough for a 30-min session with buffer
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('xAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `xAI API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    // Return the ephemeral token to the client
    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching ephemeral token:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch ephemeral token', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
