import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { VoiceOrb } from "@/components/ui/VoiceOrb";
import { Pause, Play, X, Volume2, Loader2, Sparkles, Zap, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useVoice, VoiceProvider, TranscriptMessage, getDefaultProvider, GrokVoiceOption } from "@/hooks/useVoice";
import { GROK_VOICES } from "@/hooks/useGrokVoice";

interface VoiceChatProps {
  userId: string;
  onComplete: (profileData: any) => void;
  onExit: () => void;
}

export function VoiceChat({ userId, onComplete, onExit }: VoiceChatProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Prêt·e à commencer");
  const [selectedProvider, setSelectedProvider] = useState<VoiceProvider | null>(null);
  const [selectedGrokVoice, setSelectedGrokVoice] = useState<GrokVoiceOption | null>(null);
  const [showVoiceSelection, setShowVoiceSelection] = useState(false);

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
  } = useVoice({
    provider: activeProvider,
    userId,
    grokVoice: selectedGrokVoice || undefined,
    onConnect: () => {
      console.log(`Connected to ${activeProvider} voice session`);
      setStatusMessage("Connecté - préparation de votre guide...");
    },
    onDisconnect: () => {
      console.log(`Disconnected from ${activeProvider} voice session`);
      setStatusMessage("Session terminée");
    },
    onError: (error) => {
      console.error(`${activeProvider} voice error:`, error);
      // Parse error for user-friendly message
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
    onTranscript: (message) => {
      console.log("Transcript:", message);
    },
  });

  const startConversation = useCallback(async () => {
    setStatusMessage("Connexion à votre guide...");
    await connect();
  }, [connect]);

  const analyzeTranscript = async (transcriptData: TranscriptMessage[]) => {
    setIsAnalyzing(true);
    setStatusMessage("Analyse de votre conversation...");

    try {
      // Convert transcript format for analyze-profile function
      const formattedTranscript = transcriptData.map(msg => ({
        role: msg.role === 'assistant' ? 'agent' : msg.role,
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke("analyze-profile", {
        body: { transcript: formattedTranscript }
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

      return {
        ...data.profile,
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
    const transcriptData = getTranscript();
    console.log("Final transcript:", transcriptData);
    
    disconnect();

    if (transcriptData.length > 0) {
      const profileData = await analyzeTranscript(transcriptData);
      onComplete(profileData);
    } else {
      onComplete({
        overallSummary: "Session démo - pas de transcription capturée",
        matchingKeywords: ["demo", "test"],
        rawTranscript: [],
        note: "Ceci est une session démo. La conversation était peut-être trop courte."
      });
    }
  }, [disconnect, getTranscript, onComplete]);

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

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

  // Voice selection screen for Grok
  if (showVoiceSelection) {
    return (
      <div className="min-h-screen flex flex-col bg-warm-gradient">
        <motion.header
          className="flex items-center justify-between p-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowVoiceSelection(false)}
            className="rounded-full w-10 h-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="w-10" />
          <div className="w-10" />
        </motion.header>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold mb-2">Choisissez une voix</h2>
            <p className="text-muted-foreground">
              Sélectionnez la voix de Luna pour Grok
            </p>
          </motion.div>

          <motion.div
            className="w-full max-w-sm space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {GROK_VOICES.map((voice) => (
              <Button
                key={voice.id}
                onClick={() => {
                  setSelectedGrokVoice(voice.id);
                  setSelectedProvider('grok');
                  setShowVoiceSelection(false);
                }}
                variant="outline"
                className="w-full h-16 rounded-2xl flex items-center justify-start px-6 gap-4 hover:bg-primary/10 hover:border-primary transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-sm font-medium text-orange-500">
                  {voice.gender === 'Femme' ? '♀' : voice.gender === 'Homme' ? '♂' : '○'}
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold">{voice.name}</div>
                  <div className="text-xs text-muted-foreground">{voice.description}</div>
                </div>
                <span className="text-xs text-muted-foreground">{voice.gender}</span>
              </Button>
            ))}
          </motion.div>
        </div>
      </div>
    );
  }

  // Provider selection screen
  if (!selectedProvider) {
    return (
      <div className="min-h-screen flex flex-col bg-warm-gradient">
        <motion.header
          className="flex items-center justify-between p-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={onExit}
            className="rounded-full w-10 h-10"
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="w-10" />
          <div className="w-10" />
        </motion.header>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold mb-2">Choisissez votre IA</h2>
            <p className="text-muted-foreground">
              Sélectionnez le modèle pour votre conversation avec Luna
            </p>
          </motion.div>

          <motion.div
            className="w-full max-w-sm space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              onClick={() => setSelectedProvider('gemini')}
              variant="outline"
              className="w-full h-20 rounded-2xl flex items-center justify-start px-6 gap-4 hover:bg-primary/10 hover:border-primary transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-blue-500" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Gemini</div>
                <div className="text-sm text-muted-foreground">Google AI - Recommandé</div>
              </div>
            </Button>

            <Button
              onClick={() => setShowVoiceSelection(true)}
              variant="outline"
              className="w-full h-20 rounded-2xl flex items-center justify-start px-6 gap-4 hover:bg-primary/10 hover:border-primary transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-orange-500" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Grok</div>
                <div className="text-sm text-muted-foreground">xAI - Choisir une voix</div>
              </div>
            </Button>
          </motion.div>

          <motion.p
            className="text-center text-xs text-muted-foreground mt-8 max-w-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Les deux modèles offrent une expérience vocale en temps réel. Grok peut être plus adapté pour les sujets sensibles.
          </motion.p>
        </div>
      </div>
    );
  }

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
          onClick={onExit}
          className="rounded-full w-10 h-10"
          disabled={isAnalyzing}
        >
          <X className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/60 backdrop-blur-sm border border-border/50">
          <Volume2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {provider === 'grok' ? `Grok (${selectedGrokVoice || 'Ara'})` : 'Gemini'}
          </span>
        </div>

        <div className="w-10" /> {/* Spacer for alignment */}
      </motion.header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
        {/* Voice Orb */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-8"
        >
          {isAnalyzing ? (
            <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
          ) : (
            <VoiceOrb
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
              className="text-lg text-muted-foreground"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {getStatusText()}
            </motion.p>
          </AnimatePresence>

          {/* Readiness + Mic meter */}
          {isConnected && (
            <div className="mt-4 mx-auto w-full max-w-sm rounded-xl bg-card/40 backdrop-blur-sm border border-border/30 px-4 py-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Session</span>
                <span className={sessionReady ? "text-primary" : "text-muted-foreground"}>
                  {sessionReady ? "Prête" : "Démarrage"}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Micro</span>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-75"
                    style={{ width: `${Math.min(100, Math.max(0, micLevel * 140))}%` }}
                  />
                </div>
              </div>

              {!sessionReady && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  En attente de la préparation de l'IA…
                </p>
              )}
            </div>
          )}
        </motion.div>

{/* Live Transcript Preview */}
        {isConnected && transcript.length > 0 && (
          <motion.div
            className="w-full max-w-md mb-4 p-4 rounded-xl bg-card/40 backdrop-blur-sm border border-border/30 max-h-32 overflow-y-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {transcript.slice(-3).map((msg, idx) => (
              <p
                key={idx}
                className={`text-sm mb-1 ${msg.role === "user" ? "text-primary" : "text-muted-foreground"}`}
              >
                <span className="font-medium">{msg.role === "user" ? "Vous" : "Luna"}:</span> {msg.content}
              </p>
            ))}
          </motion.div>
        )}

        {/* Guidance Text */}
        {!isConnected && !isConnecting && !isAnalyzing && (
          <motion.div
            className="max-w-sm text-center mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-sm text-muted-foreground leading-relaxed">
              Vous allez discuter avec Luna, une guide bienveillante qui va apprendre 
              à vous connaître pour vous trouver quelqu'un qui vous correspond.
            </p>
          </motion.div>
        )}
      </div>

      {/* Bottom Controls */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="max-w-md mx-auto space-y-4">
          {!isConnected && !isConnecting ? (
            <Button
              onClick={startConversation}
              disabled={isConnecting || isAnalyzing}
              size="lg"
              className="w-full h-14 text-lg rounded-2xl font-semibold shadow-glow transition-all hover:shadow-warm hover:scale-[1.02]"
            >
              {isConnecting ? "Connexion..." : isAnalyzing ? "Analyse..." : "Démarrer la conversation"}
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button
                onClick={togglePause}
                variant="secondary"
                size="lg"
                className="flex-1 h-14 rounded-2xl font-semibold"
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
                className="flex-1 h-14 rounded-2xl font-semibold shadow-glow"
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
            <p className="text-center text-xs text-muted-foreground">
              Prenez votre temps. Vous pouvez faire une pause quand vous voulez.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}