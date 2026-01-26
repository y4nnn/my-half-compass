import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { VoiceOrb } from "@/components/ui/VoiceOrb";
import { Pause, Play, X, Volume2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useGeminiVoice, TranscriptMessage } from "@/hooks/useGeminiVoice";

interface VoiceChatProps {
  onComplete: (profileData: any) => void;
  onExit: () => void;
}

export function VoiceChat({ onComplete, onExit }: VoiceChatProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready to begin");
  
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
  } = useGeminiVoice({
    onConnect: () => {
      console.log("Connected to Gemini voice session");
      setStatusMessage("Connected - preparing your guide...");
    },
    onDisconnect: () => {
      console.log("Disconnected from Gemini voice session");
      setStatusMessage("Session ended");
    },
    onError: (error) => {
      console.error("Gemini voice error:", error);
      setStatusMessage("Connection error - please try again");
      toast.error(error);
    },
    onTranscript: (message) => {
      console.log("Transcript:", message);
    },
  });

  const startConversation = useCallback(async () => {
    setStatusMessage("Connecting to your guide...");
    await connect();
  }, [connect]);

  const analyzeTranscript = async (transcriptData: TranscriptMessage[]) => {
    setIsAnalyzing(true);
    setStatusMessage("Analyzing your conversation...");

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
        toast.error("Failed to analyze conversation");
        return {
          overallSummary: "Analysis failed - using placeholder data",
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
      toast.error("Failed to analyze conversation");
      return {
        overallSummary: "Analysis failed - using placeholder data",
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
        overallSummary: "Demo session - no transcript captured",
        matchingKeywords: ["demo", "test"],
        rawTranscript: [],
        note: "This is demo data. The conversation may have been too short to capture meaningful content."
      });
    }
  }, [disconnect, getTranscript, onComplete]);

  const togglePause = () => {
    setIsPaused(!isPaused);
    // Note: Pause functionality would require additional implementation
  };

  const getStatusText = () => {
    if (isAnalyzing) return "Analyzing your conversation...";
    if (isConnecting) return "Connecting...";
    if (isConnected && !sessionReady) return "Preparing session...";
    if (isSpeaking) return "Speaking to you...";
    if (isConnected && isListening) return "Listening...";
    if (isConnected) return "Connected";
    return statusMessage;
  };

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
          <span className="text-sm text-muted-foreground">Voice Session</span>
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
                  {sessionReady ? "Ready" : "Starting"}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Mic</span>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-75"
                    style={{ width: `${Math.min(100, Math.max(0, micLevel * 140))}%` }}
                  />
                </div>
              </div>

              {!sessionReady && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Waiting for the AI to finish setup…
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
                <span className="font-medium">{msg.role === "user" ? "You" : "Guide"}:</span> {msg.content}
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
              You'll be speaking with a supportive AI guide who will ask about your 
              life experiences to help find your perfect match.
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
              {isConnecting ? "Connecting..." : isAnalyzing ? "Analyzing..." : "Start Conversation"}
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
                    Resume
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
                    Analyzing...
                  </>
                ) : (
                  "Complete Session"
                )}
              </Button>
            </div>
          )}

          {isConnected && !isAnalyzing && (
            <p className="text-center text-xs text-muted-foreground">
              Take your time. You can pause whenever you need a moment.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
