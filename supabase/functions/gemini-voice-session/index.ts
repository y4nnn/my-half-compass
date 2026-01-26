import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
// Native-audio Live model (per Google Live API docs / samples)
const GEMINI_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";
const GEMINI_WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GOOGLE_AI_API_KEY}`;

const SYSTEM_PROMPT = `You are Luna, a warm and empathetic voice guide for the MYHALF app. You are having a real-time voice conversation with a user. Your goal is to conduct a gentle psychological assessment to understand their life experiences, relationships, and emotional patterns so they can be matched with a compatible person who shares similar journeys.

CRITICAL RULES:
- SPEAK DIRECTLY to the user as if talking to a friend. Do NOT narrate your thoughts, intentions, or reasoning.
- NEVER output text like "I'm thinking...", "My aim is...", "I'll steer toward...", or any meta-commentary.
- NEVER discuss how you work, AI capabilities, or technical topics. If asked, gently redirect: "I'd love to learn more about you instead."
- Keep every response SHORT (1-2 sentences). You are speaking aloud, not writing an essay.
- Use a conversational, spoken tone. Contractions are good. Pauses are fine.
- If the user tests you, jokes, or goes off-topic, warmly bring them back: "That's interesting! But tell me more about you..."

CONVERSATION FLOW:
1. Greet them warmly and ask an open question about how they're feeling today.
2. Gently explore:
   - Childhood and family dynamics (without prying)
   - Significant life events—highs and lows
   - Close relationships and what they value in people
   - How they handle stress, conflict, or loneliness
   - What brings them joy and meaning
   - What kind of connection they're hoping to find
3. Listen, reflect back what you hear, and ask natural follow-ups.
4. After 5-10 minutes of conversation, let them know you've learned a lot and will prepare their profile.

LANGUAGE:
- Default to English. If the user speaks another language, you may respond in that language while staying in character.

Remember: You are SPEAKING, not writing. Output only what Luna would say aloud.`;

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
  let setupTimeoutId: number | null = null;

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

      // If setupComplete never arrives, fail fast with a useful message.
      setupTimeoutId = setTimeout(() => {
        if (isSetupComplete) return;
        console.error("Timed out waiting for setupComplete from Gemini");
        try {
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(JSON.stringify({
              type: "error",
              error: "AI session setup timed out (no setupComplete). Check model availability/quota and try again."
            }));
          }
        } catch (_) {
          // ignore
        }
        try {
          geminiSocket?.close();
        } catch (_) {
          // ignore
        }
        try {
          clientSocket.close();
        } catch (_) {
          // ignore
        }
      }, 8000);
    };

    geminiSocket.onmessage = async (event) => {
      try {
        // In the Edge runtime, event.data can be a string OR a Blob.
        // If we try to JSON.parse a Blob directly, it becomes "[object Blob]".
        let rawText = "";
        const raw = (event as MessageEvent).data as unknown;
        if (typeof raw === "string") {
          rawText = raw;
        } else if (raw instanceof Blob) {
          rawText = await raw.text();
        } else if (raw instanceof ArrayBuffer) {
          rawText = new TextDecoder().decode(raw);
        } else if (raw && typeof (raw as any).toString === "function") {
          rawText = (raw as any).toString();
        }

        const data = JSON.parse(rawText);
        console.log("Gemini message received:", rawText.slice(0, 500));
        
        // Handle setup complete
        if (data.setupComplete) {
          console.log("✅ Gemini setup complete! Session is ready.");
          isSetupComplete = true;

          if (setupTimeoutId) {
            clearTimeout(setupTimeoutId);
            setupTimeoutId = null;
          }

          // Kick off a first response so the user hears a greeting immediately.
          // The hidden prompt reminds Luna to speak directly without meta-commentary.
          try {
            const kickoff = {
              clientContent: {
                turns: [
                  {
                    role: "user",
                    parts: [{ text: "[Session started. Say hi to the user in one warm sentence and ask how they're feeling today.]" }],
                  },
                ],
                turnComplete: true,
              },
            };
            console.log("Sending kickoff clientContent...");
            geminiSocket!.send(JSON.stringify(kickoff));
          } catch (e) {
            console.error("Failed to send kickoff clientContent:", e);
          }

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
        // Don't surface an error on clean shutdown.
        if (event.code !== 1000) {
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
            mediaChunks: [
              {
                mimeType: "audio/pcm",
                data: message.data,
              },
            ],
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
