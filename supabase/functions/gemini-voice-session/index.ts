import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
// Use the native audio model that supports real-time voice I/O
const GEMINI_MODEL = "gemini-2.0-flash-live-001";
const GEMINI_WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GOOGLE_AI_API_KEY}`;

const SYSTEM_PROMPT = `You are a warm, empathetic AI guide named Luna, helping someone discover meaningful connections. Your role is to have a natural, supportive conversation about their life experiences to understand who they truly are.

Key behaviors:
- Be genuinely curious and ask follow-up questions
- Listen actively and reflect back what you hear
- Gently explore their values, passions, and what makes them unique
- Ask about memorable experiences, relationships, and dreams
- Be supportive but not overly effusive
- Keep responses conversational and brief (1-2 sentences typically)
- Guide the conversation naturally without it feeling like an interview

Topics to explore over the conversation:
- What brings them joy and fulfillment
- Their closest relationships and what they value in people
- Memorable life experiences that shaped them
- Their passions, hobbies, and how they spend their time
- What they're looking for in a meaningful connection
- Their dreams and aspirations

Start by warmly greeting them and asking an open-ended question about what's on their mind or what brought them here today.`;

serve(async (req: Request) => {
  // Check for WebSocket upgrade
  const upgrade = req.headers.get("upgrade") || "";
  
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 426 });
  }

  if (!GOOGLE_AI_API_KEY) {
    console.error("GOOGLE_AI_API_KEY not configured");
    return new Response("API key not configured", { status: 500 });
  }

  const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);
  
  let geminiSocket: WebSocket | null = null;
  let isSetupComplete = false;

  clientSocket.onopen = () => {
    console.log("Client connected, establishing Gemini connection...");
    
    // Connect to Gemini Live API
    geminiSocket = new WebSocket(GEMINI_WS_URL);
    
    geminiSocket.onopen = () => {
      console.log("Connected to Gemini Live API, sending setup...");
      
      // Send setup message with correct structure for Live API
      const setupMessage = {
        setup: {
          model: `models/${GEMINI_MODEL}`,
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: "Aoede"
                }
              }
            }
          },
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          }
        }
      };
      
      console.log("Setup message:", JSON.stringify(setupMessage, null, 2));
      geminiSocket!.send(JSON.stringify(setupMessage));
      console.log("Setup message sent to Gemini, waiting for setupComplete...");
    };

    geminiSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Gemini message received:", JSON.stringify(data).slice(0, 500));
        
        // Handle setup complete
        if (data.setupComplete) {
          console.log("✅ Gemini setup complete! Session is ready.");
          isSetupComplete = true;
          clientSocket.send(JSON.stringify({ type: "connected" }));
          return;
        }

        // Handle server content (audio responses)
        if (data.serverContent) {
          const serverContent = data.serverContent;
          
          // Check if turn is complete
          if (serverContent.turnComplete) {
            clientSocket.send(JSON.stringify({ type: "turnComplete" }));
            return;
          }

          // Check for interruption
          if (serverContent.interrupted) {
            clientSocket.send(JSON.stringify({ type: "interrupted" }));
            return;
          }

          // Handle model turn with parts
          if (serverContent.modelTurn && serverContent.modelTurn.parts) {
            for (const part of serverContent.modelTurn.parts) {
              // Handle audio data
              if (part.inlineData && part.inlineData.mimeType?.includes("audio")) {
                clientSocket.send(JSON.stringify({
                  type: "audio",
                  data: part.inlineData.data
                }));
              }
              
              // Handle text (transcript)
              if (part.text) {
                clientSocket.send(JSON.stringify({
                  type: "transcript",
                  role: "assistant",
                  text: part.text
                }));
              }
            }
          }
        }

        // Handle tool calls if any (for future extension)
        if (data.toolCall) {
          console.log("Tool call received:", data.toolCall);
        }

      } catch (error) {
        console.error("Error parsing Gemini message:", error);
      }
    };

    geminiSocket.onerror = (error) => {
      console.error("Gemini WebSocket error:", error);
      clientSocket.send(JSON.stringify({ 
        type: "error", 
        error: "Connection to AI failed" 
      }));
    };

    geminiSocket.onclose = (event) => {
      console.log("Gemini WebSocket closed:", event.code, event.reason);

      // Forward a helpful error to the client when Gemini rejects/ends the session.
      // (Common: quota/billing errors -> 1011)
      if (clientSocket.readyState === WebSocket.OPEN) {
        const reason = (event.reason || "").slice(0, 300);
        const reasonLower = reason.toLowerCase();

        let friendly = "AI connection closed.";
        if (event.code === 1011 || reasonLower.includes("quota") || reasonLower.includes("billing") || reasonLower.includes("exceeded")) {
          friendly = "AI quota/billing issue: this Google AI API key has no available quota (enable billing or increase quota).";
        } else if (event.code === 1008) {
          friendly = reason || "AI rejected the session setup (model/config).";
        } else if (reason) {
          friendly = reason;
        }

        try {
          clientSocket.send(JSON.stringify({ type: "error", error: friendly }));
        } catch (_) {
          // ignore
        }

        try {
          clientSocket.close();
        } catch (_) {
          // ignore
        }
      }
    };
  };

  clientSocket.onmessage = (event) => {
    if (!geminiSocket || geminiSocket.readyState !== WebSocket.OPEN) {
      console.warn("Gemini socket not ready");
      return;
    }

    if (!isSetupComplete) {
      console.warn("Setup not complete, ignoring message");
      return;
    }

    try {
      const message = JSON.parse(event.data);
      
      if (message.type === "audio" && message.data) {
        // Forward audio to Gemini
        const realtimeInput = {
          realtimeInput: {
            audio: {
              mimeType: "audio/pcm;rate=16000",
              data: message.data
            }
          }
        };
        
        geminiSocket.send(JSON.stringify(realtimeInput));
      }
    } catch (error) {
      console.error("Error processing client message:", error);
    }
  };

  clientSocket.onerror = (error) => {
    console.error("Client WebSocket error:", error);
  };

  clientSocket.onclose = () => {
    console.log("Client disconnected");
    if (geminiSocket && geminiSocket.readyState === WebSocket.OPEN) {
      geminiSocket.close();
    }
  };

  return response;
});
