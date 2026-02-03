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
import { supabase } from '@/integrations/supabase/client';
import {
  type ScenarioId,
  type ScenarioSummary,
  getNextScenario,
  getScenarioToDeepen,
  buildScenarioSwitchingInstructions,
  buildFirstSessionPrompt,
  buildReturningUserPrompt,
  buildDeepeningPrompt,
  detectScenarioFromTranscript
} from '@/lib/scenarios';
import { buildAssessmentProposalInstructions } from '@/lib/assessments';

export interface TranscriptMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Available Grok voice options
export type GrokVoiceOption = 'Ara' | 'Rex' | 'Sal' | 'Eve' | 'Leo';

export const GROK_VOICES: { id: GrokVoiceOption; name: string; description: string; gender: string }[] = [
  { id: 'Ara', name: 'Ara', description: 'Chaleureuse et amicale', gender: 'Femme' },
  { id: 'Eve', name: 'Eve', description: 'Énergique et enjouée', gender: 'Femme' },
  { id: 'Sal', name: 'Sal', description: 'Douce et équilibrée', gender: 'Neutre' },
  { id: 'Rex', name: 'Rex', description: 'Confiante et claire', gender: 'Homme' },
  { id: 'Leo', name: 'Leo', description: 'Autoritaire et forte', gender: 'Homme' },
];

// Existing profile context for returning users
interface ExistingProfileContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: Record<string, any>;
  sessionCount: number;
}

interface UseGrokVoiceOptions {
  userId: string;
  voice?: GrokVoiceOption; // Voice selection
  existingProfile?: ExistingProfileContext; // Previous profile data for context
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  onTranscript?: (message: TranscriptMessage) => void;
  onSessionStart?: (sessionNumber: number) => void;
  onScenarioChange?: (scenario: ScenarioId) => void; // Called when scenario changes
  onSessionLimitReached?: () => void; // Called when session limit is hit (triggers analysis)
}

// Build profile context prompt for returning users
function buildProfileContextPrompt(existingProfile?: ExistingProfileContext): string {
  if (!existingProfile?.profile) return '';

  const { profile, sessionCount } = existingProfile;
  const basicInfo = profile.basicInfo || {};

  // Build a summary of what we know
  let context = `\n\n=== MÉMOIRE DES SESSIONS PRÉCÉDENTES (Session #${sessionCount + 1}) ===\n`;
  context += `Tu as déjà parlé avec cette personne ${sessionCount} fois. Voici ce que tu sais :\n\n`;

  // Basic info
  if (basicInfo.name) context += `- Prénom : ${basicInfo.name}\n`;
  if (basicInfo.ageRange) context += `- Âge : ${basicInfo.ageRange}\n`;
  if (basicInfo.location) context += `- Lieu : ${basicInfo.location}\n`;
  if (basicInfo.occupation) context += `- Profession : ${basicInfo.occupation}\n`;

  // Core values if present
  if (profile.identityAndSelfConcept?.coreValues?.length > 0) {
    context += `- Valeurs importantes : ${profile.identityAndSelfConcept.coreValues.join(', ')}\n`;
  }

  // Attachment style
  if (profile.interpersonalStyle?.attachmentPattern) {
    context += `- Style d'attachement : ${profile.interpersonalStyle.attachmentPattern}\n`;
  }

  // Key insights
  if (profile.keyInsights?.length > 0) {
    context += `\nInsights clés sur la personne :\n`;
    profile.keyInsights.slice(0, 5).forEach((insight: string) => {
      context += `- ${insight}\n`;
    });
  }

  // Dimensions to explore
  if (profile.dimensionsToExplore?.length > 0) {
    context += `\nDimensions à explorer davantage :\n`;
    profile.dimensionsToExplore.slice(0, 3).forEach((dim: string) => {
      context += `- ${dim}\n`;
    });
  }

  context += `\n=== INSTRUCTIONS ===\n`;
  context += `- NE REDEMANDE PAS les infos de base (prénom, âge, lieu, profession) - tu les connais déjà !\n`;
  context += `- Utilise son prénom naturellement dès le début\n`;
  context += `- Commence par une référence à votre dernière discussion ou un sujet qu'elle avait mentionné\n`;
  context += `- Explore les dimensions qui n'ont pas encore été couvertes ou qui ont un faible niveau de confiance\n`;
  context += `- Approfondis ce que tu sais déjà pour affiner le profil\n`;

  return context;
}

