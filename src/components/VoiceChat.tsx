import { useState, useCallback } from "react";
import { useConversation } from "@elevenlabs/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { VoiceOrb } from "@/components/ui/VoiceOrb";
import { Pause, Play, X, Volume2 } from "lucide-react";

// Public agent ID for Menacing Green Anaconda
const ELEVENLABS_AGENT_ID = "t8BrjWUT5Z23DLLBzbuY";

interface VoiceChatProps {
  onComplete: (profileData: any) => void;
  onExit: () => void;
}

export function VoiceChat({ onComplete, onExit }: VoiceChatProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready to begin");

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

  const endConversation = useCallback(async () => {
    await conversation.endSession();
    // For demo, simulate profile generation
    onComplete({
      themes: ["resilience", "growth", "connection"],
      experiences: ["career transition", "relationship growth"],
      personality: "empathetic listener",
    });
  }, [conversation, onComplete]);

  const togglePause = () => {
    setIsPaused(!isPaused);
    // In a real implementation, this would pause the conversation
  };

  const getStatusText = () => {
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
          <VoiceOrb
            isListening={conversationStarted && !conversation.isSpeaking}
            isSpeaking={conversation.isSpeaking}
            isConnecting={isConnecting}
            size="lg"
          />
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

        {/* Guidance Text */}
        {!conversationStarted && !isConnecting && (
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
              disabled={isConnecting}
              size="lg"
              className="w-full h-14 text-lg rounded-2xl font-semibold shadow-glow transition-all hover:shadow-warm hover:scale-[1.02]"
            >
              {isConnecting ? "Connecting..." : "Start Conversation"}
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button
                onClick={togglePause}
                variant="secondary"
                size="lg"
                className="flex-1 h-14 rounded-2xl font-semibold"
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
              >
                Complete Session
              </Button>
            </div>
          )}

          {conversationStarted && (
            <p className="text-center text-xs text-muted-foreground">
              Take your time. You can pause whenever you need a moment.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
