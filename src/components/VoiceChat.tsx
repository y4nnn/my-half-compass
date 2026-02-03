import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AudioEqualizer } from "@/components/ui/AudioEqualizer";
import { Pause, Play, X, Volume2, Loader2, Sparkles, Zap, ChevronLeft, Clock, Bug, MicOff, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useVoice, VoiceProvider, TranscriptMessage, getDefaultProvider, GrokVoiceOption, ExistingProfileContext } from "@/hooks/useVoice";
import type { Scenario } from "@/hooks/useGeminiVoice";
import { GROK_VOICES } from "@/hooks/useGrokVoice";
import { formatDuration, estimateSessionCost } from "@/lib/costEstimation";

interface VoiceChatProps {
  userId: string;
  onComplete: (profileData: any) => void;
  onExit: () => void;
}

type VoiceChatStep = 'provider' | 'grokVoice' | 'ready' | 'conversation';

export function VoiceChat({ userId, onComplete, onExit }: VoiceChatProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Prêt·e à commencer");
  const [selectedProvider, setSelectedProvider] = useState<VoiceProvider | null>(null);
  const [selectedGrokVoice, setSelectedGrokVoice] = useState<GrokVoiceOption | null>(null);
  const [step, setStep] = useState<VoiceChatStep>('provider');
  const [existingProfile, setExistingProfile] = useState<ExistingProfileContext | undefined>(undefined);
  const [showDebug, setShowDebug] = useState(true);
  const [pendingAnalysis, setPendingAnalysis] = useState(false);
  const [wasConnected, setWasConnected] = useState(false);
  const userEndedSessionRef = useRef(false);
  const [micSensitivity, setMicSensitivityState] = useState(() => {
    const saved = localStorage.getItem('micNoiseGateThreshold');
    return saved ? parseFloat(saved) : 0.01;
  });
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);

  // Scenario labels in French for display
  const scenarioLabels: Record<string, string> = {
    intro: "Introduction",
    love_history: "Historique amoureux",
    love_vision: "Vision de l'amour",
    values: "Valeurs",
    family: "Famille",
    emotions: "Émotions",
    lifestyle: "Mode de vie",
    dreams: "Rêves",
    wounds: "Blessures",
    childhood: "Enfance",
    traumas: "Traumatismes",
    work_career: "Vie pro",
    parenting: "Parentalité",
    sexuality: "Intimité"
  };

  // Fetch existing profile on mount
  useEffect(() => {
    async function fetchExistingProfile() {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('profile, session_count')
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        console.log(`Found existing profile (session #${data.session_count}):`, {
          name: data.profile?.basicInfo?.name,
          keyInsights: data.profile?.keyInsights?.slice(0, 3),
          scenarioSummaries: data.profile?.scenarioSummaries ? Object.keys(data.profile.scenarioSummaries) : []
        });
        setExistingProfile({
          profile: data.profile,
          sessionCount: data.session_count
        });
      } else if (error) {
        console.log('No existing profile found:', error.message);
      }
    }
    fetchExistingProfile();
  }, [userId]);

  // Use the unified voice hook with selected provider
  const activeProvider = selectedProvider || getDefaultProvider();

  const {
    connect,
    disconnect,
    status,
    isSpeaking,
    isListening,
    sessionReady,
    micLevel,
    transcript,
    getTranscript,
    isConnected,
    isConnecting,
    provider,
    sessionDuration,
    currentScenario,
    scenariosCovered: hookScenariosCovered,
    setMicSensitivity,
    getMicSensitivity,
  } = useVoice({
    provider: activeProvider,
    userId,
    grokVoice: selectedGrokVoice || undefined,
    existingProfile: existingProfile,
    onConnect: () => {
      console.log(`Connected to ${activeProvider} voice session`);
      setStatusMessage("Connecté - préparation de votre guide...");
      setWasConnected(true);
      setStep('conversation');
    },
    onDisconnect: () => {
      console.log(`Disconnected from ${activeProvider} voice session`);
      setStatusMessage("Session terminée");
      if (wasConnected && !userEndedSessionRef.current) {
        console.log("Session ended by server/timeout, triggering auto-analysis...");
        setPendingAnalysis(true);
      }
    },
    onError: (error) => {
      console.error(`${activeProvider} voice error:`, error);
      let userMessage = "Erreur de connexion - veuillez réessayer";
      if (error.toLowerCase().includes('not implemented') || error.toLowerCase().includes('unimplemented')) {
        userMessage = "Fonctionnalité API non disponible - vérifiez votre clé API";
      } else if (error.toLowerCase().includes('quota') || error.toLowerCase().includes('billing')) {
        userMessage = "Quota API dépassé - vérifiez votre facturation";
      } else if (error.toLowerCase().includes('invalid') || error.toLowerCase().includes('api key')) {
        userMessage = "Clé API invalide - vérifiez votre configuration";
      } else if (error.toLowerCase().includes('timeout')) {
        userMessage = "Connexion expirée - veuillez réessayer";
      }
      setStatusMessage(userMessage);
      toast.error(userMessage);
    },
    onTranscript: () => {},
    onScenarioChange: (scenario) => {
      console.log("Scenario changed to:", scenario);
    },
    onSessionLimitReached: () => {
      console.log("Session limit reached by Gemini API, triggering analysis...");
      setStatusMessage("Session terminée par l'IA - analyse en cours...");
      setPendingAnalysis(true);
      setWasConnected(false);
    },
  });

  const requestMicAndStart = useCallback(async () => {
    setMicPermissionError(null);
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the test stream immediately
      stream.getTracks().forEach(track => track.stop());
      // Now connect to voice
      setStatusMessage("Connexion à votre guide...");
      await connect();
    } catch {
      setMicPermissionError("L'accès au microphone est nécessaire. Activez-le dans les paramètres de votre navigateur.");
    }
  }, [connect]);

  const analyzeTranscript = async (transcriptData: TranscriptMessage[]) => {
    setIsAnalyzing(true);
    setStatusMessage("Analyse de votre conversation...");

    try {
      let existingProfile = null;
      let sessionCount = 1;

      const { data: existingData, error: fetchError } = await supabase
        .from('user_profiles')
        .select('profile, session_count')
        .eq('user_id', userId)
        .single();

      if (!fetchError && existingData) {
        existingProfile = existingData.profile;
        sessionCount = (existingData.session_count || 1) + 1;
        console.log(`Found existing profile (session #${sessionCount - 1}), will merge with new data`);
      }

      const formattedTranscript = transcriptData.map(msg => ({
        role: msg.role === 'assistant' ? 'agent' : msg.role,
        content: msg.content
      }));

      console.log("Scenarios covered for analysis:", hookScenariosCovered);

      const { data, error } = await supabase.functions.invoke("analyze-profile", {
        body: {
          transcript: formattedTranscript,
          existingProfile: existingProfile,
          sessionCount: sessionCount,
          scenariosCovered: hookScenariosCovered
        }
      });

      if (error) {
        console.error("Analysis error:", error);
        toast.error("Échec de l'analyse de la conversation");
        return {
          overallSummary: "Analyse échouée - données temporaires",
          transcript: transcriptData,
          error: error.message
        };
      }

      const profileToSave = data.profile;

      if (existingProfile) {
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            profile: profileToSave,
            session_count: sessionCount
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error("Failed to update profile:", updateError);
        } else {
          console.log(`Profile updated (session #${sessionCount})`);
        }
      } else {
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            profile: profileToSave,
            session_count: 1
          });

        if (insertError) {
          console.error("Failed to save profile:", insertError);
        } else {
          console.log("New profile saved");
        }
      }

      return {
        ...profileToSave,
        rawTranscript: transcriptData
      };
    } catch (error) {
      console.error("Analysis failed:", error);
      toast.error("Échec de l'analyse de la conversation");
      return {
        overallSummary: "Analyse échouée - données temporaires",
        transcript: transcriptData
      };
    } finally {
      setIsAnalyzing(false);
    }
  };

  const endConversation = useCallback(async () => {
    console.log("=== endConversation called ===");

    if (isAnalyzing) {
      console.log("Already analyzing, ignoring duplicate call");
      return;
    }

    userEndedSessionRef.current = true;

    const transcriptData = getTranscript();
    console.log("Final transcript:", transcriptData.length, "messages");

    disconnect();

    if (transcriptData.length > 0) {
      console.log("User ended session, analyzing transcript...");
      try {
        const profileData = await analyzeTranscript(transcriptData);
        console.log("Analysis complete, calling onComplete");
        onComplete(profileData);
      } catch (err) {
        console.error("Analysis error in endConversation:", err);
        onComplete({
          overallSummary: "Analyse échouée",
          error: String(err)
        });
      }
    } else {
      console.log("No transcript to analyze, completing with demo data");
      onComplete({
        overallSummary: "Session démo - pas de transcription capturée",
        matchingKeywords: ["demo", "test"],
        rawTranscript: [],
        note: "Ceci est une session démo. La conversation était peut-être trop courte."
      });
    }
  }, [disconnect, getTranscript, onComplete, isAnalyzing]);

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  // Auto-analyze when session ends
  useEffect(() => {
    if (pendingAnalysis && !isAnalyzing) {
      setPendingAnalysis(false);
      const transcriptData = getTranscript();
      console.log("Auto-analyzing after disconnect, transcript length:", transcriptData.length);

      if (transcriptData.length > 0) {
        setIsAnalyzing(true);
        setStatusMessage("Luna analyse votre conversation...");

        analyzeTranscript(transcriptData).then(profileData => {
          console.log("Analysis complete, navigating to profile...");
          onComplete(profileData);
        }).catch(err => {
          console.error("Auto-analysis failed:", err);
          setIsAnalyzing(false);
          setStatusMessage("Analyse échouée");
        });
      } else {
        console.log("No transcript to analyze");
        setStatusMessage("Session terminée - pas de conversation à analyser");
      }
    }
  }, [pendingAnalysis, isAnalyzing, getTranscript, onComplete]);

  const getStatusText = () => {
    if (isAnalyzing) return "Analyse de votre conversation...";
    if (isConnecting && transcript.length > 0) return "Reconnexion en cours...";
    if (isConnecting) return "Connexion...";
    if (isConnected && !sessionReady) return "Préparation de la session...";
    if (isSpeaking) return "Luna vous parle...";
    if (isConnected && isListening) return "Luna vous écoute...";
    if (isConnected) return "Connecté";
    return statusMessage;
  };

  // Select provider handler
  const selectGemini = () => {
    setSelectedProvider('gemini');
    setStep('ready');
  };

  const selectGrokVoice = (voiceId: GrokVoiceOption) => {
    setSelectedGrokVoice(voiceId);
    setSelectedProvider('grok');
    setStep('ready');
  };

  // ─── STEP 1: Provider selection (logo centered + options slide in) ───
  if (step === 'provider') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-warm-gradient relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-cyan-400/5 blur-[120px]" />
        </div>

        {/* Close button */}
        <motion.div
          className="absolute top-4 left-4 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={onExit}
            className="rounded-full w-10 h-10 text-white/40 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </motion.div>

        {/* Logo */}
        <motion.img
          src="/echo-logo.png"
          alt="Echo"
          className="w-32 h-32 object-contain mb-10"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        />

        {/* Provider cards slide in */}
        <motion.div
          className="w-full max-w-sm px-6 space-y-3"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <p className="text-center text-white/40 text-sm mb-4">
            Choisissez votre IA
          </p>

          <Button
            onClick={selectGemini}
            variant="outline"
            className="w-full h-16 rounded-2xl flex items-center justify-start px-5 gap-4 bg-white/5 border-white/10 hover:bg-white/10 hover:border-cyan-400/30 transition-all text-white"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm">Gemini</div>
              <div className="text-xs text-white/40">Google AI</div>
            </div>
          </Button>

          <Button
            onClick={() => setStep('grokVoice')}
            variant="outline"
            className="w-full h-16 rounded-2xl flex items-center justify-start px-5 gap-4 bg-white/5 border-white/10 hover:bg-white/10 hover:border-cyan-400/30 transition-all text-white"
          >
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-orange-400" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm">Grok</div>
              <div className="text-xs text-white/40">xAI - Choisir une voix</div>
            </div>
          </Button>
        </motion.div>
      </div>
    );
  }

  // ─── STEP 1b: Grok voice selection ───
  if (step === 'grokVoice') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-warm-gradient relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-cyan-400/5 blur-[120px]" />
        </div>

        <motion.div
          className="absolute top-4 left-4 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setStep('provider')}
            className="rounded-full w-10 h-10 text-white/40 hover:text-white hover:bg-white/10"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </motion.div>

        <motion.img
          src="/echo-logo.png"
          alt="Echo"
          className="w-24 h-24 object-contain mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        />

        <motion.div
          className="w-full max-w-sm px-6 space-y-3"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <p className="text-center text-white/40 text-sm mb-4">
            Choisissez la voix de Luna
          </p>

          {GROK_VOICES.map((voice) => (
            <Button
              key={voice.id}
              onClick={() => selectGrokVoice(voice.id)}
              variant="outline"
              className="w-full h-14 rounded-2xl flex items-center justify-start px-5 gap-4 bg-white/5 border-white/10 hover:bg-white/10 hover:border-cyan-400/30 transition-all text-white"
            >
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-sm font-medium text-orange-400">
                {voice.gender === 'Femme' ? '♀' : voice.gender === 'Homme' ? '♂' : '○'}
              </div>
              <div className="text-left flex-1">
                <div className="font-semibold text-sm">{voice.name}</div>
                <div className="text-xs text-white/40">{voice.description}</div>
              </div>
              <span className="text-xs text-white/30">{voice.gender}</span>
            </Button>
          ))}
        </motion.div>
      </div>
    );
  }

  // ─── STEP 2: Ready screen (logo slides up, voice animation + start button) ───
  if (step === 'ready') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-warm-gradient relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-cyan-400/5 blur-[120px]" />
        </div>

        {/* Close button */}
        <motion.div
          className="absolute top-4 left-4 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setStep('provider')}
            className="rounded-full w-10 h-10 text-white/40 hover:text-white hover:bg-white/10"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </motion.div>

        {/* Provider badge top right */}
        <motion.div
          className="absolute top-4 right-4 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <Volume2 className="w-3.5 h-3.5 text-white/40" />
            <span className="text-xs text-white/40">
              {selectedProvider === 'grok' ? `Grok (${selectedGrokVoice || 'Ara'})` : 'Gemini'}
            </span>
          </div>
        </motion.div>

        {/* Logo slides up */}
        <motion.img
          src="/echo-logo.png"
          alt="Echo"
          className="w-20 h-20 object-contain"
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: -40, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />

        {/* Voice animation appears */}
        <motion.div
          className="mb-4"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <AudioEqualizer
            isListening={false}
            isSpeaking={false}
            isConnecting={isConnecting}
            size="lg"
          />
        </motion.div>

        {/* Status text */}
        <motion.p
          className="text-white/40 text-sm mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {isConnecting ? "Connexion..." : "Prêt·e à discuter avec Luna"}
        </motion.p>

        {/* Mic permission error */}
        {micPermissionError && (
          <motion.div
            className="mb-4 mx-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 max-w-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-start gap-2">
              <MicOff className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{micPermissionError}</p>
            </div>
          </motion.div>
        )}

        {/* Start button */}
        <motion.div
          className="w-full max-w-xs px-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <Button
            onClick={requestMicAndStart}
            disabled={isConnecting}
            size="lg"
            className="w-full h-14 text-lg rounded-2xl font-semibold shadow-glow transition-all hover:shadow-warm hover:scale-[1.02] bg-cyan-500 hover:bg-cyan-400 text-white"
          >
            {isConnecting ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Mic className="w-5 h-5 mr-2" />
            )}
            {isConnecting ? "Connexion..." : "Démarrer la conversation"}
          </Button>
        </motion.div>
      </div>
    );
  }

  // ─── STEP 3: Active conversation ───
  return (
    <div className="min-h-screen flex flex-col bg-warm-gradient">
      {/* Header */}
      <motion.header
        className="flex items-center justify-between p-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (isConnected && transcript.length > 0) {
              endConversation();
            } else {
              disconnect();
              onExit();
            }
          }}
          className="rounded-full w-10 h-10 text-white/40 hover:text-white hover:bg-white/10"
          disabled={isAnalyzing}
        >
          <X className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-3">
          {isConnected && sessionDuration > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/5 border border-white/10">
              <Clock className="w-3.5 h-3.5 text-white/40" />
              <span className="text-sm font-mono text-white/40">
                {formatDuration(sessionDuration)}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10">
            <Volume2 className="w-3.5 h-3.5 text-white/40" />
            <span className="text-xs text-white/40">
              {provider === 'grok' ? `Grok (${selectedGrokVoice || 'Ara'})` : 'Gemini'}
            </span>
          </div>
        </div>

        <div className="w-10" />
      </motion.header>

      {/* Scenario Display */}
      {isConnected && currentScenario && (
        <motion.div
          className="mx-4 mb-2 flex justify-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            <span className="text-sm text-white/40">Thème:</span>
            <span className="text-sm font-semibold text-cyan-400">
              {scenarioLabels[currentScenario] || currentScenario}
            </span>
          </div>
        </motion.div>
      )}

      {/* Debug Panel */}
      {showDebug && (
        <motion.div
          className="mx-4 mb-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-mono text-yellow-400">DEBUG</span>
            </div>
            <button
              onClick={() => setShowDebug(false)}
              className="text-xs text-white/30 hover:text-white/50"
            >
              Masquer
            </button>
          </div>
          <div className="mt-2 space-y-1 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-white/30">Scénario:</span>
              <span className="text-cyan-400 font-semibold">{currentScenario || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/30">Provider:</span>
              <span className="text-white/60">{activeProvider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/30">Session:</span>
              <span className="text-white/60">{existingProfile ? `#${existingProfile.sessionCount + 1}` : '#1'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/30">Connected:</span>
              <span>{isConnected ? '✅' : '❌'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/30">Ready:</span>
              <span>{sessionReady ? '✅' : '❌'}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
        {/* Small logo at top */}
        <motion.img
          src="/echo-logo.png"
          alt="Echo"
          className="w-12 h-12 object-contain mb-6 opacity-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
        />

        {/* Audio Equalizer */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-8 h-32 flex items-center justify-center"
        >
          {isAnalyzing ? (
            <div className="w-32 h-32 rounded-full bg-cyan-500/10 flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
            </div>
          ) : (
            <AudioEqualizer
              isListening={isConnected && isListening && !isSpeaking}
              isSpeaking={isSpeaking}
              isConnecting={isConnecting}
              size="lg"
            />
          )}
        </motion.div>

        {/* Status Text */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <AnimatePresence mode="wait">
            <motion.p
              key={getStatusText()}
              className="text-lg text-white/50"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {getStatusText()}
            </motion.p>
          </AnimatePresence>

          {/* Readiness + Mic meter + Cost */}
          {isConnected && (
            <div className="mt-4 mx-auto w-full max-w-sm rounded-xl bg-white/5 border border-white/10 px-4 py-3">
              <div className="flex items-center justify-between text-xs text-white/30">
                <span>Session</span>
                <span className={sessionReady ? "text-cyan-400" : "text-white/30"}>
                  {sessionReady ? "Prête" : "Démarrage"}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-3">
                <span className="text-xs text-white/30">Micro</span>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-cyan-400 transition-[width] duration-75"
                    style={{ width: `${Math.min(100, Math.max(0, micLevel * 140))}%` }}
                  />
                  {micSensitivity > 0.005 && (
                    <div
                      className="absolute inset-y-0 w-0.5 bg-red-400/70"
                      style={{ left: `${Math.min(100, micSensitivity * 140)}%` }}
                      title="Seuil du noise gate"
                    />
                  )}
                </div>
              </div>

              {/* Mic sensitivity slider */}
              <div className="mt-2 flex items-center gap-3">
                <MicOff className="w-3 h-3 text-white/30 flex-shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="0.15"
                  step="0.005"
                  value={micSensitivity}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setMicSensitivityState(val);
                    setMicSensitivity(val);
                  }}
                  className="flex-1 h-1.5 accent-cyan-400 cursor-pointer"
                  title={`Seuil: ${(micSensitivity * 100).toFixed(1)}%`}
                />
                <span className="text-[10px] text-white/30 w-14 text-right tabular-nums">
                  {micSensitivity < 0.005 ? 'Off' : `${(micSensitivity * 100).toFixed(1)}%`}
                </span>
              </div>

              {sessionDuration > 0 && (
                <div className="mt-2 flex items-center justify-between text-xs text-white/30">
                  <span>Coût estimé</span>
                  <span className="font-mono">
                    {estimateSessionCost(sessionDuration, activeProvider).estimatedCostFormatted}
                  </span>
                </div>
              )}

              {!sessionReady && (
                <p className="mt-2 text-[11px] text-white/20">
                  En attente de la préparation de l'IA…
                </p>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Bottom Controls */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[hsl(215,15%,18%)] via-[hsl(215,15%,18%)/0.95] to-transparent"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="max-w-md mx-auto space-y-4">
          {!isConnected && !isConnecting ? (
            <Button
              onClick={requestMicAndStart}
              disabled={isConnecting || isAnalyzing}
              size="lg"
              className="w-full h-14 text-lg rounded-2xl font-semibold shadow-glow transition-all hover:shadow-warm hover:scale-[1.02] bg-cyan-500 hover:bg-cyan-400 text-white"
            >
              {isConnecting ? "Connexion..." : isAnalyzing ? "Analyse..." : "Démarrer la conversation"}
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button
                onClick={togglePause}
                variant="secondary"
                size="lg"
                className="flex-1 h-14 rounded-2xl font-semibold bg-white/10 hover:bg-white/15 text-white border-0"
                disabled={isAnalyzing}
              >
                {isPaused ? (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Reprendre
                  </>
                ) : (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    Pause
                  </>
                )}
              </Button>
              <Button
                onClick={endConversation}
                size="lg"
                className="flex-1 h-14 rounded-2xl font-semibold shadow-glow bg-cyan-500 hover:bg-cyan-400 text-white"
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Analyse...
                  </>
                ) : (
                  "Terminer"
                )}
              </Button>
            </div>
          )}

          {isConnected && !isAnalyzing && (
            <p className="text-center text-xs text-white/30">
              Prenez votre temps. Vous pouvez faire une pause quand vous voulez.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
