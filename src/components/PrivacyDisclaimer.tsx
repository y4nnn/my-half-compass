import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Eye, ArrowRight } from "lucide-react";

interface PrivacyDisclaimerProps {
  onAccept: () => void;
  onBack: () => void;
}

export function PrivacyDisclaimer({ onAccept, onBack }: PrivacyDisclaimerProps) {
  const privacyPoints = [
    {
      icon: Shield,
      title: "Sûr et confidentiel",
      description: "Votre conversation reste entre vous et notre IA. Nous ne partageons jamais vos histoires personnelles.",
    },
    {
      icon: Lock,
      title: "Matching sécurisé",
      description: "Nous utilisons uniquement les thèmes et patterns de votre conversation pour trouver des matchs compatibles—jamais les détails spécifiques.",
    },
    {
      icon: Eye,
      title: "Vous gardez le contrôle",
      description: "C'est vous qui décidez ce que vous partagez avec votre match. Votre conversation complète n'est jamais visible par d'autres.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-warm-gradient">
      <motion.div
        className="max-w-md w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">
            Votre vie privée compte
          </h2>
          <p className="text-muted-foreground">
            Avant de commencer, voici comment nous vous protégeons
          </p>
        </motion.div>

        {/* Privacy Points */}
        <motion.div
          className="space-y-4 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {privacyPoints.map((point, index) => (
            <motion.div
              key={point.title}
              className="p-5 rounded-2xl bg-card border border-border/50"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                  <point.icon className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    {point.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {point.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Actions */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Button
            onClick={onAccept}
            size="lg"
            className="w-full h-14 text-lg rounded-2xl font-semibold shadow-glow transition-all hover:shadow-warm hover:scale-[1.02] group"
          >
            J'ai compris
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button
            onClick={onBack}
            variant="ghost"
            className="w-full h-12 text-muted-foreground hover:text-foreground"
          >
            Retour
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}