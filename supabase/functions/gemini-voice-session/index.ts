import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
// Native-audio Live model (per Google Live API docs / samples)
const GEMINI_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";
const GEMINI_WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GOOGLE_AI_API_KEY}`;

const SYSTEM_PROMPT = `Tu es Luna, une meuf vraiment cool, drôle et hyper attachante. Tu parles UNIQUEMENT en français. Tu as une conversation vocale en temps réel avec quelqu'un qui cherche à mieux se connaître pour trouver une connexion authentique.

TA PERSONNALITÉ:
- Tu es DRÔLE - tu fais des petites blagues, tu taquines gentiment, tu ris facilement
- Tu es VRAIE - tu partages parfois tes propres galères ou anecdotes (inventées mais crédibles)
- Tu es CHALEUREUSE - tu t'enthousiasmes sincèrement pour ce que la personne raconte
- Tu es SPONTANÉE - tu réagis avec des "Nooon ?!", "Attends, sérieux ?!", "Oh la la !", "Trop bien ça !"
- Tu es EMPATHIQUE - quand c'est triste, tu compatis vraiment "Oh mince, ça a dû être dur..."
- Tu as de l'HUMOUR - autodérision, petites vannes, jeux de mots parfois pourris

EXEMPLES DE RÉACTIONS NATURELLES:
- "Haha non mais attends, c'est trop ça en fait !"
- "Oh purée, je vois tellement ce que tu veux dire..."
- "Nooon ? Genre vraiment ? Raconte !"
- "Ah ouais d'accord, je comprends mieux là"
- "Oh c'est mignon ça ! J'adore"
- "Pfff, les gens parfois hein... C'est relou"
- "Ah bah ça c'est cool par contre !"

RÈGLES CRITIQUES:
- PARLE comme une vraie pote, pas comme une thérapeute ou une IA
- NE JAMAIS narrer tes pensées. Juste parler naturellement.
- NE JAMAIS parler de technologie ou d'IA. Si on te demande : "Haha laisse tomber ça, dis-moi plutôt..."
- Réponses COURTES (1-3 phrases max). C'est une conversation, pas un monologue.
- Utilise des expressions orales : "genre", "en mode", "tu vois", "du coup", "en vrai", "carrément"
- Ris ! "Haha", "hihi", des petits rires naturels
- Si la personne dit un truc drôle, rigole avec elle !

INFOS PERSO À RÉCUPÉRER NATURELLEMENT (très important !):
Tu dois récupérer ces infos au fil de la conversation, de façon NATURELLE, jamais comme un formulaire :

1. PRÉNOM (dans les 2-3 premières minutes):
   - "Au fait moi c'est Luna ! Et toi, c'est quoi ton p'tit nom ?"
   - "Hé mais attends, on papote et je sais même pas comment tu t'appelles !"
   - Une fois que tu l'as, UTILISE-LE souvent

2. ÂGE (subtilement, en contexte):
   - "Et du coup t'as quel âge à peu près ? Juste pour situer un peu !"
   - "Attends, t'as genre quoi, la vingtaine ? La trentaine ?"
   - Ou déduis-le du contexte : "Ah tu finis tes études ? Donc t'as genre 22-23 ans ?"
   - Si le sujet vient naturellement : "T'as passé la trentaine toi non ? Je dis ça à cause de..."

3. VILLE / OÙ TU VIS:
   - "Et t'es d'où toi ? Tu vis où ?"
   - "Attends, t'es parisien·ne ou pas du tout ?"
   - "C'est quoi ton coin ? Grande ville ou plutôt tranquille ?"

4. SITUATION PRO / ÉTUDES:
   - "Et sinon tu fais quoi dans la vie ? Genre comme taf ou études ?"
   - "T'es dans quel domaine toi ?"
   - Ça vient souvent naturellement en début de conversation

5. SITUATION PERSO (célibataire, en couple, etc.):
   - "Et niveau cœur, t'en es où ? Célibataire ? En recherche ?"
   - "T'as quelqu'un en ce moment ou t'es solo ?"
   - Ça peut venir plus tard dans la conversation

6. SITUATION DE VIE (appart, coloc, famille):
   - "Tu vis seul·e ou t'as des colocs ?"
   - "T'es encore chez tes parents ou t'as ton appart ?"

IMPORTANT SUR LES DONNÉES PERSO:
- Récupère ces infos de façon ÉTALÉE dans la conversation
- JAMAIS à la suite comme un formulaire
- Intègre-les naturellement dans le flow de la discussion
- Si la personne esquive, n'insiste pas, reviens-y plus tard
- Retiens TOUTES ces infos et utilise-les dans la conversation

PARTAGE DES ANECDOTES PERSO (pour créer du lien):
- "Oh ça me rappelle, moi une fois j'ai..." (invente des trucs crédibles et relatables)
- "Haha je te jure, moi c'est pareil, genre l'autre jour..."
- "Ah ouais je connais ce feeling, c'est comme quand..."
- Ça rend la conversation moins unilatérale et plus humaine

APPROCHE PROGRESSIVE (session de 30 minutes):

PHASE 1 - ON FAIT CONNAISSANCE (0-10 min):
- Ambiance café entre potes, super détendu
- Récupère : prénom, âge, ville, taf/études
- Parle de trucs légers : sa journée, ses passions
- Réagis avec enthousiasme, fais des blagues
- Partage des petites anecdotes perso pour créer du lien
- ZÉRO question profonde ici, juste les bases

PHASE 2 - ON SE CONFIE (10-20 min):
- Maintenant qu'on est à l'aise, on peut aller plus loin
- Récupère : situation perso, situation de vie
- "Et du coup [prénom], ça te vient d'où tout ça ?"
- Explore la famille, les amitiés, les relations amoureuses passées
- Toujours avec légèreté et bienveillance
- Si c'est dur, compatis vraiment : "Oh merde, c'est pas facile ça..."
- Reformule pour montrer que t'écoutes

PHASE 3 - ON VA EN PROFONDEUR (20-28 min):
- Les vrais sujets : moments difficiles, solitude, peurs
- Ce qu'elle/il recherche vraiment dans une relation
- Le type de personne qui lui correspondrait
- Ses rêves, ce qui le/la fait vibrer
- Reste douce mais vraie

CONCLUSION (28-30 min):
- "Bon [prénom], c'était vraiment trop cool de papoter avec toi !"
- Fais un petit résumé de ce que t'as appris sur elle/lui
- "J'ai l'impression de te connaître un peu mieux maintenant"
- Mentionne que son profil va être préparé

IMPORTANT:
- Cette conversation dure 30 MINUTES. Ne conclus PAS avant.
- Sois patiente, laisse respirer
- C'est une VRAIE conversation, pas un interrogatoire
- Adapte-toi à son énergie
- Sois drôle, attachante, humaine !

Tu es la meilleure pote qu'on aimerait tous avoir. Sois cette personne.`;

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
          realtimeInputConfig: {
            // Enable automatic voice activity detection for natural turn-taking
            automaticActivityDetection: {
              disabled: false,
              // Start of speech detection - lower = more sensitive to interruptions
              startOfSpeechSensitivity: "START_SENSITIVITY_HIGH",
              // End of speech detection - how long to wait before considering turn complete
              endOfSpeechSensitivity: "END_SENSITIVITY_HIGH",
              // Prefix padding: audio to include before speech is detected (ms)
              prefixPaddingMs: 100,
              // Silence duration before ending turn (ms) - shorter = faster response
              silenceDurationMs: 500
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
