import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, AlertCircle } from "lucide-react";

interface MicrophonePermissionProps {
  onPermissionGranted: () => void;
  onBack: () => void;
}

export function MicrophonePermission({ onPermissionGranted, onBack }: MicrophonePermissionProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestMicrophoneAccess = async () => {
    setIsRequesting(true);
    setError(null);

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      onPermissionGranted();
    } catch (err) {
      console.error("Microphone access denied:", err);
      setError("Microphone access is required for the voice conversation. Please enable it in your browser settings.");
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-warm-gradient">
      <motion.div
        className="max-w-md w-full text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Microphone Icon Animation */}
        <motion.div
          className="mb-8"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="relative w-32 h-32 mx-auto">
            {/* Outer ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-primary/20"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Inner circle */}
            <div className="absolute inset-4 rounded-full bg-primary/10 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Mic className="w-12 h-12 text-primary" />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Text */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-display font-bold text-foreground mb-3">
            Enable Your Microphone
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            To have a natural conversation, we'll need access to your microphone. 
            You'll be speaking with a supportive AI who will listen to your story.
          </p>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/20"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-start gap-3">
              <MicOff className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive text-left">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            onClick={requestMicrophoneAccess}
            disabled={isRequesting}
            size="lg"
            className="w-full h-14 text-lg rounded-2xl font-semibold shadow-glow transition-all hover:shadow-warm hover:scale-[1.02]"
          >
            {isRequesting ? (
              <motion.div
                className="flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Requesting Access...
              </motion.div>
            ) : (
              <>
                <Mic className="mr-2 w-5 h-5" />
                Allow Microphone Access
              </>
            )}
          </Button>
          <Button
            onClick={onBack}
            variant="ghost"
            className="w-full h-12 text-muted-foreground hover:text-foreground"
          >
            Go Back
          </Button>
        </motion.div>

        {/* Help text */}
        <motion.div
          className="mt-8 p-4 rounded-2xl bg-accent/50 border border-accent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-accent-foreground flex-shrink-0 mt-0.5" />
            <p className="text-sm text-accent-foreground/80 text-left">
              <span className="font-medium">Tip:</span> If you see a browser popup, 
              click "Allow" to enable your microphone. You can disable it anytime from your browser settings.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
