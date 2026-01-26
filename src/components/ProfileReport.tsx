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
  ChevronDown
} from "lucide-react";
import { useState } from "react";

interface ProfileReportProps {
  profileData: any;
  onFindMatch: () => void;
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

export function ProfileReport({ profileData, onFindMatch }: ProfileReportProps) {
  const {
    personalBackground,
    personalityTraits,
    lifeExperiences,
    valuesAndBeliefs,
    relationshipStyle,
    goalsAndAspirations,
    interestsAndHobbies,
    dealBreakersAndMustHaves,
    communicationStyle,
    emotionalProfile,
    overallSummary,
    matchingKeywords,
    compatibilityFactors
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

        {/* Personal Background */}
        {personalBackground && (
          <SectionCard icon={User} title="Informations personnelles" defaultOpen>
            <div className="space-y-0">
              <InfoRow label="Âge" value={personalBackground.ageRange} />
              <InfoRow label="Localisation" value={personalBackground.location} />
              <InfoRow label="Profession" value={personalBackground.occupation} />
              <InfoRow label="Études" value={personalBackground.education} />
              <InfoRow label="Situation" value={personalBackground.livingSituation} />
            </div>
          </SectionCard>
        )}

        {/* Personality Traits */}
        {personalityTraits && (
          <SectionCard icon={Brain} title="Traits de personnalité" defaultOpen>
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
                  label="Conscience" 
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
              {personalityTraits.emotionalStability && (
                <TraitScore 
                  label="Stabilité émotionnelle" 
                  score={personalityTraits.emotionalStability.score}
                  explanation={personalityTraits.emotionalStability.explanation}
                />
              )}
            </div>
          </SectionCard>
        )}

        {/* Relationship Style */}
        {relationshipStyle && (
          <SectionCard icon={Heart} title="Style relationnel">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Style d'attachement</p>
                <span className="inline-block px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-medium">
                  {relationshipStyle.attachmentStyle || "Non déterminé"}
                </span>
              </div>
              
              {relationshipStyle.loveLanguages && relationshipStyle.loveLanguages.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Langages de l'amour</p>
                  <TagList items={relationshipStyle.loveLanguages} />
                </div>
              )}
              
              {relationshipStyle.pastPatterns && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Patterns relationnels</p>
                  <p className="text-sm text-foreground">{relationshipStyle.pastPatterns}</p>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Values & Beliefs */}
        {valuesAndBeliefs && (
          <SectionCard icon={Compass} title="Valeurs & Croyances">
            <div className="space-y-4">
              {valuesAndBeliefs.coreValues && valuesAndBeliefs.coreValues.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Valeurs fondamentales</p>
                  <TagList items={valuesAndBeliefs.coreValues} />
                </div>
              )}
              
              {valuesAndBeliefs.lifePhilosophy && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Philosophie de vie</p>
                  <p className="text-sm text-foreground">{valuesAndBeliefs.lifePhilosophy}</p>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Goals & Aspirations */}
        {goalsAndAspirations && (
          <SectionCard icon={Target} title="Objectifs & Aspirations">
            <div className="space-y-4">
              {goalsAndAspirations.shortTermGoals && goalsAndAspirations.shortTermGoals.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Objectifs court terme</p>
                  <ul className="space-y-1">
                    {goalsAndAspirations.shortTermGoals.map((goal: string, idx: number) => (
                      <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        {goal}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {goalsAndAspirations.longTermVision && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Vision long terme</p>
                  <p className="text-sm text-foreground">{goalsAndAspirations.longTermVision}</p>
                </div>
              )}
              
              {goalsAndAspirations.relationshipGoals && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Objectifs relationnels</p>
                  <p className="text-sm text-foreground">{goalsAndAspirations.relationshipGoals}</p>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Interests & Hobbies */}
        {interestsAndHobbies && (
          <SectionCard icon={Star} title="Intérêts & Loisirs">
            <div className="space-y-4">
              {interestsAndHobbies.activeHobbies && interestsAndHobbies.activeHobbies.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Hobbies actifs</p>
                  <TagList items={interestsAndHobbies.activeHobbies} />
                </div>
              )}
              
              {interestsAndHobbies.passiveInterests && interestsAndHobbies.passiveInterests.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Intérêts</p>
                  <TagList items={interestsAndHobbies.passiveInterests} />
                </div>
              )}
              
              {interestsAndHobbies.socialActivities && interestsAndHobbies.socialActivities.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Activités sociales</p>
                  <TagList items={interestsAndHobbies.socialActivities} />
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Communication Style */}
        {communicationStyle && (
          <SectionCard icon={MessageCircle} title="Style de communication">
            <div className="space-y-3">
              <InfoRow label="Expression" value={communicationStyle.expressionStyle} />
              <InfoRow label="Expressivité émotionnelle" value={communicationStyle.emotionalExpressiveness} />
              <InfoRow label="Gestion des conflits" value={communicationStyle.conflictResolution} />
            </div>
          </SectionCard>
        )}

        {/* Deal Breakers */}
        {dealBreakersAndMustHaves && (
          <SectionCard icon={Shield} title="Critères de matching">
            <div className="space-y-4">
              {dealBreakersAndMustHaves.idealPartnerQualities && dealBreakersAndMustHaves.idealPartnerQualities.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Qualités recherchées</p>
                  <TagList items={dealBreakersAndMustHaves.idealPartnerQualities} />
                </div>
              )}
              
              {dealBreakersAndMustHaves.nonNegotiables && dealBreakersAndMustHaves.nonNegotiables.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Non-négociables</p>
                  <TagList items={dealBreakersAndMustHaves.nonNegotiables} />
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Emotional Profile */}
        {emotionalProfile && (
          <SectionCard icon={Heart} title="Profil émotionnel">
            <div className="space-y-4">
              {emotionalProfile.currentState && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">État actuel</p>
                  <p className="text-sm text-foreground">{emotionalProfile.currentState}</p>
                </div>
              )}
              
              {emotionalProfile.copingMechanisms && emotionalProfile.copingMechanisms.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Mécanismes d'adaptation</p>
                  <TagList items={emotionalProfile.copingMechanisms} />
                </div>
              )}
              
              {emotionalProfile.emotionalIntelligence && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Intelligence émotionnelle</p>
                  <p className="text-sm text-foreground">{emotionalProfile.emotionalIntelligence}</p>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Life Experiences */}
        {lifeExperiences && (
          <SectionCard icon={Sparkles} title="Expériences de vie">
            <div className="space-y-4">
              {lifeExperiences.keyEvents && lifeExperiences.keyEvents.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Événements marquants</p>
                  <ul className="space-y-2">
                    {lifeExperiences.keyEvents.map((event: string, idx: number) => (
                      <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        {event}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {lifeExperiences.challengesOvercome && lifeExperiences.challengesOvercome.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Défis surmontés</p>
                  <ul className="space-y-2">
                    {lifeExperiences.challengesOvercome.map((challenge: string, idx: number) => (
                      <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        {challenge}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </SectionCard>
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
        <Button
          onClick={onFindMatch}
          size="lg"
          className="w-full h-14 text-lg rounded-2xl font-semibold shadow-glow transition-all hover:shadow-warm hover:scale-[1.02]"
        >
          Trouver mon match
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}