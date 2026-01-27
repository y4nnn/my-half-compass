import { useState } from "react";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { AuthScreen } from "@/components/AuthScreen";
import { PrivacyDisclaimer } from "@/components/PrivacyDisclaimer";
import { MicrophonePermission } from "@/components/MicrophonePermission";
import { VoiceChat } from "@/components/VoiceChat";
import { ProfileReport } from "@/components/ProfileReport";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

type AppStep = "welcome" | "auth" | "privacy" | "microphone" | "voiceChat" | "report" | "matching" | "chat";

const Index = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>("welcome");
  const [profileData, setProfileData] = useState<any>(null);
  const [voiceChatKey, setVoiceChatKey] = useState(0);
  const { user } = useAuth();

  const handleAuthSuccess = () => {
    setCurrentStep("privacy");
  };

  const handleVoiceChatComplete = (data: any) => {
    setProfileData(data);
    setCurrentStep("report");
  };

  const handleTalkToLuna = () => {
    // Increment key to force VoiceChat remount and reset its state
    setVoiceChatKey(prev => prev + 1);
    setCurrentStep("voiceChat");
  };

  return (
    <AnimatePresence mode="wait">
      {currentStep === "welcome" && (
        <motion.div
          key="welcome"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <WelcomeScreen onStart={() => setCurrentStep("auth")} />
        </motion.div>
      )}

      {currentStep === "auth" && (
        <motion.div
          key="auth"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <AuthScreen
            onBack={() => setCurrentStep("welcome")}
            onSuccess={handleAuthSuccess}
          />
        </motion.div>
      )}

      {currentStep === "privacy" && (
        <motion.div
          key="privacy"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <PrivacyDisclaimer
            onAccept={() => setCurrentStep("microphone")}
            onBack={() => setCurrentStep("welcome")}
          />
        </motion.div>
      )}

      {currentStep === "microphone" && (
        <motion.div
          key="microphone"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <MicrophonePermission
            onPermissionGranted={() => setCurrentStep("voiceChat")}
            onBack={() => setCurrentStep("privacy")}
          />
        </motion.div>
      )}

      {currentStep === "voiceChat" && user && (
        <motion.div
          key={`voiceChat-${voiceChatKey}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <VoiceChat
            userId={user.id}
            onComplete={handleVoiceChatComplete}
            onExit={() => setCurrentStep(profileData ? "report" : "welcome")}
          />
        </motion.div>
      )}

      {currentStep === "report" && (
        <motion.div
          key="report"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ProfileReport
            profileData={profileData}
            onFindMatch={() => setCurrentStep("matching")}
            onTalkToLuna={handleTalkToLuna}
          />
        </motion.div>
      )}

      {currentStep === "matching" && (
        <motion.div
          key="matching"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="min-h-screen flex items-center justify-center bg-warm-gradient px-6"
        >
          <div className="text-center">
            <motion.div
              className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <motion.div
                className="w-16 h-16 rounded-full bg-primary/20"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">
              Finding Your Match
            </h2>
            <p className="text-muted-foreground">
              Analyzing your conversation to find someone special...
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Index;
