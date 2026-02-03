import { useState, useEffect } from "react";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { VoiceChat } from "@/components/VoiceChat";
import { ProfileReport } from "@/components/ProfileReport";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type AppStep = "welcome" | "voiceChat" | "report" | "profileView" | "matching";

const Index = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>("welcome");
  const [profileData, setProfileData] = useState<any>(null);
  const [voiceChatKey, setVoiceChatKey] = useState(0);
  const { user, signOut } = useAuth();

  const handleAuthSuccess = () => {
    setCurrentStep("voiceChat");
  };

  const handleVoiceChatComplete = (data: any) => {
    setProfileData(data);
    setCurrentStep("report");
  };

  const handleTalkToLuna = () => {
    setVoiceChatKey(prev => prev + 1);
    setCurrentStep("voiceChat");
  };

  const handleViewProfile = async () => {
    if (!user) return;

    // Load existing profile from DB
    const { data, error } = await supabase
      .from('user_profiles')
      .select('profile')
      .eq('user_id', user.id)
      .single();

    if (!error && data?.profile) {
      setProfileData(data.profile);
      setCurrentStep("profileView");
    }
  };

  const handleLogout = async () => {
    await signOut();
    setProfileData(null);
    setCurrentStep("welcome");
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
          <WelcomeScreen onSuccess={handleAuthSuccess} />
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
            onViewProfile={handleViewProfile}
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
            onLogout={handleLogout}
          />
        </motion.div>
      )}

      {currentStep === "profileView" && (
        <motion.div
          key="profileView"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ProfileReport
            profileData={profileData}
            onFindMatch={() => setCurrentStep("matching")}
            onTalkToLuna={handleTalkToLuna}
            onLogout={handleLogout}
            onBack={() => setCurrentStep("voiceChat")}
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
              className="w-24 h-24 mx-auto mb-6 rounded-full bg-cyan-500/10 flex items-center justify-center"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <motion.div
                className="w-16 h-16 rounded-full bg-cyan-500/20"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
            <h2 className="text-2xl font-display font-bold text-white mb-2">
              Recherche en cours
            </h2>
            <p className="text-white/50">
              Analyse de votre profil pour trouver quelqu'un de spécial...
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Index;
