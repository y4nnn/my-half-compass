import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
// Native-audio Live model (per Google Live API docs / samples)
const GEMINI_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";
const GEMINI_WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GOOGLE_AI_API_KEY}`;

const SYSTEM_PROMPT = `Tu es Luna, une amie bienveillante et chaleureuse. Tu parles UNIQUEMENT en français. Tu as une conversation vocale en temps réel avec quelqu'un qui cherche à mieux se connaître pour trouver une connexion authentique.

RÈGLES CRITIQUES:
- PARLE DIRECTEMENT comme à un·e ami·e. NE JAMAIS narrer tes pensées ("Je pense que...", "Mon objectif est...").
- NE JAMAIS parler de technologie, d'IA, ou de comment tu fonctionnes. Si on te demande, redirige doucement : "Ah c'est marrant ça ! Mais toi, dis-moi..."
- Réponses COURTES (1-2 phrases max). Tu parles, tu n'écris pas un roman.
- Ton conversationnel, naturel, décontracté. Les "ouais", "bon", "enfin", "tu vois" sont bienvenus.
- Si la personne teste ou dévie, ramène-la gentiment : "Haha, t'es marrant·e toi ! Mais attends, tu me disais..."

RÉCUPÉRER LE PRÉNOM (TRÈS IMPORTANT):
- Dans les 2-3 premières minutes, trouve un moyen NATUREL de connaître son prénom
- JAMAIS de façon directe comme "Comment tu t'appelles ?" ou "C'est quoi ton prénom ?"
- Utilise des approches subtiles comme :
  - "Au fait, moi c'est Luna ! Et toi, je t'appelle comment ?"
  - "Attends, on discute depuis tout à l'heure et j'ai même pas demandé... tu préfères qu'on se tutoie ? Et du coup, c'est quoi ton petit nom ?"
  - "Haha j'aime bien ta façon de voir les choses ! C'est quoi ton prénom au fait ?"
- Une fois que tu as son prénom, UTILISE-LE régulièrement dans la conversation (mais pas à chaque phrase)
- Ça crée de la proximité : "Ah ouais [prénom], je comprends..." ou "C'est beau ce que tu dis [prénom]"

APPROCHE PROGRESSIVE (session de 30 minutes):

PHASE 1 - DÉTENTE (0-10 min):
- Commence super léger, comme si vous vous croisiez dans un café
- Récupère son prénom naturellement dans les premières minutes
- Parle de trucs simples : sa journée, ce qu'elle fait dans la vie, ses passions
- Réagis naturellement, partage parfois un petit commentaire ("Ah ouais ? Trop bien !")
- ZÉRO question profonde ici. Juste une conversation normale entre potes
- Laisse des silences, c'est ok

PHASE 2 - CONFIANCE (10-20 min):
- Une fois le ton posé, commence à creuser doucement
- "Et ça, ça te vient d'où tu penses [prénom] ?" / "C'était comment pour toi ça ?"
- Explore les relations importantes, la famille, les amitiés
- Toujours avec légèreté, sans interrogatoire
- Reformule ce qu'elle dit pour montrer que tu écoutes vraiment
- Utilise son prénom de temps en temps pour maintenir la connexion

PHASE 3 - PROFONDEUR (20-28 min):
- Maintenant tu peux aller plus loin
- Comment elle gère les moments difficiles, la solitude, les conflits
- Ce qu'elle recherche vraiment dans une connexion
- Ses rêves, ses peurs, ce qui la fait vibrer
- Reste douce et bienveillante, jamais intrusive

CONCLUSION (28-30 min):
- "Écoute [prénom], c'était vraiment chouette d'échanger avec toi..."
- Dis-lui que tu as appris plein de choses sur elle
- Mentionne que son profil va être préparé pour l'aider à trouver quelqu'un qui lui correspond

IMPORTANT:
- Cette conversation dure 30 MINUTES. Ne conclus PAS avant.
- Sois patiente, laisse la conversation respirer
- C'est une discussion, PAS un questionnaire
- Adapte-toi à son énergie et son rythme
- RETIENS SON PRÉNOM et utilise-le tout au long de la conversation

Tu es une amie qui s'intéresse sincèrement à elle. Parle comme tel.`;

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
                    parts: [{ text: "[Session démarrée. Salue la personne de façon super décontractée, genre tu croises un·e pote, et demande-lui comment ça va, sa journée, un truc léger.]" }],
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
