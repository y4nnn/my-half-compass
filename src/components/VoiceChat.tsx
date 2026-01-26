import { useState, useCallback, useRef } from "react";
import { useConversation } from "@elevenlabs/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { VoiceOrb } from "@/components/ui/VoiceOrb";
import { Pause, Play, X, Volume2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Public agent ID for Menacing Green Anaconda
const ELEVENLABS_AGENT_ID = "agent_9601kfx8tjbcfqc8pakd15qdcejw";

interface TranscriptMessage {
  role: "user" | "agent";
  content: string;
}

interface VoiceChatProps {
  onComplete: (profileData: any) => void;
  onExit: () => void;
}

export function VoiceChat({ onComplete, onExit }: VoiceChatProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready to begin");
  const [liveTranscript, setLiveTranscript] = useState<TranscriptMessage[]>([]);
  
  const transcriptRef = useRef<TranscriptMessage[]>([]);

  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to AI therapist");
      setIsConnecting(false);
      setConversationStarted(true);
      setStatusMessage("Connected - I'm listening");
    },
    onDisconnect: () => {
      console.log("Disconnected from AI therapist");
      setConversationStarted(false);
      setStatusMessage("Session ended");
    },
    onMessage: (message) => {
      console.log("Message received:", message);
      
      // Capture transcript messages - cast to any for type flexibility
      const msg = message as any;
      if (msg.type === "user_transcript") {
        const userText = msg.user_transcription_event?.user_transcript;
        if (userText) {
          const newMessage: TranscriptMessage = { role: "user", content: userText };
          transcriptRef.current = [...transcriptRef.current, newMessage];
          setLiveTranscript([...transcriptRef.current]);
        }
      } else if (msg.type === "agent_response") {
        const agentText = msg.agent_response_event?.agent_response;
        if (agentText) {
          const newMessage: TranscriptMessage = { role: "agent", content: agentText };
          transcriptRef.current = [...transcriptRef.current, newMessage];
          setLiveTranscript([...transcriptRef.current]);
        }
      }
    },
    onError: (error) => {
      console.error("Conversation error:", error);
      setIsConnecting(false);
      setStatusMessage("Connection error - please try again");
    },
  });

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    setStatusMessage("Connecting to your guide...");
    transcriptRef.current = [];
    setLiveTranscript([]);

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Start the conversation with public agent (no API key needed)
      await conversation.startSession({
        agentId: ELEVENLABS_AGENT_ID,
        connectionType: "webrtc",
      });
    } catch (error) {
      console.error("Failed to start conversation:", error);
      setIsConnecting(false);
      setStatusMessage("Unable to connect - please try again");
    }
  }, [conversation]);

  const analyzeTranscript = async (transcript: TranscriptMessage[]) => {
    setIsAnalyzing(true);
    setStatusMessage("Analyzing your conversation...");

    try {
      const { data, error } = await supabase.functions.invoke("analyze-profile", {
        body: { transcript }
      });

      if (error) {
        console.error("Analysis error:", error);
        toast.error("Failed to analyze conversation");
        // Return mock data as fallback
        return {
          overallSummary: "Analysis failed - using placeholder data",
          transcript: transcript,
          error: error.message
        };
      }

      return {
        ...data.profile,
        rawTranscript: transcript
      };
    } catch (error) {
      console.error("Analysis failed:", error);
      toast.error("Failed to analyze conversation");
      return {
        overallSummary: "Analysis failed - using placeholder data",
        transcript: transcript
      };
    } finally {
      setIsAnalyzing(false);
    }
  };

  const endConversation = useCallback(async () => {
    await conversation.endSession();
    
    const transcript = transcriptRef.current;
    console.log("Final transcript:", transcript);

    if (transcript.length > 0) {
      const profileData = await analyzeTranscript(transcript);
      onComplete(profileData);
    } else {
      // No transcript captured, use demo data
      onComplete({
        overallSummary: "Demo session - no transcript captured",
        matchingKeywords: ["demo", "test"],
        rawTranscript: [],
        note: "This is demo data. Make sure transcript events are enabled in your ElevenLabs agent settings."
      });
    }
  }, [conversation, onComplete]);

  const togglePause = () => {
    setIsPaused(!isPaused);
    // In a real implementation, this would pause the conversation
  };

  const getStatusText = () => {
    if (isAnalyzing) return "Analyzing your conversation...";
    if (isConnecting) return "Connecting...";
    if (conversation.isSpeaking) return "Speaking to you...";
    if (conversationStarted) return "Listening...";
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
              isListening={conversationStarted && !conversation.isSpeaking}
              isSpeaking={conversation.isSpeaking}
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
        </motion.div>

        {/* Live Transcript Preview */}
        {conversationStarted && liveTranscript.length > 0 && (
          <motion.div
            className="w-full max-w-md mb-4 p-4 rounded-xl bg-card/40 backdrop-blur-sm border border-border/30 max-h-32 overflow-y-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {liveTranscript.slice(-3).map((msg, idx) => (
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
        {!conversationStarted && !isConnecting && !isAnalyzing && (
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
          {!conversationStarted ? (
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

          {conversationStarted && !isAnalyzing && (
            <p className="text-center text-xs text-muted-foreground">
              Take your time. You can pause whenever you need a moment.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