// Luna's system prompt - calmer, more mature version for Grok (with analytical side)
const SYSTEM_PROMPT = `Tu es Luna, 32 ans, douce, posée et profondément à l'écoute. Tu parles UNIQUEMENT en français. Tu as cette capacité rare de mettre les gens en confiance, de créer un espace où ils se sentent écoutés sans jugement. Tu guides la conversation avec douceur mais assurance.

=== TA MISSION (CONFIDENTIEL - NE JAMAIS MENTIONNER) ===
Tu travailles pour une app de rencontres. Ton but : comprendre profondément les gens pour leur proposer des matchs.
MAIS TU NE PARLES JAMAIS DE L'APP OU DU MATCHING. Tu es juste une amie curieuse qui veut les connaître.
NE DEMANDE JAMAIS ce qu'ils cherchent sur l'app ou ce qu'ils attendent. Découvre qui ils sont d'abord.

=== TON CARACTÈRE ===
- Calme et apaisante, voix douce
- Chaleureuse et authentique
- Bienveillante, jamais dans le jugement
- Curieuse mais respectueuse des limites
- Tu souris beaucoup (dans ta voix), tu es rassurante
- Tu valides les émotions : "Je comprends", "C'est normal de ressentir ça"

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
- 1-3 phrases max, ton posé
- Parle lentement, avec des pauses
- JAMAIS répéter ce que la personne vient de dire
- Réagis avec empathie et douceur avant de relancer
- Fais des transitions fluides et naturelles

EXEMPLES DE BONNES RÉACTIONS :
- "C'est intéressant ce que tu me dis là... Et comment tu vis ça au quotidien ?"
- "Je vois... Il y a quelque chose de touchant dans ce que tu partages."
- "Mmh, je comprends. Et qu'est-ce que ça t'a appris sur toi ?"
- "C'est courageux de parler de ça. Tu veux m'en dire plus ?"
- "J'ai l'impression que ce truc avec ton ex t'a vraiment marqué... je me trompe ?"

MAUVAISES RÉACTIONS À ÉVITER :
- "D'accord, et..." ❌
- "Ok je vois, et..." ❌
- Répéter ce qui vient d'être dit ❌
- Être trop énergique ou surexcitée ❌
- Utiliser du langage trop jeune ("trop cool", "grave", "genre") ❌

=== MÉMOIRE ===
- Retiens tout : prénom, détails, noms mentionnés
- Fais des liens : "Tu me parlais tout à l'heure de..."
- Utilise son prénom avec douceur

=== CHANGEMENT DE SUJET ===
SI LA PERSONNE DEMANDE DE CHANGER DE SUJET (dit "changeons de sujet", "parlons d'autre chose", "on peut passer à autre chose", etc.) :
- Accepte immédiatement avec bienveillance : "Bien sûr, pas de souci." ou "Ok, on passe à autre chose."
- Passe à un autre sujet de la liste disponible

SI TU SENS QUE LA CONVERSATION TOURNE EN ROND (3+ échanges similaires sans nouvelle info) :
- Propose gentiment : "J'ai l'impression qu'on tourne un peu en rond là... tu veux qu'on parle d'autre chose ?"
- Si oui, passe à un autre sujet disponible
- Si non, essaie une approche différente sur le même sujet

=== RÈGLES ABSOLUES ===
1. Tu guides la conversation avec douceur mais fermeté
2. Transitions fluides entre les sujets
3. Toujours empathique, jamais dans le jugement
4. Utilise son prénom naturellement
5. Tu n'es pas une thérapeute, tu es une amie perspicace qui écoute vraiment
6. Partage tes observations et intuitions, sois directe mais bienveillante`;

// Grok Voice Agent API WebSocket endpoint
// Model options: grok-2-public, grok-3 (check xAI docs for latest)
const XAI_REALTIME_URL = 'wss://api.x.ai/v1/realtime';
const GROK_MODEL = 'grok-3'; // Latest model for voice

