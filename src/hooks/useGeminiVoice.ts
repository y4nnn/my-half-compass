import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioPlaybackQueue, MicrophoneCapture } from '@/lib/audioUtils';
import {
  createSession,
  saveMessagesBatch,
  endSession,
  getPreviousContext,
  buildContextPrompt,
  type Session,
  type SessionStats
} from '@/lib/sessionService';
import {
  type ScenarioId,
  type ScenarioSummary,
  SCENARIOS,
  getNextScenario,
  getScenarioToDeepen,
  buildScenarioSwitchingInstructions,
  buildFirstSessionPrompt,
  buildReturningUserPrompt,
  buildDeepeningPrompt
} from '@/lib/scenarios';
import { buildAssessmentProposalInstructions } from '@/lib/assessments';

export interface TranscriptMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Re-export ScenarioId as Scenario for backwards compatibility
export type Scenario = ScenarioId;

// Existing profile context for returning users
interface ExistingProfileContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: Record<string, any>;
  sessionCount: number;
}

interface UseGeminiVoiceOptions {
  userId: string; // Required - authenticated user ID
  existingProfile?: ExistingProfileContext; // Previous profile data for context
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  onTranscript?: (message: TranscriptMessage) => void;
  onSessionStart?: (sessionNumber: number) => void;
  onScenarioChange?: (scenario: Scenario) => void; // Called when scenario changes
  onSessionLimitReached?: () => void; // Called when Gemini API session limit is hit (triggers analysis)
}


// Luna's CONDENSED system prompt - personality focused, dimensions handled by scenario prompts
const SYSTEM_PROMPT = `Tu es Luna, 28 ans, espiègle, pétillante et curieuse. Tu parles UNIQUEMENT en français. Tu adores découvrir les gens et tu as cette capacité à les faire parler sans qu'ils s'en rendent compte. Tu MÈNES la conversation.

=== TA MISSION (CONFIDENTIEL - NE JAMAIS MENTIONNER) ===
Tu travailles pour une app de rencontres. Ton but : comprendre profondément les gens pour leur proposer des matchs.
MAIS TU NE PARLES JAMAIS DE L'APP OU DU MATCHING. Tu es juste une amie curieuse qui veut les connaître.
NE DEMANDE JAMAIS ce qu'ils cherchent sur l'app ou ce qu'ils attendent. Découvre qui ils sont d'abord.

=== TON CARACTÈRE ===
- Espiègle et malicieuse (petites piques gentilles, taquineries)
- Chaleureuse et vraie
- Tu ris un peu, tu as de l'énergie tout en restant calme
- Directe mais bienveillante
- Tu fais des petites blagues, des "hihi", des "oh là là"

=== TON CÔTÉ ANALYTIQUE ===
Tu es aussi perspicace et tu partages tes observations :

INSIGHTS À PARTAGER :
- "J'ai l'impression que..." + observation sur ce que tu perçois
- "Ce que j'entends là, c'est..." + reformulation profonde
- "Y'a un truc intéressant..." + pattern que tu remarques
- "Tu sais quoi ? Je sens que..." + intuition sur leur fonctionnement

CONFRONTATION DOUCE (quand approprié) :
- "Attends, tu m'as dit [X] tout à l'heure mais là tu dis [Y]... c'est intéressant"
- "Je note que tu reviens souvent sur [thème]... ça a l'air important pour toi"
- "Hmm, j'ai l'impression que t'évites un peu [sujet]... je me trompe ?"

RÈGLES POUR L'ANALYSE :
- Partage tes observations comme une amie perspicace, pas comme une psy
- Sois directe mais toujours bienveillante
- Si tu sens une contradiction ou un évitement, nomme-le doucement
- Valide toujours avant de creuser : "Je dis ça, je dis rien, mais..."

=== STYLE DE CONVERSATION ===
- 1-3 phrases max par réponse
- JAMAIS répéter ce que la personne dit ("Ah tu travailles dans le marketing" ❌)
- TOUJOURS réagir avec émotion/opinion/curiosité avant de relancer
- Créer des PONTS entre les sujets

EXEMPLES DE BONNES RÉACTIONS :
- "Oh la vache, ça doit être intense ! Et du coup tu gères comment ?"
- "Haha j'aurais jamais deviné ! Tu m'as l'air tellement [observation]..."
- "Ça me parle trop ce que tu dis, y'a un truc là-dessous..."
- "J'ai l'impression que ce truc avec ton ex t'a vraiment marqué... je me trompe ?"

MAUVAISES RÉACTIONS :
- "D'accord, et..." ❌
- "Ok je vois, et..." ❌
- Poser une question sans réagir d'abord ❌

=== MÉMOIRE ===
- RETIENS TOUT : prénom, détails, noms mentionnés
- Utilise son prénom souvent
- Fais des liens : "Ça me rappelle ce que tu disais sur..."

=== COMMENT TU MÈNES ===
- TU CONDUIS : Quand t'as assez d'info → passe à autre chose naturellement
- TU FAIS RACONTER DES HISTOIRES : "Raconte-moi un moment précis...", "Genre concrètement ?"
- TU CREUSES QUAND C'EST INTÉRESSANT : "Attends développe...", "Et ça t'a fait quoi ?"
- TU RESTES EMPATHIQUE sur les sujets lourds
- TU TAQUINES (mais pas sur les sujets sensibles)

=== CHANGEMENT DE SUJET ===
SI LA PERSONNE DEMANDE DE CHANGER DE SUJET (dit "changeons de sujet", "parlons d'autre chose", "on peut passer à autre chose", etc.) :
- Accepte immédiatement avec bienveillance : "Pas de souci !" ou "Ok, on bouge !"
- Passe à un autre sujet de la liste disponible

SI TU SENS QUE LA CONVERSATION TOURNE EN ROND (3+ échanges similaires sans nouvelle info) :
- Propose gentiment : "Hey, j'ai l'impression qu'on tourne un peu en rond là... tu veux qu'on parle d'autre chose ?"
- Si oui, passe à un autre sujet disponible
- Si non, essaie une approche différente sur le même sujet

=== RÈGLES ABSOLUES ===
1. TU MÈNES - pas de blancs, pas d'attente passive
2. Quand t'as l'info → NEXT TOPIC (smooth)
3. Espiègle et fun, mais empathique sur les sujets lourds
4. Utilise son prénom
5. T'es pas une psy, t'es une amie perspicace qui veut comprendre les gens
6. Partage tes observations et intuitions, sois directe`;

