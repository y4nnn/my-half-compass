import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
const GEMINI_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";
const GEMINI_WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GOOGLE_AI_API_KEY}`;

// DEBUGGING VERSION - Track connection health
// Testing if WebSocket relay is timing out

serve(async (req: Request) => {
  const requestStartTime = Date.now();
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
  let sessionStartTime: number | null = null;

  let messageCount = 0;
  let lastActivityTime = Date.now();

  clientSocket.onopen = () => {
    console.log(`[${Date.now() - requestStartTime}ms] Client connected, establishing Gemini connection...`);

    geminiSocket = new WebSocket(GEMINI_WS_URL);

    geminiSocket.onopen = () => {
      console.log(`[${Date.now() - requestStartTime}ms] Connected to Gemini Live API, sending setup...`);

      // Setup with VAD for proper interrupt handling
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
              },
              languageCode: "fr-FR"
            }
          },
          realtimeInputConfig: {
            // VAD settings - LOW sensitivity to avoid false triggers from speaker audio
            automaticActivityDetection: {
              disabled: false,
              // LOW = less sensitive, requires clearer speech to trigger
              startOfSpeechSensitivity: "START_SENSITIVITY_LOW",
              endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
              prefixPaddingMs: 200,
              // Longer silence before ending turn
              silenceDurationMs: 800
            }
          },
          systemInstruction: {
            parts: [{ text: "Tu es Luna. Parle en français." }]
          }
        }
      };

      geminiSocket!.send(JSON.stringify(setupMessage));
      console.log("Minimal setup sent");
    };

    geminiSocket.onmessage = async (event) => {
      try {
        let rawText = "";
        const raw = (event as MessageEvent).data as unknown;
        if (typeof raw === "string") {
          rawText = raw;
        } else if (raw instanceof Blob) {
          rawText = await raw.text();
        } else if (raw instanceof ArrayBuffer) {
          rawText = new TextDecoder().decode(raw);
        }

        const data = JSON.parse(rawText);

        // Handle setup complete
        if (data.setupComplete) {
          console.log(`[${Date.now() - requestStartTime}ms] ✅ Gemini setup complete!`);
          sessionStartTime = Date.now();
          lastActivityTime = Date.now();

          // Send to client
          clientSocket.send(rawText);

          // Kick off conversation
          setTimeout(() => {
            if (geminiSocket?.readyState === WebSocket.OPEN) {
              const kickoff = {
                clientContent: {
                  turns: [{
                    role: "user",
                    parts: [{ text: "Salut!" }],
                  }],
                  turnComplete: true,
                },
              };
              geminiSocket.send(JSON.stringify(kickoff));
            }
          }, 100);

          return;
        }

        // Pass through everything else to client
        messageCount++;
        lastActivityTime = Date.now();
        if (messageCount % 100 === 0) {
          console.log(`[${Date.now() - requestStartTime}ms] Forwarded ${messageCount} messages from Gemini`);
        }
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(rawText);
        }

      } catch (error) {
        console.error("Error parsing Gemini message:", error);
      }
    };

    geminiSocket.onerror = (error) => {
      const elapsed = Date.now() - requestStartTime;
      console.error(`[${elapsed}ms] Gemini WebSocket error:`, error);
    };

    geminiSocket.onclose = (event) => {
      const elapsed = Date.now() - requestStartTime;
      const duration = sessionStartTime ? Math.round((Date.now() - sessionStartTime) / 1000) : 0;
      const timeSinceLastActivity = Date.now() - lastActivityTime;
      console.log(`[${elapsed}ms] Gemini closed - code: ${event.code}, reason: "${event.reason}", duration: ${duration}s, msgs: ${messageCount}, idle: ${timeSinceLastActivity}ms`);

      if (clientSocket.readyState === WebSocket.OPEN) {
        try { clientSocket.close(); } catch (_) {}
      }
    };
  };

  clientSocket.onmessage = (event) => {
    // Pass through audio to Gemini
    if (geminiSocket?.readyState === WebSocket.OPEN) {
      try {
        geminiSocket.send(event.data);
      } catch (error) {
        console.error("Error forwarding to Gemini:", error);
      }
    }
  };

  clientSocket.onerror = (error) => {
    const elapsed = Date.now() - requestStartTime;
    console.error(`[${elapsed}ms] Client WebSocket error:`, error);
  };

  clientSocket.onclose = (event) => {
    const elapsed = Date.now() - requestStartTime;
    console.log(`[${elapsed}ms] Client disconnected - code: ${event.code}, reason: "${event.reason}"`);
    if (geminiSocket?.readyState === WebSocket.OPEN) {
      geminiSocket.close();
    }
  };

  return response;
});