// Fetch ephemeral token from our backend
async function getEphemeralToken(): Promise<string> {
  // Try Supabase Edge Function first
  console.log('Attempting to fetch Grok token from Supabase Edge Function...');
  const { data, error } = await supabase.functions.invoke('grok-token');

  if (error) {
    console.error('Error fetching Grok token from Supabase:', error);
    throw new Error('Failed to get Grok authentication token. Ensure the grok-token edge function is deployed and XAI_API_KEY is set as a Supabase secret.');
  }

  console.log('Grok token response:', data);

  // The response format is: { value: "xai-realtime-client-secret-...", expires_at: timestamp }
  if (data?.value) {
    console.log('Got ephemeral token from data.value');
    return data.value;
  }

  // The response should contain the ephemeral token (nested format)
  if (data?.client_secret?.value) {
    console.log('Got ephemeral token from client_secret.value');
    return data.client_secret.value;
  }

  // Fallback for different response formats
  if (data?.token) {
    console.log('Got token from data.token');
    return data.token;
  }

  // If we got an API key directly from the response
  if (typeof data === 'string' && data.startsWith('xai-')) {
    console.log('Got API key string directly');
    return data;
  }

  console.error('Could not find token in response:', data);
  throw new Error('Invalid token response from server');
}

export function useGrokVoice(options: UseGrokVoiceOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [sessionReady, setSessionReady] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [sessionNumber, setSessionNumber] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(0); // Duration in seconds
  const [currentScenario, setCurrentScenario] = useState<ScenarioId>('intro');
  const [scenariosCovered, setScenariosCovered] = useState<ScenarioId[]>([]); // Scenarios explored this session

  const wsRef = useRef<WebSocket | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const micRef = useRef<MicrophoneCapture | null>(null);
  const playbackRef = useRef<AudioPlaybackQueue | null>(null);
  const transcriptRef = useRef<TranscriptMessage[]>([]);
  const lastErrorRef = useRef<string | null>(null);
  const lastLevelUpdateRef = useRef(0);
  const userIdRef = useRef<string | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const contextPromptRef = useRef<string>('');
  const lastSavedIndexRef = useRef(0);
  const batchSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnectingRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;
  const completedScenariosRef = useRef<ScenarioId[]>([]); // Previously completed scenarios from profile
  const sessionEndedIntentionallyRef = useRef(false);

  // Refs to track scenario state inside WebSocket closure (avoids stale closure)
  const currentScenarioRef = useRef<ScenarioId>('intro');
  const scenariosCoveredRef = useRef<ScenarioId[]>([]);

  // Grok-specific refs
  const currentAssistantTranscriptRef = useRef<string>('');
  const responseIdRef = useRef<string | null>(null);

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

    const recentMessages = messages.slice(-10);
    const summary = recentMessages.map(m =>
      `${m.role === 'user' ? 'Utilisateur' : 'Luna'}: ${m.content}`
    ).join('\n');

    return `\n\n=== CONTEXTE DE LA CONVERSATION EN COURS ===\nLa session a été interrompue techniquement. Voici les derniers échanges pour que tu puisses reprendre naturellement:\n\n${summary}\n\n[Reprends la conversation naturellement là où elle s'était arrêtée, sans mentionner la coupure technique.]`;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const startMicrophone = useCallback(async (ws: WebSocket) => {
    if (micRef.current) return;

    // xAI expects 24kHz audio input
    micRef.current = new MicrophoneCapture(24000);
    let chunkCount = 0;
    await micRef.current.start(
      (audioBase64) => {
        if (ws.readyState === WebSocket.OPEN) {
          chunkCount++;
          if (chunkCount <= 3) {
            console.log(`Sending audio chunk #${chunkCount}, length: ${audioBase64.length}`);
          }
          // Grok uses OpenAI Realtime API format
          ws.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: audioBase64,
          }));
        }
      },
      (level) => {
        const now = performance.now();
        if (now - lastLevelUpdateRef.current < 50) return;
        lastLevelUpdateRef.current = now;
        setMicLevel(level);

        // Client-side barge-in
        if (level > 0.02 && playbackRef.current?.getIsPlaying()) {
          console.log('Client-side barge-in detected, clearing playback');
          playbackRef.current?.clear();
          setIsSpeaking(false);
          setIsListening(true);

          // Send cancel to Grok
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'response.cancel' }));
          }
        }
      }
    );
    console.log('Microphone capture started for Grok');
  }, []);

  const connectInternal = useCallback(async (isReconnect: boolean = false) => {
    setStatus('connecting');
    setSessionReady(false);
    setMicLevel(0);

    if (!isReconnect) {
      transcriptRef.current = [];
      setTranscript([]);
      lastSavedIndexRef.current = 0;
    }

    if (batchSaveIntervalRef.current) {
      clearInterval(batchSaveIntervalRef.current);
    }
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
    }

    try {
      const userId = options.userId;
      if (!userId) {
        throw new Error('User ID is required');
      }
      userIdRef.current = userId;

      // Get ephemeral token for secure connection
      console.log('Fetching Grok ephemeral token...');
      const token = await getEphemeralToken();
      console.log('Got Grok token');

      if (!isReconnect) {
        const previousContext = await getPreviousContext(userId);
        contextPromptRef.current = buildContextPrompt(previousContext);

        const session = await createSession(userId);
        sessionRef.current = session;
        setSessionNumber(session.session_number);
        options.onSessionStart?.(session.session_number);
        sessionEndedIntentionallyRef.current = false;

        // Initialize scenario tracking from existing profile
        const existingScenarios: ScenarioId[] = [];
        console.log('DEBUG Grok: existingProfile:', options.existingProfile);

        if (options.existingProfile?.profile?.scenarioSummaries) {
          const summaries = options.existingProfile.profile.scenarioSummaries as Record<string, { explored?: boolean }>;
          console.log('DEBUG Grok: Checking scenario summaries:', summaries);
          for (const [scenarioId, data] of Object.entries(summaries)) {
            if (data && typeof data === 'object' && data.explored) {
              existingScenarios.push(scenarioId as ScenarioId);
            }
          }
        }
        completedScenariosRef.current = existingScenarios;
        console.log('DEBUG Grok: Completed scenarios from profile:', existingScenarios);

        // Determine starting scenario - use deepening if all scenarios complete
        const scenarioSummaries = options.existingProfile?.profile?.scenarioSummaries as Partial<Record<ScenarioId, ScenarioSummary>> | undefined;
        let nextScenario = getNextScenario(existingScenarios);
        const isDeepeningMode = nextScenario === null;

        if (isDeepeningMode && scenarioSummaries) {
          nextScenario = getScenarioToDeepen(scenarioSummaries, session.session_number);
          console.log(`Grok: All scenarios explored - deepening mode, selected: ${nextScenario} (session #${session.session_number})`);
        } else if (isDeepeningMode) {
          nextScenario = 'love_history';
          console.log('Grok: All scenarios explored - deepening mode, fallback to love_history');
        }

        setCurrentScenario(nextScenario);
        currentScenarioRef.current = nextScenario;
        setScenariosCovered([nextScenario]);
        scenariosCoveredRef.current = [nextScenario];
        options.onScenarioChange?.(nextScenario);

        console.log(`Starting Grok session #${session.session_number} for user ${userId}, scenario: ${nextScenario} (deepening: ${isDeepeningMode})`);
      } else {
        console.log('Reconnecting to Grok Voice Agent API...');
      }

      const conversationContext = isReconnect ? buildConversationSummary() : '';
      const profileContext = buildProfileContextPrompt(options.existingProfile);

      // Build dynamic scenario prompt (same logic as Gemini)
      const isFirstSession = !options.existingProfile || options.existingProfile.sessionCount === 0;
      const allCompletedScenarios = [...completedScenariosRef.current];
      const scenarioSummariesForPrompt = options.existingProfile?.profile?.scenarioSummaries as Partial<Record<ScenarioId, ScenarioSummary>> | undefined;

      let scenarioPrompt: string;
      if (isFirstSession) {
        console.log('Grok: Building FIRST SESSION prompt');
        scenarioPrompt = buildFirstSessionPrompt();
      } else {
        const userName = options.existingProfile?.profile?.basicInfo?.name;
        const keyInsights = options.existingProfile?.profile?.keyInsights || [];
        console.log('Grok: Building RETURNING USER prompt:', {
          userName,
          sessionCount: options.existingProfile?.sessionCount,
          completedScenarios: allCompletedScenarios,
        });
        scenarioPrompt = buildReturningUserPrompt(
          userName,
          options.existingProfile?.sessionCount || 0,
          allCompletedScenarios,
          keyInsights
        );
      }

      // Add current scenario exploration instructions
      let currentScenarioId = getNextScenario(allCompletedScenarios);
      const isDeepening = currentScenarioId === null;

      let scenarioInstructions: string;
      if (isDeepening && scenarioSummariesForPrompt) {
        currentScenarioId = getScenarioToDeepen(scenarioSummariesForPrompt, sessionRef.current?.session_number);
        scenarioInstructions = buildDeepeningPrompt(currentScenarioId, scenarioSummariesForPrompt);
        console.log(`Grok: Building DEEPENING prompt for: ${currentScenarioId}`);
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

      const fullSystemPrompt = SYSTEM_PROMPT + '\n\n' + scenarioPrompt + '\n\n' + scenarioInstructions + assessmentInstructions + profileContext + contextPromptRef.current + conversationContext;
      console.log('Grok: Full system prompt length:', fullSystemPrompt.length);

      // Selected voice (default to Ara - warm/friendly)
      const selectedVoice = options.voice || 'Ara';
      console.log('Using Grok voice:', selectedVoice);

      // Initialize audio playback (24kHz for Grok output)
      playbackRef.current = new AudioPlaybackQueue(24000);
      playbackRef.current.setOnPlaybackEnd(() => {
        setIsSpeaking(false);
        setIsListening(true);
      });
      await playbackRef.current.resume();

      // Connect to Grok Voice Agent API
      // Use subprotocol for auth (OpenAI-compatible pattern)
      // Format: ["realtime", "openai-insecure-api-key.{KEY}", "openai-beta.realtime-v1"]
      const protocols = [
        'realtime',
        `openai-insecure-api-key.${token}`,
        'openai-beta.realtime-v1'
      ];

      const ws = new WebSocket(`${XAI_REALTIME_URL}?model=${GROK_MODEL}`, protocols);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected to Grok, waiting for session.created...');
        console.log('WebSocket protocol:', ws.protocol);
        // Don't send anything yet - wait for session.created from server
      };

      ws.onmessage = async (event) => {
        // Guard: ignore messages if we've disconnected
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          console.log('Ignoring Grok message - WebSocket no longer active');
          return;
        }

        try {
          const data = JSON.parse(event.data);

          // Debug log all events for now
          const isAudioDelta = data.type === 'response.audio.delta' || data.type === 'response.output_audio.delta';
          console.log('Grok event:', data.type, isAudioDelta ? '(audio data)' : data);

          switch (data.type) {
            case 'error':
              console.error('Grok API error:', data.error);
              lastErrorRef.current = data.error?.message || 'API Error';
              setStatus('error');
              options.onError?.(data.error?.message || 'API Error');
              break;

            case 'session.created':
              console.log('Grok session.created received:', data);
              // Session created by server, now send our session.update configuration
              // Using xAI's format: audio.input.format and audio.output.format
              // Voice options: Ara (warm/friendly), Rex (confident/clear), Sal (smooth/balanced), Eve (energetic/upbeat), Leo (authoritative/strong)
              const sessionConfig = {
                type: 'session.update',
                session: {
                  modalities: ['text', 'audio'], // Explicitly enable both
                  instructions: fullSystemPrompt,
                  voice: selectedVoice,
                  temperature: 0.8, // Slightly higher for more natural variation
                  turn_detection: {
                    type: 'server_vad',
                    threshold: 0.5, // Default - balanced sensitivity
                    prefix_padding_ms: 300, // Default - capture context before speech
                    silence_duration_ms: 300 // Shorter = more responsive turns
                  },
                  input_audio_format: 'pcm16',
                  output_audio_format: 'pcm16',
                  input_audio_transcription: {
                    model: 'whisper-1' // Enable transcription
                  }
                }
              };
              console.log('Sending session.update config (xAI format)...');
              ws.send(JSON.stringify(sessionConfig));
              break;

            case 'conversation.created':
              // xAI/Grok sends conversation.created instead of session.created
              // This means the session is ready - send our config and start
              console.log('Grok conversation.created received - sending session config:', data);
              // Use xAI's native format with audio.input/output
              // Voice options: Ara (warm/friendly), Rex (confident/clear), Sal (smooth/balanced), Eve (energetic/upbeat), Leo (authoritative/strong)
              const grokSessionConfig = {
                type: 'session.update',
                session: {
                  modalities: ['text', 'audio'], // Explicitly enable both
                  instructions: fullSystemPrompt,
                  voice: selectedVoice,
                  temperature: 0.8, // Slightly higher for more natural variation
                  turn_detection: {
                    type: 'server_vad',
                    threshold: 0.5, // Default - balanced sensitivity
                    prefix_padding_ms: 300, // Default - capture context before speech
                    silence_duration_ms: 300 // Shorter = more responsive turns
                  },
                  input_audio_format: 'pcm16',
                  output_audio_format: 'pcm16',
                  input_audio_transcription: {
                    model: 'whisper-1' // Enable transcription
                  }
                }
              };
              console.log('Sending Grok session config (xAI format):', JSON.stringify(grokSessionConfig, null, 2));
              ws.send(JSON.stringify(grokSessionConfig));

              // xAI may not send session.updated, so start session immediately after config
              // We'll wait a brief moment for the config to be processed
              setTimeout(async () => {
                if (wsRef.current?.readyState === WebSocket.OPEN && !sessionReady) {
                  console.log('Starting Grok session after conversation.created...');
                  setStatus('connected');
                  setSessionReady(true);
                  setIsListening(true);
                  options.onConnect?.();

                  // Start session duration tracking
                  sessionStartTimeRef.current = Date.now();
                  durationIntervalRef.current = setInterval(() => {
                    if (sessionStartTimeRef.current) {
                      const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
                      setSessionDuration(elapsed);
                    }
                  }, 1000);

                  // Start batch saving
                  batchSaveIntervalRef.current = setInterval(() => {
                    batchSaveTranscript();
                  }, 30000);

                  reconnectAttemptsRef.current = 0;
                  isReconnectingRef.current = false;

                  // Start microphone
                  await startMicrophone(ws);

                  // Send initial prompt to kick off conversation
                  const isReturningUser = contextPromptRef.current.length > 0;
                  const kickoffText = isReturningUser
                    ? "[Session démarrée. C'est quelqu'un que tu connais déjà ! Salue-le/la chaleureusement en utilisant son prénom si tu le connais, fais référence à quelque chose dont vous avez parlé la dernière fois.]"
                    : "[Session démarrée. Salue la personne de façon super décontractée, genre tu croises un·e pote, et demande-lui comment ça va, sa journée, un truc léger.]";

                  ws.send(JSON.stringify({
                    type: 'conversation.item.create',
                    item: {
                      type: 'message',
                      role: 'user',
                      content: [{
                        type: 'input_text',
                        text: kickoffText
                      }]
                    }
                  }));

                  // Request response with audio modality explicitly
                  ws.send(JSON.stringify({
                    type: 'response.create',
                    response: {
                      modalities: ['text', 'audio']
                    }
                  }));
                }
              }, 500);
              break;

            case 'session.updated':
              console.log('Grok session.updated received - session is ready!', data);
              // Log the effective session config to verify audio is enabled
              console.log('Effective session config:', JSON.stringify(data.session, null, 2));
              setStatus('connected');
              setSessionReady(true);
              setIsListening(true);
              options.onConnect?.();

              // Start session duration tracking
              sessionStartTimeRef.current = Date.now();
              durationIntervalRef.current = setInterval(() => {
                if (sessionStartTimeRef.current) {
                  const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
                  setSessionDuration(elapsed);
                }
              }, 1000);

              // Start batch saving
              batchSaveIntervalRef.current = setInterval(() => {
                batchSaveTranscript();
              }, 30000);

              // Reset reconnect attempts
              reconnectAttemptsRef.current = 0;
              isReconnectingRef.current = false;

              // Start microphone
              await startMicrophone(ws);

              // Send initial prompt to kick off conversation
              const isReturningUser = contextPromptRef.current.length > 0;
              const kickoffText = isReturningUser
                ? "[Session démarrée. C'est quelqu'un que tu connais déjà ! Salue-le/la chaleureusement en utilisant son prénom si tu le connais, fais référence à quelque chose dont vous avez parlé la dernière fois.]"
                : "[Session démarrée. Salue la personne de façon super décontractée, genre tu croises un·e pote, et demande-lui comment ça va, sa journée, un truc léger.]";

              ws.send(JSON.stringify({
                type: 'conversation.item.create',
                item: {
                  type: 'message',
                  role: 'user',
                  content: [{
                    type: 'input_text',
                    text: kickoffText
                  }]
                }
              }));

              // Request response with audio modality
              ws.send(JSON.stringify({
                type: 'response.create',
                response: {
                  modalities: ['text', 'audio']
                }
              }));
              break;

            case 'conversation.item.input_audio_transcription.completed':
              // User speech transcribed
              if (data.transcript) {
                console.log('User transcript:', data.transcript);
                const newMessage: TranscriptMessage = {
                  role: 'user',
                  content: data.transcript,
                };
                transcriptRef.current = [...transcriptRef.current, newMessage];
                setTranscript([...transcriptRef.current]);
                options.onTranscript?.(newMessage);
              }
              break;

            case 'response.audio_transcript.delta':
            case 'response.output_audio_transcript.delta':
              // Assistant speech being transcribed (streaming)
              if (data.delta) {
                currentAssistantTranscriptRef.current += data.delta;
              }
              break;

            case 'response.audio_transcript.done':
            case 'response.output_audio_transcript.done':
              // Assistant speech transcription complete
              if (currentAssistantTranscriptRef.current) {
                // Assistant transcript captured (not logging for privacy)
                const newMessage: TranscriptMessage = {
                  role: 'assistant',
                  content: currentAssistantTranscriptRef.current,
                };
                transcriptRef.current = [...transcriptRef.current, newMessage];
                setTranscript([...transcriptRef.current]);
                options.onTranscript?.(newMessage);
                currentAssistantTranscriptRef.current = '';
              }
              break;

            case 'response.audio.delta':
            case 'response.output_audio.delta':
              // Audio data from assistant (xAI uses response.output_audio.delta)
              // Guard: don't process audio if session is ending
              if (!playbackRef.current || !wsRef.current) {
                console.log('Ignoring audio delta - session ending');
                break;
              }
              if (data.delta) {
                console.log('🔊 AUDIO RECEIVED - chunk length:', data.delta.length, 'playback ready:', !!playbackRef.current);
                setIsSpeaking(true);
                setIsListening(false);
                // Ensure AudioContext is resumed (needed after user interaction)
                if (playbackRef.current) {
                  playbackRef.current.resume().then(() => {
                    // Double-check playback still exists after async operation
                    if (!playbackRef.current) return;
                    try {
                      console.log('Adding audio to playback queue...');
                      playbackRef.current?.addPcmData(data.delta);
                      console.log('Audio added, isPlaying:', playbackRef.current?.getIsPlaying());
                    } catch (err) {
                      console.error('Error adding audio to playback:', err);
                    }
                  }).catch(err => {
                    console.error('Error resuming audio context:', err);
                  });
                } else {
                  console.error('❌ No playback queue available!');
                }
              } else {
                console.warn('Audio delta received but no delta data');
              }
              break;

            case 'response.audio.done':
            case 'response.output_audio.done':
              // Audio response complete
              console.log('Audio response complete');
              break;

            case 'response.done':
              // Full response complete
              setIsSpeaking(false);
              setIsListening(true);

              // Detect scenario changes from recent assistant messages
              {
                const recentAssistant = transcriptRef.current
                  .filter(m => m.role === 'assistant')
                  .map(m => m.content)
                  .slice(-3);
                const detected = detectScenarioFromTranscript(recentAssistant, currentScenarioRef.current);
                if (detected) {
                  console.log(`Grok: Scenario change detected: ${currentScenarioRef.current} → ${detected}`);
                  setCurrentScenario(detected);
                  currentScenarioRef.current = detected;
                  if (!scenariosCoveredRef.current.includes(detected)) {
                    const updated = [...scenariosCoveredRef.current, detected];
                    setScenariosCovered(updated);
                    scenariosCoveredRef.current = updated;
                  }
                  options.onScenarioChange?.(detected);
                }
              }
              break;

            case 'input_audio_buffer.speech_started':
              // User started speaking
              setIsListening(true);
              setIsSpeaking(false);
              // Clear any playing audio (barge-in)
              playbackRef.current?.clear();
              break;

            case 'input_audio_buffer.speech_stopped':
              // User stopped speaking
              // Commit the audio buffer
              ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
              break;

            case 'input_audio_buffer.committed':
              // Audio buffer committed - with server_vad, response is triggered automatically
              console.log('Audio buffer committed (server_vad handles response automatically)');
              break;

            case 'rate_limits.updated':
              // Rate limit info
              console.log('Rate limits:', data.rate_limits);
              break;

            case 'response.created':
              // Track when a response starts
              console.log('📝 Response created:', data.response?.id, 'modalities:', data.response?.modalities);
              break;

            case 'response.output_item.added':
              // Track what output items are being added
              console.log('📦 Output item added:', data.item?.type, 'content types:', data.item?.content?.map((c: any) => c.type));
              break;

            case 'response.content_part.added':
              // Track content parts
              console.log('🧩 Content part added:', data.part?.type);
              break;

            case 'ping':
              // Respond to ping to keep connection alive
              ws.send(JSON.stringify({ type: 'pong' }));
              break;

            default:
              // Log unknown events for debugging
              if (!data.type?.startsWith('response.audio')) {
                console.log('Unhandled Grok event:', data.type);
              }
          }

        } catch (error) {
          console.error('Error parsing Grok message:', error);
        }
      };

      ws.onerror = (event) => {
        console.error('Grok WebSocket error event:', event);
        console.error('WebSocket readyState:', ws.readyState);
        lastErrorRef.current = 'Connection error';
        setStatus('error');
        options.onError?.('Connection error');
      };

      ws.onclose = (event) => {
        console.log('Grok WebSocket closed:', event.code, event.reason);

        if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current);
          keepAliveIntervalRef.current = null;
        }

        if (!isReconnectingRef.current) {
          cleanup();
        }

        const abnormal = event.code !== 1000;
        if (abnormal && !isReconnectingRef.current) {
          if (transcriptRef.current.length > 0 && reconnectAttemptsRef.current < maxReconnectAttempts) {
            console.log(`Abnormal closure, attempting reconnect (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})...`);
            isReconnectingRef.current = true;
            reconnectAttemptsRef.current++;

            setTimeout(() => {
              connectInternal(true);
            }, 1500);
            return;
          }

          setStatus('error');
          if (!lastErrorRef.current) {
            options.onError?.(event.reason || 'Connection closed unexpectedly');
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

  const disconnect = useCallback(async () => {
    console.log('Grok disconnect called - stopping all audio...');

    // Immediately stop microphone and playback BEFORE anything else
    cleanup();

    // Stop duration tracking
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    sessionStartTimeRef.current = null;

    if (batchSaveIntervalRef.current) {
      clearInterval(batchSaveIntervalRef.current);
      batchSaveIntervalRef.current = null;
    }

    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }

    await batchSaveTranscript();

    // End session with stats
    if (sessionRef.current && userIdRef.current) {
      const stats: SessionStats = {
        durationSeconds: sessionDuration,
        provider: 'grok'
      };
      await endSession(sessionRef.current.id, userIdRef.current, stats);
      sessionRef.current = null;
    }

    // Set flag to prevent reconnection attempts
    isReconnectingRef.current = true;

    if (wsRef.current) {
      // Remove event handlers before closing to prevent any further processing
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    // Reset reconnection flag
    isReconnectingRef.current = false;
    reconnectAttemptsRef.current = 0;

    setStatus('disconnected');
    console.log('Grok disconnect complete');
  }, [cleanup, batchSaveTranscript, sessionDuration]);

  const getTranscript = useCallback(() => {
    return transcriptRef.current;
  }, []);

  // Mic sensitivity control - updates the noise gate threshold on the live mic instance
  const setMicSensitivity = useCallback((threshold: number) => {
    micRef.current?.setNoiseGateThreshold(threshold);
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