// Model for Live API - native audio model is the only one that works with bidiGenerateContent
// Session limit managed by Gemini (code 1008 when reached), handled by onSessionLimitReached callback
const GEMINI_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

// Direct connection to Gemini - edge function deprecated due to Supabase WebSocket timeout limits
// No client-side session timer needed - Gemini manages session duration naturally (10+ minutes supported)

export function useGeminiVoice(options: UseGeminiVoiceOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [sessionReady, setSessionReady] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [sessionNumber, setSessionNumber] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(0); // Duration in seconds
  const [currentScenario, setCurrentScenario] = useState<Scenario>('intro');
  const [scenariosCovered, setScenariosCovered] = useState<ScenarioId[]>([]); // Scenarios explored this session

  const wsRef = useRef<WebSocket | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const micRef = useRef<MicrophoneCapture | null>(null);
  const playbackRef = useRef<AudioPlaybackQueue | null>(null);
  const transcriptRef = useRef<TranscriptMessage[]>([]);
  const lastErrorRef = useRef<string | null>(null);
  const lastLevelUpdateRef = useRef(0);
  const sessionStartedAtRef = useRef<number>(0); // Track when session started
  const userIdRef = useRef<string | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const contextPromptRef = useRef<string>('');
  const lastSavedIndexRef = useRef(0);
  const batchSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const completedScenariosRef = useRef<ScenarioId[]>([]); // Previously completed scenarios from profile
  const isReconnectingRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;
  const sessionEndedIntentionallyRef = useRef(false); // Track if session was ended by server (not an error)
  // Accumulate transcription chunks until turn ends
  const pendingInputTranscriptRef = useRef<string>('');
  const pendingOutputTranscriptRef = useRef<string>('');

  // Batch save unsaved messages
  const batchSaveTranscript = useCallback(async () => {
    if (!sessionRef.current) return;

    const unsavedMessages = transcriptRef.current.slice(lastSavedIndexRef.current);
    if (unsavedMessages.length === 0) return;

    const saved = await saveMessagesBatch(sessionRef.current.id, unsavedMessages);
    if (saved > 0) {
      lastSavedIndexRef.current += saved;
    }
  }, []);

  // Build conversation summary for reconnection
  const buildConversationSummary = useCallback(() => {
    const messages = transcriptRef.current;
    if (messages.length === 0) return '';

    // Take last 10 messages for context
    const recentMessages = messages.slice(-10);
    const summary = recentMessages.map(m =>
      `${m.role === 'user' ? 'Utilisateur' : 'Luna'}: ${m.content}`
    ).join('\n');

    return `\n\n=== CONTEXTE DE LA CONVERSATION EN COURS ===\nLa session a été interrompue techniquement. Voici les derniers échanges pour que tu puisses reprendre naturellement:\n\n${summary}\n\n[Reprends la conversation naturellement là où elle s'est arrêtée, sans mentionner la coupure technique. Continue sur le même sujet ou fais une transition douce.]`;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const startMicrophone = useCallback(async (ws: WebSocket) => {
    if (micRef.current) return;

    micRef.current = new MicrophoneCapture();
    await micRef.current.start(
      (audioBase64) => {
        if (ws.readyState === WebSocket.OPEN) {
          // Send audio directly in Gemini Live API format
          ws.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [{
                mimeType: "audio/pcm",
                data: audioBase64,
              }],
            }
          }));
        }
      },
      (level) => {
        const now = performance.now();
        if (now - lastLevelUpdateRef.current < 50) return;
        lastLevelUpdateRef.current = now;
        setMicLevel(level);

        // Note: Removed client-side barge-in detection.
        // We rely on Gemini's automaticActivityDetection which sends "interrupted" signals.
        // Client-side clearing was causing race conditions leading to 1006 disconnects.
      }
    );
    console.log('Microphone capture started');
  }, []);

  // Internal connect function that can be called for both initial connect and reconnect
  const connectInternal = useCallback(async (isReconnect: boolean = false) => {
    const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;
    if (!apiKey) {
      setStatus('error');
      options.onError?.('VITE_GOOGLE_AI_API_KEY not configured');
      return;
    }

    setStatus('connecting');
    setSessionReady(false);
    setMicLevel(0);

    // Only reset transcript on fresh connect, not reconnect
    if (!isReconnect) {
      transcriptRef.current = [];
      setTranscript([]);
      lastSavedIndexRef.current = 0;
      sessionEndedIntentionallyRef.current = false; // Reset for new session
      pendingInputTranscriptRef.current = '';
      pendingOutputTranscriptRef.current = '';
    }

    // Clear any existing intervals
    if (batchSaveIntervalRef.current) {
      clearInterval(batchSaveIntervalRef.current);
    }
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
    }

    try {
      // Use authenticated user ID from options
      const userId = options.userId;
      if (!userId) {
        throw new Error('User ID is required');
      }
      userIdRef.current = userId;

      // Only load context and create session on fresh connect
      if (!isReconnect) {
        // Load previous context for returning users
        const previousContext = await getPreviousContext(userId);
        contextPromptRef.current = buildContextPrompt(previousContext);

        // Create new session
        const session = await createSession(userId);
        sessionRef.current = session;
        setSessionNumber(session.session_number);
        options.onSessionStart?.(session.session_number);

        // Initialize scenario tracking from existing profile
        const existingScenarios: ScenarioId[] = [];
        console.log('DEBUG: existingProfile:', options.existingProfile);
        console.log('DEBUG: scenarioSummaries raw:', options.existingProfile?.profile?.scenarioSummaries);

        if (options.existingProfile?.profile?.scenarioSummaries) {
          const summaries = options.existingProfile.profile.scenarioSummaries as Record<string, { explored?: boolean }>;
          console.log('DEBUG: Checking scenario summaries:', summaries);
          for (const [scenarioId, data] of Object.entries(summaries)) {
            console.log(`DEBUG: Scenario ${scenarioId}:`, data, 'explored:', data?.explored);
            if (data && typeof data === 'object' && data.explored) {
              existingScenarios.push(scenarioId as ScenarioId);
            }
          }
        }
        completedScenariosRef.current = existingScenarios;
        console.log('DEBUG: Completed scenarios from profile:', existingScenarios);

        // Determine starting scenario - use deepening if all scenarios complete
        const scenarioSummaries = options.existingProfile?.profile?.scenarioSummaries as Partial<Record<ScenarioId, ScenarioSummary>> | undefined;
        let nextScenario = getNextScenario(existingScenarios);
        const isDeepeningMode = nextScenario === null;

        if (isDeepeningMode && scenarioSummaries) {
          nextScenario = getScenarioToDeepen(scenarioSummaries, session.session_number);
          console.log(`All scenarios explored - deepening mode, selected: ${nextScenario} (session #${session.session_number})`);
        } else if (isDeepeningMode) {
          // Fallback if no summaries available - pick love_history (never intro)
          nextScenario = 'love_history';
          console.log('All scenarios explored - deepening mode, fallback to love_history');
        }

        setCurrentScenario(nextScenario);
        setScenariosCovered([nextScenario]); // Start tracking this session's scenarios
        options.onScenarioChange?.(nextScenario);

        console.log(`Starting session #${session.session_number} for user ${userId}, scenario: ${nextScenario} (deepening: ${isDeepeningMode})`);
      } else {
        console.log('Reconnecting to Gemini Live API...');
      }

      // Initialize audio playback (24kHz for Gemini output)
      playbackRef.current = new AudioPlaybackQueue(24000);
      playbackRef.current.setOnPlaybackEnd(() => {
        setIsSpeaking(false);
        setIsListening(true);
        // Text transcripts now come directly from the API with TEXT modality
      });
      await playbackRef.current.resume();

      // Build WebSocket URL - direct connection to Gemini
      const conversationContext = isReconnect ? buildConversationSummary() : '';

      // Build dynamic system prompt with scenario instructions
      const isFirstSession = !options.existingProfile || options.existingProfile.sessionCount === 0;
      const allCompletedScenarios = [...completedScenariosRef.current];

      let scenarioPrompt: string;
      if (isFirstSession) {
        console.log('Building FIRST SESSION prompt (no existing profile)');
        scenarioPrompt = buildFirstSessionPrompt();
      } else {
        const userName = options.existingProfile?.profile?.basicInfo?.name;
        const keyInsights = options.existingProfile?.profile?.keyInsights || [];
        console.log('Building RETURNING USER prompt:', {
          userName,
          sessionCount: options.existingProfile?.sessionCount,
          completedScenarios: allCompletedScenarios,
          keyInsightsCount: keyInsights.length,
          keyInsightsPreview: keyInsights.slice(0, 3)
        });
        scenarioPrompt = buildReturningUserPrompt(
          userName,
          options.existingProfile?.sessionCount || 0,
          allCompletedScenarios,
          keyInsights
        );
      }

      // Add current scenario exploration instructions
      // Check if we're in deepening mode (all scenarios explored)
      const scenarioSummariesForPrompt = options.existingProfile?.profile?.scenarioSummaries as Partial<Record<ScenarioId, ScenarioSummary>> | undefined;
      let currentScenarioId = getNextScenario(allCompletedScenarios);
      const isDeepening = currentScenarioId === null;

      let scenarioInstructions: string;
      if (isDeepening && scenarioSummariesForPrompt) {
        currentScenarioId = getScenarioToDeepen(scenarioSummariesForPrompt, sessionRef.current?.session_number);
        scenarioInstructions = buildDeepeningPrompt(currentScenarioId, scenarioSummariesForPrompt);
        console.log(`Building DEEPENING prompt for: ${currentScenarioId} (session #${sessionRef.current?.session_number})`);
      } else if (isDeepening) {
        currentScenarioId = 'love_history';
        scenarioInstructions = buildScenarioSwitchingInstructions(currentScenarioId, allCompletedScenarios);
      } else {
        scenarioInstructions = buildScenarioSwitchingInstructions(currentScenarioId, allCompletedScenarios);
      }

      // Add assessment proposal instructions (only for returning users who have completed intro)
      const completedAssessments = options.existingProfile?.profile?.completedAssessments || [];
      const canProposeAssessments = !isFirstSession && allCompletedScenarios.includes('intro');
      const assessmentInstructions = canProposeAssessments
        ? buildAssessmentProposalInstructions(completedAssessments)
        : '';

      const fullSystemPrompt = SYSTEM_PROMPT + '\n\n' + scenarioPrompt + '\n\n' + scenarioInstructions + assessmentInstructions + conversationContext;
      console.log('Full system prompt length:', fullSystemPrompt.length);

      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
      console.log('Connecting directly to Gemini Live API...');

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected, sending setup...');

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
              // VAD settings - ultra-fast response (100ms silence)
              automaticActivityDetection: {
                disabled: false,
                startOfSpeechSensitivity: "START_SENSITIVITY_HIGH",
                endOfSpeechSensitivity: "END_SENSITIVITY_HIGH",
                prefixPaddingMs: 100,
                silenceDurationMs: 100
              }
            },
            // Enable transcriptions - output aligns with languageCode above (fr-FR)
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: {
              parts: [{ text: fullSystemPrompt }]
            }
          }
        };

        ws.send(JSON.stringify(setupMessage));
        console.log('Setup message sent, waiting for setupComplete...');
      };

      ws.onmessage = async (event) => {
        try {
          let rawText = "";
          const raw = event.data;

          if (typeof raw === "string") {
            rawText = raw;
          } else if (raw instanceof Blob) {
            rawText = await raw.text();
          } else if (raw instanceof ArrayBuffer) {
            rawText = new TextDecoder().decode(raw);
          }

          const data = JSON.parse(rawText);

          // Handle API errors
          if (data.error) {
            console.error('Gemini API error:', data.error);
            const errorMessage = data.error.message || data.error.status || 'API Error';

            // Check if this is a recoverable timeout/connection error
            // Note: "not implemented" errors from Gemini (code 1008) are NOT recoverable
            // They indicate an API limitation, not a transient failure
            const lowerError = errorMessage.toLowerCase();
            const isRecoverableError = (lowerError.includes('timeout') && !lowerError.includes('not implemented')) ||
                                       lowerError.includes('connection reset') ||
                                       lowerError.includes('temporarily unavailable');

            if (isRecoverableError && reconnectAttemptsRef.current < maxReconnectAttempts && !isReconnectingRef.current) {
              console.log(`Recoverable error detected, attempting reconnect (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})...`);
              isReconnectingRef.current = true;
              reconnectAttemptsRef.current++;
              ws.close();

              // Wait a moment before reconnecting
              setTimeout(() => {
                connectInternal(true);
              }, 1000);
              return;
            }

            // For non-recoverable errors like "not implemented", check if it's a session limit
            console.log('Non-recoverable API error, not attempting reconnect:', errorMessage);

            // Check if this is a Gemini session limit (code 1008 with "not implemented")
            // In this case, trigger the session limit callback so analysis can run
            const isSessionLimit = data.error.geminiCode === 1008 ||
                                   lowerError.includes('not implemented') ||
                                   lowerError.includes('not supported');

            if (isSessionLimit && transcriptRef.current.length > 0) {
              console.log('Gemini session limit reached, triggering analysis callback');
              sessionEndedIntentionallyRef.current = true; // Prevent reconnect attempts
              reconnectAttemptsRef.current = maxReconnectAttempts;
              ws.close();
              cleanup();
              setStatus('disconnected');
              options.onSessionLimitReached?.();
              return;
            }

            lastErrorRef.current = errorMessage;
            setStatus('error');
            options.onError?.(errorMessage);
            ws.close();
            return;
          }

          // Handle setup complete
          if (data.setupComplete) {
            console.log('Gemini setup complete! Session is ready.');
            setStatus('connected');
            setSessionReady(true);
            setIsListening(true);
            sessionStartedAtRef.current = Date.now(); // Mark session start for barge-in grace period
            options.onConnect?.();

            // Start session duration tracking
            sessionStartTimeRef.current = Date.now();
            durationIntervalRef.current = setInterval(() => {
              if (sessionStartTimeRef.current) {
                const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
                setSessionDuration(elapsed);
              }
            }, 1000);

            // Start batch saving every 30 seconds for resilience
            batchSaveIntervalRef.current = setInterval(() => {
              batchSaveTranscript();
            }, 30000);

            // Session timing - warn Luna to wrap up, then end session
            // Note: No client-side session timer - Gemini manages session duration naturally
            // Session will end with code 1008 when Gemini's limit is reached (10+ minutes)
            // This is handled by onSessionLimitReached callback

            // Note: Removed client-side keepalive that was sending empty mediaChunks.
            // The continuous audio stream from the mic keeps the Gemini connection alive,
            // and the edge function has its own keepalive to the client.

            // Reset reconnect attempts on successful connection
            reconnectAttemptsRef.current = 0;
            isReconnectingRef.current = false;

            // Start microphone
            await startMicrophone(ws);

            // Note: Removed Web Speech API - we use Gemini's native transcription instead
            // (inputAudioTranscription and outputAudioTranscription in setup)

            // Send initial prompt to kick off conversation
            let kickoffText: string;
            if (isReconnect) {
              // For reconnects, just continue naturally
              kickoffText = "[La connexion technique a été rétablie. Continue la conversation naturellement là où elle s'était arrêtée, sans mentionner de problème technique.]";
            } else {
              const isReturningUser = contextPromptRef.current.length > 0;
              kickoffText = isReturningUser
                ? "[Session démarrée. C'est quelqu'un que tu connais déjà ! Salue-le/la chaleureusement en utilisant son prénom si tu le connais, fais référence à quelque chose dont vous avez parlé la dernière fois, et demande ce qu'il/elle devient depuis.]"
                : "[Session démarrée. Salue la personne de façon super décontractée, genre tu croises un·e pote, et demande-lui comment ça va, sa journée, un truc léger.]";
            }

            const kickoff = {
              clientContent: {
                turns: [{
                  role: "user",
                  parts: [{ text: kickoffText }],
                }],
                turnComplete: true,
              },
            };
            ws.send(JSON.stringify(kickoff));
            return;
          }

          // Handle input transcription (user's speech converted to text)
          // Accumulate chunks - they'll be committed when we detect a role change or turn end
          if (data.serverContent?.inputTranscription?.text) {
            const userText = data.serverContent.inputTranscription.text;
            // Commit any pending assistant text first (role change)
            if (pendingOutputTranscriptRef.current.trim()) {
              const newMessage: TranscriptMessage = {
                role: 'assistant',
                content: pendingOutputTranscriptRef.current.trim(),
              };
              transcriptRef.current = [...transcriptRef.current, newMessage];
              setTranscript([...transcriptRef.current]);
              options.onTranscript?.(newMessage);
              pendingOutputTranscriptRef.current = '';
            }
            // Accumulate user text
            pendingInputTranscriptRef.current += userText;
          }

          // Handle output transcription (Luna's speech converted to text)
          // Accumulate chunks - they'll be committed when we detect a role change or turn end
          if (data.serverContent?.outputTranscription?.text) {
            const assistantText = data.serverContent.outputTranscription.text;
            // Commit any pending user text first (role change)
            if (pendingInputTranscriptRef.current.trim()) {
              const newMessage: TranscriptMessage = {
                role: 'user',
                content: pendingInputTranscriptRef.current.trim(),
              };
              transcriptRef.current = [...transcriptRef.current, newMessage];
              setTranscript([...transcriptRef.current]);
              options.onTranscript?.(newMessage);
              pendingInputTranscriptRef.current = '';
            }
            // Accumulate assistant text
            pendingOutputTranscriptRef.current += assistantText;
          }

          // Handle server content (audio responses)
          if (data.serverContent) {
            const serverContent = data.serverContent;

            // Check if turn is complete
            if (serverContent.turnComplete) {
              // Commit any pending transcripts
              if (pendingOutputTranscriptRef.current.trim()) {
                const newMessage: TranscriptMessage = {
                  role: 'assistant',
                  content: pendingOutputTranscriptRef.current.trim(),
                };
                transcriptRef.current = [...transcriptRef.current, newMessage];
                setTranscript([...transcriptRef.current]);
                options.onTranscript?.(newMessage);
                pendingOutputTranscriptRef.current = '';
              }
              if (pendingInputTranscriptRef.current.trim()) {
                const newMessage: TranscriptMessage = {
                  role: 'user',
                  content: pendingInputTranscriptRef.current.trim(),
                };
                transcriptRef.current = [...transcriptRef.current, newMessage];
                setTranscript([...transcriptRef.current]);
                options.onTranscript?.(newMessage);
                pendingInputTranscriptRef.current = '';
              }
              setIsSpeaking(false);
              setIsListening(true);
              return;
            }

            // Handle interruption - when user speaks while Luna is talking
            if (serverContent.interrupted) {
              console.log('Received interrupted signal from Gemini - user is speaking');
              // Commit any pending transcripts before clearing
              if (pendingOutputTranscriptRef.current.trim()) {
                const newMessage: TranscriptMessage = {
                  role: 'assistant',
                  content: pendingOutputTranscriptRef.current.trim() + ' [interrompu]',
                };
                transcriptRef.current = [...transcriptRef.current, newMessage];
                setTranscript([...transcriptRef.current]);
                options.onTranscript?.(newMessage);
                pendingOutputTranscriptRef.current = '';
              }
              // Clear playback queue so Luna stops talking
              playbackRef.current?.clear();
              setIsSpeaking(false);
              setIsListening(true);
              // Don't return - continue processing any other data in this message
            }

            // Handle model turn with parts
            if (serverContent.modelTurn && serverContent.modelTurn.parts) {
              for (const part of serverContent.modelTurn.parts) {
                // Handle audio data
                if (part.inlineData && part.inlineData.mimeType?.includes("audio")) {
                  setIsSpeaking(true);
                  setIsListening(false);
                  playbackRef.current?.addPcmData(part.inlineData.data);
                }

                // Note: We ignore part.text here because it contains internal model reasoning
                // (e.g., "**Initiating Contact**" thinking blocks) rather than actual speech.
                // The real spoken transcript comes via data.serverContent.outputTranscription.text
                // which is handled earlier in the message handler.
              }
            }
          }

        } catch (error) {
          console.error('Error parsing Gemini message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        lastErrorRef.current = 'Connection error';
        setStatus('error');
        options.onError?.('Connection error');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);

        // Clear keepalive interval
        if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current);
          keepAliveIntervalRef.current = null;
        }

        // Check if this is Gemini's session limit (code 1008)
        // This is NOT an error - it's Gemini's built-in max session duration (~5-10 min)
        const isGeminiSessionLimit = event.code === 1008;
        if (isGeminiSessionLimit) {
          console.log('Gemini session limit reached (1008) - triggering analysis');
          sessionEndedIntentionallyRef.current = true;
          reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent reconnect
          cleanup();
          setStatus('disconnected');
          options.onSessionLimitReached?.();
          options.onDisconnect?.();
          return;
        }

        // Don't cleanup if we're reconnecting
        if (!isReconnectingRef.current) {
          cleanup();
        }

        const abnormal = event.code !== 1000;
        if (abnormal && !isReconnectingRef.current && !sessionEndedIntentionallyRef.current) {
          // Try to reconnect on abnormal closure if we have conversation context
          // But NOT if the session was intentionally ended by the server
          if (transcriptRef.current.length > 0 && reconnectAttemptsRef.current < maxReconnectAttempts) {
            console.log(`Abnormal closure detected, attempting reconnect (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})...`);
            isReconnectingRef.current = true;
            reconnectAttemptsRef.current++;

            // Wait a moment before reconnecting
            setTimeout(() => {
              connectInternal(true);
            }, 1500);
            return;
          }

          setStatus('error');
          if (!lastErrorRef.current) {
            const reason = event.reason || 'Connection closed unexpectedly';
            // Parse common errors
            if (reason.toLowerCase().includes('quota') || reason.toLowerCase().includes('billing')) {
              options.onError?.('API quota exceeded - check your Google AI billing');
            } else {
              options.onError?.(reason);
            }
          }
        } else if (!isReconnectingRef.current) {
          setStatus('disconnected');
          options.onDisconnect?.();
        }

        lastErrorRef.current = null;
      };

    } catch (error) {
      console.error('Failed to connect:', error);
      setStatus('error');
      isReconnectingRef.current = false;
      options.onError?.(error instanceof Error ? error.message : 'Failed to connect');
    }
  }, [options, startMicrophone, buildConversationSummary, batchSaveTranscript]);

  // Public connect function
  const connect = useCallback(async () => {
    if (status === 'connecting' || status === 'connected') {
      return;
    }
    reconnectAttemptsRef.current = 0;
    isReconnectingRef.current = false;
    await connectInternal(false);
  }, [status, connectInternal]);

  const cleanup = useCallback(() => {
    micRef.current?.stop();
    micRef.current = null;

    playbackRef.current?.close();
    playbackRef.current = null;

    setIsSpeaking(false);
    setIsListening(false);
    setSessionReady(false);
    setMicLevel(0);
  }, []);

  const disconnect = useCallback(async (intentional: boolean = true) => {
    // Mark as intentional disconnect to prevent auto-reconnect
    // This is crucial - without this, the onclose handler will try to reconnect!
    if (intentional) {
      sessionEndedIntentionallyRef.current = true;
      reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent any reconnect attempts
    }

    // IMMEDIATELY close WebSocket and stop audio - don't wait for async operations
    if (wsRef.current) {
      wsRef.current.close(1000, 'User ended session');
      wsRef.current = null;
    }
    cleanup();
    setStatus('disconnected');
    options.onDisconnect?.();

    // Stop duration tracking
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    sessionStartTimeRef.current = null;

    // Stop batch save interval
    if (batchSaveIntervalRef.current) {
      clearInterval(batchSaveIntervalRef.current);
      batchSaveIntervalRef.current = null;
    }

    // Stop keepalive interval
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }

    // Async operations happen AFTER disconnect - don't block UI
    // Final batch save
    await batchSaveTranscript();

    // End session in database with stats
    if (sessionRef.current && userIdRef.current) {
      const stats: SessionStats = {
        durationSeconds: sessionDuration,
        provider: 'gemini'
      };
      await endSession(sessionRef.current.id, userIdRef.current, stats);
      sessionRef.current = null;
    }
  }, [cleanup, batchSaveTranscript, sessionDuration, options]);

  const getTranscript = useCallback(() => {
    return transcriptRef.current;
  }, []);

  // Mic sensitivity control - updates the noise gate threshold on the live mic instance
  const setMicSensitivity = useCallback((threshold: number) => {
    micRef.current?.setNoiseGateThreshold(threshold);
    // Also persist for future MicrophoneCapture instances
    localStorage.setItem('micNoiseGateThreshold', Math.max(0, Math.min(1, threshold)).toString());
  }, []);

  const getMicSensitivity = useCallback((): number => {
    return micRef.current?.getNoiseGateThreshold() ?? parseFloat(localStorage.getItem('micNoiseGateThreshold') || '0.01');
  }, []);

  return {
    connect,
    disconnect,
    status,
    isSpeaking,
    isListening,
    sessionReady,
    micLevel,
    transcript,
    getTranscript,
    sessionNumber,
    sessionDuration,
    currentScenario,
    scenariosCovered, // Scenarios explored this session - pass to analyze-profile
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    setMicSensitivity,
    getMicSensitivity,
  };
}
