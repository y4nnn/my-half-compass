import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  User,
  Brain,
  Heart,
  Target,
  Sparkles,
  MessageCircle,
  Compass,
  Shield,
  Star,
  ChevronDown,
  Mic
} from "lucide-react";
import { useState } from "react";

interface ProfileReportProps {
  profileData: any;
  onFindMatch: () => void;
  onTalkToLuna: () => void;
}

interface TraitScoreProps {
  label: string;
  score: number;
  explanation?: string;
}

function TraitScore({ label, score, explanation }: TraitScoreProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm text-primary font-semibold">{score}/10</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${score * 10}%` }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      </div>
      {explanation && (
        <p className="text-xs text-muted-foreground">{explanation}</p>
      )}
    </div>
  );
}

interface SectionCardProps {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function SectionCard({ icon: Icon, title, children, defaultOpen = false }: SectionCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <motion.div
      className="rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        <ChevronDown 
          className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      
      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="px-4 pb-4 pt-0">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

function TagList({ items, color = "primary" }: { items: string[]; color?: string }) {
  if (!items || items.length === 0) return <p className="text-sm text-muted-foreground italic">Non mentionné</p>;
  
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, idx) => (
        <span
          key={idx}
          className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground font-medium text-right max-w-[60%]">
        {value || "Non mentionné"}
      </span>
    </div>
  );
}

export function ProfileReport({ profileData, onFindMatch, onTalkToLuna }: ProfileReportProps) {
  // Map the analyze-profile structure to display fields
  const {
    basicInfo,
    identityAndSelfConcept,
    temperament,
    emotionRegulation,
    cognitiveStyle,
    motivation,
    personalityTraits,
    interpersonalStyle,
    socialCognition,
    behavioralPatterns,
    strengthsAndProtectiveFactors,
    vulnerabilities,
    developmentalFactors,
    relationshipProfile,
    overallSummary,
    keyInsights,
    matchingKeywords,
    compatibilityFactors,
    dimensionsCovered,
    dimensionsToExplore
  } = profileData || {};

  return (
    <div className="min-h-screen bg-warm-gradient">
      {/* Header */}
      <motion.div
        className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <User className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Votre profil</h1>
            <p className="text-sm text-muted-foreground">Analyse complète</p>
          </div>
        </div>
      </motion.div>

      <div className="px-4 py-6 pb-32 space-y-4">
        {/* Summary Card */}
        <motion.div
          className="p-5 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-start gap-3 mb-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5" />
            <h2 className="font-semibold text-foreground">Résumé</h2>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">
            {overallSummary || "Votre profil est en cours de génération..."}
          </p>
        </motion.div>

        {/* Matching Keywords */}
        {matchingKeywords && matchingKeywords.length > 0 && (
          <motion.div
            className="p-4 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Mots-clés de matching</h3>
            <TagList items={matchingKeywords} />
          </motion.div>
        )}

        {/* Basic Info */}
        {basicInfo && (
          <SectionCard icon={User} title="Informations personnelles" defaultOpen>
            <div className="space-y-0">
              <InfoRow label="Prénom" value={basicInfo.name} />
              <InfoRow label="Âge" value={basicInfo.ageRange} />
              <InfoRow label="Localisation" value={basicInfo.location} />
              <InfoRow label="Profession" value={basicInfo.occupation} />
              <InfoRow label="Situation" value={basicInfo.livingSituation} />
            </div>
          </SectionCard>
        )}

        {/* Personality Traits (Big Five) */}
        {personalityTraits && (
          <SectionCard icon={Brain} title="Traits de personnalité (Big Five)" defaultOpen>
            <div className="space-y-4">
              {personalityTraits.openness && (
                <TraitScore
                  label="Ouverture d'esprit"
                  score={personalityTraits.openness.score}
                  explanation={personalityTraits.openness.explanation}
                />
              )}
              {personalityTraits.conscientiousness && (
                <TraitScore
                  label="Conscienciosité"
                  score={personalityTraits.conscientiousness.score}
                  explanation={personalityTraits.conscientiousness.explanation}
                />
              )}
              {personalityTraits.extraversion && (
                <TraitScore
                  label="Extraversion"
                  score={personalityTraits.extraversion.score}
                  explanation={personalityTraits.extraversion.explanation}
                />
              )}
              {personalityTraits.agreeableness && (
                <TraitScore
                  label="Agréabilité"
                  score={personalityTraits.agreeableness.score}
                  explanation={personalityTraits.agreeableness.explanation}
                />
              )}
              {personalityTraits.neuroticism && (
                <TraitScore
                  label="Névrosisme"
                  score={personalityTraits.neuroticism.score}
                  explanation={personalityTraits.neuroticism.explanation}
                />
              )}
              {personalityTraits.honestyHumility && (
                <div className="pt-2 border-t border-border/30">
                  <InfoRow label="Honnêteté-Humilité" value={personalityTraits.honestyHumility} />
                </div>
              )}
              {personalityTraits.assertivenessStyle && (
                <InfoRow label="Style d'assertivité" value={personalityTraits.assertivenessStyle} />
              )}
            </div>
          </SectionCard>
        )}

        {/* Interpersonal Style */}
        {interpersonalStyle && (
          <SectionCard icon={Heart} title="Style interpersonnel & attachement">
            <div className="space-y-4">
              {interpersonalStyle.attachmentPattern && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Pattern d'attachement</p>
                  <span className="inline-block px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-medium">
                    {interpersonalStyle.attachmentPattern}
                  </span>
                </div>
              )}
              <InfoRow label="Style de confiance" value={interpersonalStyle.trustStyle} />
              <InfoRow label="Communication" value={interpersonalStyle.communicationStyle} />
              <InfoRow label="Gestion des conflits" value={interpersonalStyle.conflictStyle} />
              <InfoRow label="Limites personnelles" value={interpersonalStyle.boundaryQuality} />
              <InfoRow label="Empathie" value={interpersonalStyle.empathyAndMentalization} />
            </div>
          </SectionCard>
        )}

        {/* Relationship Profile */}
        {relationshipProfile && (
          <SectionCard icon={Heart} title="Profil relationnel">
            <div className="space-y-4">
              {relationshipProfile.loveLanguages && relationshipProfile.loveLanguages.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Langages de l'amour</p>
                  <TagList items={relationshipProfile.loveLanguages} />
                </div>
              )}
              {relationshipProfile.idealPartnerQualities && relationshipProfile.idealPartnerQualities.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Qualités recherchées chez un partenaire</p>
                  <TagList items={relationshipProfile.idealPartnerQualities} />
                </div>
              )}
              {relationshipProfile.dealBreakers && relationshipProfile.dealBreakers.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Rédhibitoires</p>
                  <TagList items={relationshipProfile.dealBreakers} />
                </div>
              )}
              {relationshipProfile.relationshipGoals && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Objectifs relationnels</p>
                  <p className="text-sm text-foreground">{relationshipProfile.relationshipGoals}</p>
                </div>
              )}
              {relationshipProfile.pastRelationshipPatterns && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Patterns passés</p>
                  <p className="text-sm text-foreground">{relationshipProfile.pastRelationshipPatterns}</p>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Identity & Self-Concept */}
        {identityAndSelfConcept && (
          <SectionCard icon={Compass} title="Identité & Concept de soi">
            <div className="space-y-3">
              <InfoRow label="Estime de soi" value={identityAndSelfConcept.selfEsteemStability} />
              <InfoRow label="Cohérence identitaire" value={identityAndSelfConcept.identityCoherence} />
              <InfoRow label="Sentiment d'efficacité" value={identityAndSelfConcept.selfEfficacy} />
              <InfoRow label="Locus de contrôle" value={identityAndSelfConcept.locusOfControl} />
              <InfoRow label="Mentalité" value={identityAndSelfConcept.growthMindset} />
              {identityAndSelfConcept.coreValues && identityAndSelfConcept.coreValues.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Valeurs fondamentales</p>
                  <TagList items={identityAndSelfConcept.coreValues} />
                </div>
              )}
              {identityAndSelfConcept.meaningSource && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Sources de sens</p>
                  <p className="text-sm text-foreground">{identityAndSelfConcept.meaningSource}</p>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Motivation */}
        {motivation && (
          <SectionCard icon={Target} title="Motivation & Objectifs">
            <div className="space-y-3">
              <InfoRow label="Approche vs Évitement" value={motivation.approachVsAvoidance} />
              <InfoRow label="Motivation" value={motivation.intrinsicVsExtrinsic} />
              <InfoRow label="Horizon temporel" value={motivation.timeHorizon} />
              <InfoRow label="Persévérance (Grit)" value={motivation.grit} />
              <InfoRow label="Style d'accomplissement" value={motivation.achievementStyle} />
              <InfoRow label="Tolérance au risque" value={motivation.riskTolerance} />
              {motivation.procrastinationType && (
                <InfoRow label="Procrastination" value={motivation.procrastinationType} />
              )}
            </div>
          </SectionCard>
        )}

        {/* Temperament */}
        {temperament && (
          <SectionCard icon={Star} title="Tempérament & Réactivité">
            <div className="space-y-3">
              <InfoRow label="Intensité émotionnelle" value={temperament.emotionalIntensity} />
              <InfoRow label="Stabilité de l'humeur" value={temperament.emotionalLability} />
              <InfoRow label="Sensibilité à la menace" value={temperament.threatSensitivity} />
              <InfoRow label="Sensibilité à la récompense" value={temperament.rewardSensitivity} />
              <InfoRow label="Réactivité au stress" value={temperament.stressReactivity} />
              <InfoRow label="Niveau d'activation de base" value={temperament.baselineArousal} />
              <InfoRow label="Tolérance à la frustration" value={temperament.frustrationTolerance} />
            </div>
          </SectionCard>
        )}

        {/* Emotion Regulation */}
        {emotionRegulation && (
          <SectionCard icon={MessageCircle} title="Régulation émotionnelle">
            <div className="space-y-3">
              <InfoRow label="Conscience émotionnelle" value={emotionRegulation.emotionalAwareness} />
              <InfoRow label="Contrôle des impulsions" value={emotionRegulation.impulseControl} />
              <InfoRow label="Orientation coping" value={emotionRegulation.copingOrientation} />
              <InfoRow label="Résilience" value={emotionRegulation.resilience} />
              {emotionRegulation.adaptiveStrategies && emotionRegulation.adaptiveStrategies.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Stratégies adaptatives</p>
                  <TagList items={emotionRegulation.adaptiveStrategies} />
                </div>
              )}
              {emotionRegulation.maladaptiveStrategies && emotionRegulation.maladaptiveStrategies.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Stratégies à améliorer</p>
                  <TagList items={emotionRegulation.maladaptiveStrategies} />
                </div>
              )}
              {emotionRegulation.defenseMechanisms && emotionRegulation.defenseMechanisms.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Mécanismes de défense</p>
                  <TagList items={emotionRegulation.defenseMechanisms} />
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Cognitive Style */}
        {cognitiveStyle && (
          <SectionCard icon={Brain} title="Style cognitif">
            <div className="space-y-3">
              <InfoRow label="Analytique vs Intuitif" value={cognitiveStyle.analyticalVsIntuitive} />
              <InfoRow label="Tolérance à la complexité" value={cognitiveStyle.complexityTolerance} />
              <InfoRow label="Flexibilité cognitive" value={cognitiveStyle.cognitiveFlexibility} />
              <InfoRow label="Métacognition" value={cognitiveStyle.metacognition} />
              <InfoRow label="Curiosité" value={cognitiveStyle.curiosityAndHumility} />
              {cognitiveStyle.cognitiveDistortions && cognitiveStyle.cognitiveDistortions.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Biais cognitifs tendanciels</p>
                  <TagList items={cognitiveStyle.cognitiveDistortions} />
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Social Cognition */}
        {socialCognition && (
          <SectionCard icon={Shield} title="Vision du monde">
            <div className="space-y-3">
              <InfoRow label="Croyances sur les gens" value={socialCognition.beliefsAboutPeople} />
              <InfoRow label="Sensibilité à la justice" value={socialCognition.justiceSensitivity} />
              <InfoRow label="Cynisme vs Idéalisme" value={socialCognition.cynicismVsIdealism} />
              <InfoRow label="Tolérance à la différence" value={socialCognition.toleranceForDifference} />
            </div>
          </SectionCard>
        )}

        {/* Strengths & Protective Factors */}
        {strengthsAndProtectiveFactors && (
          <SectionCard icon={Star} title="Forces & Facteurs protecteurs">
            <div className="space-y-4">
              {strengthsAndProtectiveFactors.characterStrengths && strengthsAndProtectiveFactors.characterStrengths.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Forces de caractère</p>
                  <TagList items={strengthsAndProtectiveFactors.characterStrengths} />
                </div>
              )}
              <InfoRow label="Supports sociaux" value={strengthsAndProtectiveFactors.socialSupports} />
              {strengthsAndProtectiveFactors.skillsRepertoire && strengthsAndProtectiveFactors.skillsRepertoire.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Compétences</p>
                  <TagList items={strengthsAndProtectiveFactors.skillsRepertoire} />
                </div>
              )}
              <InfoRow label="Systèmes de sens" value={strengthsAndProtectiveFactors.meaningSystems} />
            </div>
          </SectionCard>
        )}

        {/* Developmental Factors */}
        {developmentalFactors && (
          <SectionCard icon={Sparkles} title="Contexte & Développement">
            <div className="space-y-4">
              <InfoRow label="Environnement précoce" value={developmentalFactors.earlyEnvironment} />
              <InfoRow label="Contexte culturel" value={developmentalFactors.culturalContext} />
              <InfoRow label="Environnement actuel" value={developmentalFactors.currentEnvironment} />
              {developmentalFactors.lifeEvents && developmentalFactors.lifeEvents.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Événements de vie marquants</p>
                  <ul className="space-y-2">
                    {developmentalFactors.lifeEvents.map((event: string, idx: number) => (
                      <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        {event}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Key Insights */}
        {keyInsights && keyInsights.length > 0 && (
          <motion.div
            className="p-4 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Insights clés</h3>
            <ul className="space-y-2">
              {keyInsights.map((insight: string, idx: number) => (
                <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Dimensions to explore */}
        {dimensionsToExplore && dimensionsToExplore.length > 0 && (
          <motion.div
            className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="text-sm font-semibold text-amber-600 mb-3">À explorer lors des prochaines sessions</h3>
            <TagList items={dimensionsToExplore} />
          </motion.div>
        )}

        {/* Compatibility Factors */}
        {compatibilityFactors && compatibilityFactors.length > 0 && (
          <motion.div
            className="p-4 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Facteurs de compatibilité</h3>
            <TagList items={compatibilityFactors} />
          </motion.div>
        )}
      </div>

      {/* Bottom CTA */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="space-y-3">
          <Button
            onClick={onTalkToLuna}
            size="lg"
            className="w-full h-14 text-lg rounded-2xl font-semibold shadow-glow transition-all hover:shadow-warm hover:scale-[1.02]"
          >
            <Mic className="w-5 h-5 mr-2" />
            Parler à Luna
          </Button>
          {/* Matching button disabled for now - will be enabled later */}
          {/* <Button
            onClick={onFindMatch}
            size="lg"
            variant="outline"
            className="w-full h-12 text-base rounded-2xl font-semibold"
          >
            Trouver mon match
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button> */}
        </div>
      </motion.div>
    </div>
  );
}