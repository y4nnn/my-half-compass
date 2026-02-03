import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  User,
  Brain,
  Heart,
  Target,
  Sparkles,
  MessageCircle,
  Compass,
  Shield,
  Star,
  Mic,
  BookOpen,
  Calendar,
  CheckCircle2,
  Circle,
  TrendingUp,
  ClipboardList,
  Lightbulb,
  Puzzle,
  HeartHandshake,
  Scale,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ArrowLeft,
} from "lucide-react";
import { useState, useRef, useCallback, ReactNode, useMemo } from "react";

// ─── Scenario definitions for progress display ───
const SCENARIO_ORDER: { id: string; name: string; required: boolean; sensitive?: boolean }[] = [
  { id: 'intro', name: 'Introduction', required: true },
  { id: 'love_history', name: 'Histoire amoureuse', required: true },
  { id: 'love_vision', name: "Vision de l'amour", required: true },
  { id: 'values', name: 'Valeurs & identité', required: true },
  { id: 'family', name: 'Famille & origines', required: false },
  { id: 'emotions', name: 'Émotions & sensibilité', required: false },
  { id: 'lifestyle', name: 'Mode de vie', required: false },
  { id: 'dreams', name: 'Rêves & aspirations', required: false },
  { id: 'wounds', name: 'Blessures & forces', required: false, sensitive: true },
  { id: 'childhood', name: 'Enfance & construction', required: false, sensitive: true },
  { id: 'work_career', name: 'Vie professionnelle', required: false },
  { id: 'parenting', name: 'Parentalité & avenir', required: false, sensitive: true },
  { id: 'traumas', name: 'Traumatismes & résilience', required: false, sensitive: true },
  { id: 'sexuality', name: 'Intimité & connexion', required: false, sensitive: true },
];

interface ScenarioSummary {
  explored?: boolean;
  summary?: string;
  keyFindings?: string[];
  patterns?: string[];
  confidence?: 'faible' | 'moyen' | 'élevé';
}

interface AssessmentResult {
  completed?: boolean;
  result?: string;
  explanation?: string;
  confidence?: 'faible' | 'moyen' | 'élevé';
  primary?: string;
  secondary?: string;
  givingStyle?: string;
  anxietyScore?: string;
  avoidanceScore?: string;
  correctAnswers?: number;
  totalQuestions?: number;
  areasOfStrength?: string[];
  valuesRevealed?: string[];
}

interface AssessmentResults {
  attachment_style?: AssessmentResult;
  love_language?: AssessmentResult;
  conflict_style?: AssessmentResult;
  emotional_intelligence?: AssessmentResult;
  situational_judgment?: AssessmentResult;
  logic_puzzles?: AssessmentResult;
  general_culture?: AssessmentResult;
}

const ASSESSMENT_CONFIG: { id: keyof AssessmentResults; name: string; icon: React.ElementType; color: string }[] = [
  { id: 'attachment_style', name: "Style d'attachement", icon: HeartHandshake, color: 'text-pink-400' },
  { id: 'love_language', name: "Langages de l'amour", icon: Heart, color: 'text-red-400' },
  { id: 'conflict_style', name: "Gestion des conflits", icon: Scale, color: 'text-orange-400' },
  { id: 'emotional_intelligence', name: "Intelligence émotionnelle", icon: Lightbulb, color: 'text-yellow-400' },
  { id: 'situational_judgment', name: "Jugement situationnel", icon: Compass, color: 'text-blue-400' },
  { id: 'logic_puzzles', name: "Raisonnement logique", icon: Puzzle, color: 'text-purple-400' },
  { id: 'general_culture', name: "Culture générale", icon: BookOpen, color: 'text-teal-400' },
];

// ─── Shared helper components ───
function TraitScore({ label, score, explanation }: { label: string; score: number; explanation?: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/90">{label}</span>
        <span className="text-sm text-cyan-400 font-semibold">{score}/10</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400/60 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${score * 10}%` }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      </div>
      {explanation && (
        <p className="text-xs text-white/40">{explanation}</p>
      )}
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return <p className="text-sm text-white/30 italic">Non mentionné</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, idx) => (
        <span
          key={idx}
          className="px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 text-sm font-medium"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-white/5 last:border-0 gap-4">
      <span className="text-sm text-white/40 flex-shrink-0">{label}</span>
      <span className="text-sm text-white/90 font-medium text-right">
        {value || "Non mentionné"}
      </span>
    </div>
  );
}

// ─── Page wrapper for swipeable screens ───
function PageContainer({ children, title, icon: Icon, iconColor }: {
  children: ReactNode;
  title: string;
  icon: React.ElementType;
  iconColor?: string;
}) {
  return (
    <div className="h-full flex flex-col px-5 pt-4 pb-28 overflow-y-auto">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor || 'text-cyan-400'}`} />
        </div>
        <h2 className="text-xl font-display font-bold text-white">{title}</h2>
      </div>
      <div className="flex-1 space-y-4">
        {children}
      </div>
    </div>
  );
}

function CardBlock({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`p-4 rounded-xl bg-white/5 border border-white/10 ${className}`}>
      {children}
    </div>
  );
}

// ─── Main component ───
interface ProfileReportProps {
  profileData: any;
  onFindMatch: () => void;
  onTalkToLuna: () => void;
  onLogout?: () => void;
  onBack?: () => void;
}

export function ProfileReport({ profileData, onFindMatch, onTalkToLuna, onLogout, onBack }: ProfileReportProps) {
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
    conversationJournal,
    overallSummary,
    keyInsights,
    matchingKeywords,
    compatibilityFactors,
    dimensionsCovered,
    dimensionsToExplore,
    scenarioSummaries,
    assessmentResults,
  } = profileData || {};

  // Build pages dynamically based on available data
  const pages = useMemo(() => {
    const result: { id: string; title: string; icon: React.ElementType; iconColor: string; render: () => ReactNode }[] = [];

    // Page 1: Summary + Progress (always present)
    result.push({
      id: 'summary',
      title: 'Résumé',
      icon: Sparkles,
      iconColor: 'text-cyan-400',
      render: () => (
        <>
          {/* Overall summary */}
          <CardBlock>
            <p className="text-sm text-white/80 leading-relaxed">
              {overallSummary || "Votre profil est en cours de génération..."}
            </p>
          </CardBlock>

          {/* Scenario Progress */}
          <CardBlock>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-white/90">Progression</span>
              </div>
              <span className="text-sm font-medium text-emerald-400">
                {SCENARIO_ORDER.filter(s => (scenarioSummaries || {})[s.id]?.explored).length}/{SCENARIO_ORDER.length}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.round((SCENARIO_ORDER.filter(s => (scenarioSummaries || {})[s.id]?.explored).length / SCENARIO_ORDER.length) * 100)}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
              />
            </div>
            <div className="space-y-2">
              {SCENARIO_ORDER.map((scenario) => {
                const summary = (scenarioSummaries || {})[scenario.id];
                const isExplored = summary?.explored;
                const confidence = summary?.confidence;
                const confColor = confidence === 'élevé' ? 'bg-green-500' : confidence === 'moyen' ? 'bg-amber-500' : 'bg-white/20';
                const confWidth = confidence === 'élevé' ? '100%' : confidence === 'moyen' ? '66%' : confidence === 'faible' ? '33%' : '0%';
                return (
                  <div key={scenario.id} className="flex items-center gap-3">
                    {isExplored ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-white/20 flex-shrink-0" />
                    )}
                    <span className={`text-sm flex-1 ${isExplored ? 'text-white/80' : 'text-white/30'}`}>
                      {scenario.name}
                      {scenario.required && !isExplored && <span className="text-xs text-amber-400 ml-1">*</span>}
                    </span>
                    <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${confColor}`} style={{ width: confWidth }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBlock>

          {/* Matching keywords */}
          {matchingKeywords && matchingKeywords.length > 0 && (
            <CardBlock>
              <p className="text-xs text-white/40 mb-2">Mots-clés de matching</p>
              <TagList items={matchingKeywords} />
            </CardBlock>
          )}
        </>
      ),
    });

    // Page 2: Basic Info + Personality Traits
    if (basicInfo || personalityTraits) {
      result.push({
        id: 'personality',
        title: 'Personnalité',
        icon: Brain,
        iconColor: 'text-violet-400',
        render: () => (
          <>
            {basicInfo && (
              <CardBlock>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-white/40" />
                  <span className="text-sm font-semibold text-white/60">Infos personnelles</span>
                </div>
                <InfoRow label="Prénom" value={basicInfo.name} />
                <InfoRow label="Âge" value={basicInfo.ageRange} />
                <InfoRow label="Localisation" value={basicInfo.location} />
                <InfoRow label="Profession" value={basicInfo.occupation} />
                <InfoRow label="Situation" value={basicInfo.livingSituation} />
              </CardBlock>
            )}

            {personalityTraits && (
              <CardBlock>
                <p className="text-sm font-semibold text-white/60 mb-4">Big Five</p>
                <div className="space-y-4">
                  {personalityTraits.openness && (
                    <TraitScore label="Ouverture d'esprit" score={personalityTraits.openness.score} explanation={personalityTraits.openness.explanation} />
                  )}
                  {personalityTraits.conscientiousness && (
                    <TraitScore label="Conscienciosité" score={personalityTraits.conscientiousness.score} explanation={personalityTraits.conscientiousness.explanation} />
                  )}
                  {personalityTraits.extraversion && (
                    <TraitScore label="Extraversion" score={personalityTraits.extraversion.score} explanation={personalityTraits.extraversion.explanation} />
                  )}
                  {personalityTraits.agreeableness && (
                    <TraitScore label="Agréabilité" score={personalityTraits.agreeableness.score} explanation={personalityTraits.agreeableness.explanation} />
                  )}
                  {personalityTraits.neuroticism && (
                    <TraitScore label="Névrosisme" score={personalityTraits.neuroticism.score} explanation={personalityTraits.neuroticism.explanation} />
                  )}
                  {personalityTraits.honestyHumility && (
                    <InfoRow label="Honnêteté-Humilité" value={personalityTraits.honestyHumility} />
                  )}
                  {personalityTraits.assertivenessStyle && (
                    <InfoRow label="Style d'assertivité" value={personalityTraits.assertivenessStyle} />
                  )}
                </div>
              </CardBlock>
            )}
          </>
        ),
      });
    }

    // Page 3: Interpersonal + Relationship
    if (interpersonalStyle || relationshipProfile) {
      result.push({
        id: 'relationships',
        title: 'Relations',
        icon: Heart,
        iconColor: 'text-pink-400',
        render: () => (
          <>
            {interpersonalStyle && (
              <CardBlock>
                <p className="text-sm font-semibold text-white/60 mb-3">Style interpersonnel</p>
                {interpersonalStyle.attachmentPattern && (
                  <div className="mb-3">
                    <p className="text-xs text-white/40 mb-1.5">Pattern d'attachement</p>
                    <span className="inline-block px-3 py-1.5 rounded-full bg-pink-500/10 text-pink-400 text-sm font-medium">
                      {interpersonalStyle.attachmentPattern}
                    </span>
                  </div>
                )}
                <InfoRow label="Confiance" value={interpersonalStyle.trustStyle} />
                <InfoRow label="Communication" value={interpersonalStyle.communicationStyle} />
                <InfoRow label="Conflits" value={interpersonalStyle.conflictStyle} />
                <InfoRow label="Limites" value={interpersonalStyle.boundaryQuality} />
                <InfoRow label="Empathie" value={interpersonalStyle.empathyAndMentalization} />
              </CardBlock>
            )}

            {relationshipProfile && (
              <CardBlock>
                <p className="text-sm font-semibold text-white/60 mb-3">Profil relationnel</p>
                {relationshipProfile.loveLanguages?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-white/40 mb-2">Langages de l'amour</p>
                    <TagList items={relationshipProfile.loveLanguages} />
                  </div>
                )}
                {relationshipProfile.idealPartnerQualities?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-white/40 mb-2">Qualités recherchées</p>
                    <TagList items={relationshipProfile.idealPartnerQualities} />
                  </div>
                )}
                {relationshipProfile.dealBreakers?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-white/40 mb-2">Rédhibitoires</p>
                    <TagList items={relationshipProfile.dealBreakers} />
                  </div>
                )}
                {relationshipProfile.relationshipGoals && (
                  <div className="mb-3">
                    <p className="text-xs text-white/40 mb-1">Objectifs</p>
                    <p className="text-sm text-white/80">{relationshipProfile.relationshipGoals}</p>
                  </div>
                )}
                {relationshipProfile.pastRelationshipPatterns && (
                  <div>
                    <p className="text-xs text-white/40 mb-1">Patterns passés</p>
                    <p className="text-sm text-white/80">{relationshipProfile.pastRelationshipPatterns}</p>
                  </div>
                )}
              </CardBlock>
            )}
          </>
        ),
      });
    }

    // Page 4: Identity + Motivation + Cognition
    if (identityAndSelfConcept || motivation || cognitiveStyle) {
      result.push({
        id: 'identity',
        title: 'Identité',
        icon: Compass,
        iconColor: 'text-blue-400',
        render: () => (
          <>
            {identityAndSelfConcept && (
              <CardBlock>
                <p className="text-sm font-semibold text-white/60 mb-3">Concept de soi</p>
                <InfoRow label="Estime de soi" value={identityAndSelfConcept.selfEsteemStability} />
                <InfoRow label="Cohérence identitaire" value={identityAndSelfConcept.identityCoherence} />
                <InfoRow label="Sentiment d'efficacité" value={identityAndSelfConcept.selfEfficacy} />
                <InfoRow label="Locus de contrôle" value={identityAndSelfConcept.locusOfControl} />
                <InfoRow label="Mentalité" value={identityAndSelfConcept.growthMindset} />
                {identityAndSelfConcept.coreValues?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-white/40 mb-2">Valeurs fondamentales</p>
                    <TagList items={identityAndSelfConcept.coreValues} />
                  </div>
                )}
              </CardBlock>
            )}

            {motivation && (
              <CardBlock>
                <p className="text-sm font-semibold text-white/60 mb-3">Motivation</p>
                <InfoRow label="Approche/Évitement" value={motivation.approachVsAvoidance} />
                <InfoRow label="Motivation" value={motivation.intrinsicVsExtrinsic} />
                <InfoRow label="Horizon temporel" value={motivation.timeHorizon} />
                <InfoRow label="Persévérance" value={motivation.grit} />
                <InfoRow label="Accomplissement" value={motivation.achievementStyle} />
                <InfoRow label="Tolérance au risque" value={motivation.riskTolerance} />
              </CardBlock>
            )}

            {cognitiveStyle && (
              <CardBlock>
                <p className="text-sm font-semibold text-white/60 mb-3">Style cognitif</p>
                <InfoRow label="Analytique/Intuitif" value={cognitiveStyle.analyticalVsIntuitive} />
                <InfoRow label="Complexité" value={cognitiveStyle.complexityTolerance} />
                <InfoRow label="Flexibilité" value={cognitiveStyle.cognitiveFlexibility} />
                <InfoRow label="Métacognition" value={cognitiveStyle.metacognition} />
                <InfoRow label="Curiosité" value={cognitiveStyle.curiosityAndHumility} />
                {cognitiveStyle.cognitiveDistortions?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-white/40 mb-2">Biais cognitifs</p>
                    <TagList items={cognitiveStyle.cognitiveDistortions} />
                  </div>
                )}
              </CardBlock>
            )}
          </>
        ),
      });
    }

    // Page 5: Emotions + Temperament
    if (temperament || emotionRegulation) {
      result.push({
        id: 'emotions',
        title: 'Émotions',
        icon: MessageCircle,
        iconColor: 'text-amber-400',
        render: () => (
          <>
            {temperament && (
              <CardBlock>
                <p className="text-sm font-semibold text-white/60 mb-3">Tempérament</p>
                <InfoRow label="Intensité émotionnelle" value={temperament.emotionalIntensity} />
                <InfoRow label="Stabilité de l'humeur" value={temperament.emotionalLability} />
                <InfoRow label="Sensibilité menace" value={temperament.threatSensitivity} />
                <InfoRow label="Sensibilité récompense" value={temperament.rewardSensitivity} />
                <InfoRow label="Réactivité au stress" value={temperament.stressReactivity} />
                <InfoRow label="Activation de base" value={temperament.baselineArousal} />
                <InfoRow label="Tolérance frustration" value={temperament.frustrationTolerance} />
              </CardBlock>
            )}

            {emotionRegulation && (
              <CardBlock>
                <p className="text-sm font-semibold text-white/60 mb-3">Régulation émotionnelle</p>
                <InfoRow label="Conscience" value={emotionRegulation.emotionalAwareness} />
                <InfoRow label="Contrôle impulsions" value={emotionRegulation.impulseControl} />
                <InfoRow label="Coping" value={emotionRegulation.copingOrientation} />
                <InfoRow label="Résilience" value={emotionRegulation.resilience} />
                {emotionRegulation.adaptiveStrategies?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-white/40 mb-2">Stratégies adaptatives</p>
                    <TagList items={emotionRegulation.adaptiveStrategies} />
                  </div>
                )}
                {emotionRegulation.maladaptiveStrategies?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-white/40 mb-2">Stratégies à améliorer</p>
                    <TagList items={emotionRegulation.maladaptiveStrategies} />
                  </div>
                )}
                {emotionRegulation.defenseMechanisms?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-white/40 mb-2">Mécanismes de défense</p>
                    <TagList items={emotionRegulation.defenseMechanisms} />
                  </div>
                )}
              </CardBlock>
            )}
          </>
        ),
      });
    }

    // Page 6: Strengths + Vulnerabilities + Social Cognition
    if (strengthsAndProtectiveFactors || socialCognition || developmentalFactors) {
      result.push({
        id: 'strengths',
        title: 'Forces',
        icon: Star,
        iconColor: 'text-yellow-400',
        render: () => (
          <>
            {strengthsAndProtectiveFactors && (
              <CardBlock>
                <p className="text-sm font-semibold text-white/60 mb-3">Forces & Facteurs protecteurs</p>
                {strengthsAndProtectiveFactors.characterStrengths?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-white/40 mb-2">Forces de caractère</p>
                    <TagList items={strengthsAndProtectiveFactors.characterStrengths} />
                  </div>
                )}
                <InfoRow label="Supports sociaux" value={strengthsAndProtectiveFactors.socialSupports} />
                {strengthsAndProtectiveFactors.skillsRepertoire?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-white/40 mb-2">Compétences</p>
                    <TagList items={strengthsAndProtectiveFactors.skillsRepertoire} />
                  </div>
                )}
                <InfoRow label="Systèmes de sens" value={strengthsAndProtectiveFactors.meaningSystems} />
              </CardBlock>
            )}

            {socialCognition && (
              <CardBlock>
                <p className="text-sm font-semibold text-white/60 mb-3">Vision du monde</p>
                <InfoRow label="Croyances sur les gens" value={socialCognition.beliefsAboutPeople} />
                <InfoRow label="Sensibilité justice" value={socialCognition.justiceSensitivity} />
                <InfoRow label="Cynisme/Idéalisme" value={socialCognition.cynicismVsIdealism} />
                <InfoRow label="Tolérance différence" value={socialCognition.toleranceForDifference} />
              </CardBlock>
            )}

            {developmentalFactors && (
              <CardBlock>
                <p className="text-sm font-semibold text-white/60 mb-3">Contexte & Développement</p>
                <InfoRow label="Environnement précoce" value={developmentalFactors.earlyEnvironment} />
                <InfoRow label="Contexte culturel" value={developmentalFactors.culturalContext} />
                <InfoRow label="Environnement actuel" value={developmentalFactors.currentEnvironment} />
                {developmentalFactors.lifeEvents?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-white/40 mb-2">Événements marquants</p>
                    <ul className="space-y-1.5">
                      {developmentalFactors.lifeEvents.map((event: string, idx: number) => (
                        <li key={idx} className="text-sm text-white/70 flex items-start gap-2">
                          <span className="text-cyan-400 mt-0.5">•</span>
                          {event}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardBlock>
            )}
          </>
        ),
      });
    }

    // Page 7: Journal + Assessments
    if (conversationJournal || assessmentResults) {
      const completedAssessments = assessmentResults
        ? ASSESSMENT_CONFIG.filter(c => assessmentResults[c.id]?.completed)
        : [];

      result.push({
        id: 'journal',
        title: 'Sessions',
        icon: BookOpen,
        iconColor: 'text-indigo-400',
        render: () => (
          <>
            {conversationJournal && (
              <CardBlock>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-semibold text-white/60">Journal</span>
                </div>
                {conversationJournal.cumulativeNarrative && (
                  <p className="text-sm text-white/70 leading-relaxed mb-4">
                    {conversationJournal.cumulativeNarrative}
                  </p>
                )}
                {conversationJournal.recurringThemes?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-white/40 mb-2">Thèmes récurrents</p>
                    <div className="flex flex-wrap gap-2">
                      {conversationJournal.recurringThemes.map((theme: string, idx: number) => (
                        <span key={idx} className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-medium">
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {conversationJournal.sessions?.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs text-white/40">Sessions ({conversationJournal.sessions.length})</p>
                    {conversationJournal.sessions.map((session: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-3.5 h-3.5 text-white/30" />
                          <span className="text-xs font-medium text-white/70">Session {session.sessionNumber}</span>
                          {session.date && (
                            <span className="text-xs text-white/30">• {new Date(session.date).toLocaleDateString('fr-FR')}</span>
                          )}
                          {session.emotionalTone && (
                            <span className="ml-auto text-xs text-white/30 italic">{session.emotionalTone}</span>
                          )}
                        </div>
                        {session.briefSummary && (
                          <p className="text-sm text-white/60 mb-2">{session.briefSummary}</p>
                        )}
                        {session.topicsDiscussed?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {session.topicsDiscussed.map((topic: string, tidx: number) => (
                              <span key={tidx} className="px-2 py-0.5 rounded-full bg-white/5 text-white/40 text-xs">
                                {topic}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {conversationJournal.progressionNotes && (
                  <div className="mt-4 pt-3 border-t border-white/5">
                    <p className="text-xs text-white/40 mb-1">Notes d'évolution</p>
                    <p className="text-sm text-white/60 italic">{conversationJournal.progressionNotes}</p>
                  </div>
                )}
              </CardBlock>
            )}

            {completedAssessments.length > 0 && (
              <CardBlock>
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardList className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-semibold text-white/60">Évaluations</span>
                  <span className="ml-auto text-xs text-violet-400">
                    {completedAssessments.length} test{completedAssessments.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-3">
                  {completedAssessments.map((config) => {
                    const result = assessmentResults[config.id];
                    if (!result) return null;
                    const Icon = config.icon;
                    return (
                      <div key={config.id} className="p-3 rounded-lg bg-white/5 border border-white/5">
                        <div className="flex items-start gap-3">
                          <Icon className={`w-4 h-4 mt-0.5 ${config.color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-white/80">{config.name}</span>
                              {result.confidence && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  result.confidence === 'élevé' ? 'bg-green-500/15 text-green-400' :
                                  result.confidence === 'moyen' ? 'bg-amber-500/15 text-amber-400' :
                                  'bg-white/10 text-white/40'
                                }`}>
                                  {result.confidence}
                                </span>
                              )}
                            </div>
                            <div className="mb-1">
                              <span className="text-sm font-semibold text-cyan-400">
                                {config.id === 'love_language' && result.primary
                                  ? `${result.primary}${result.secondary ? ` / ${result.secondary}` : ''}`
                                  : result.result}
                              </span>
                            </div>
                            {result.explanation && (
                              <p className="text-xs text-white/40 mt-1 line-clamp-2">{result.explanation}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardBlock>
            )}
          </>
        ),
      });
    }

    // Page 8: Insights + What's next
    if ((keyInsights && keyInsights.length > 0) || (dimensionsToExplore && dimensionsToExplore.length > 0) || (compatibilityFactors && compatibilityFactors.length > 0)) {
      result.push({
        id: 'insights',
        title: 'Insights',
        icon: Lightbulb,
        iconColor: 'text-emerald-400',
        render: () => (
          <>
            {keyInsights && keyInsights.length > 0 && (
              <CardBlock>
                <p className="text-sm font-semibold text-white/60 mb-3">Insights clés</p>
                <ul className="space-y-2">
                  {keyInsights.map((insight: string, idx: number) => (
                    <li key={idx} className="text-sm text-white/70 flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </CardBlock>
            )}

            {dimensionsToExplore && dimensionsToExplore.length > 0 && (
              <CardBlock className="border-amber-500/20">
                <p className="text-sm font-semibold text-amber-400 mb-3">À explorer prochainement</p>
                <TagList items={dimensionsToExplore} />
              </CardBlock>
            )}

            {compatibilityFactors && compatibilityFactors.length > 0 && (
              <CardBlock>
                <p className="text-sm font-semibold text-white/60 mb-3">Facteurs de compatibilité</p>
                <TagList items={compatibilityFactors} />
              </CardBlock>
            )}
          </>
        ),
      });
    }

    // Last page: Account (always present, with logout)
    if (onLogout) {
      result.push({
        id: 'account',
        title: 'Compte',
        icon: User,
        iconColor: 'text-white/60',
        render: () => (
          <>
            <CardBlock>
              <p className="text-sm text-white/60 leading-relaxed mb-6">
                Vous pouvez vous déconnecter de votre compte ici. Votre profil et vos données de conversation seront conservés.
              </p>
              <Button
                onClick={onLogout}
                variant="outline"
                className="w-full h-12 rounded-xl font-semibold bg-white/5 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/30 text-red-400 hover:text-red-300 transition-all"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Se déconnecter
              </Button>
            </CardBlock>
          </>
        ),
      });
    }

    return result;
  }, [profileData, onLogout]);

  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0); // -1 = left, 1 = right
  const containerRef = useRef<HTMLDivElement>(null);

  const goToPage = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(pages.length - 1, index));
    if (clamped !== currentPage) {
      setDirection(clamped > currentPage ? 1 : -1);
      setCurrentPage(clamped);
    }
  }, [pages.length, currentPage]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const threshold = 50;
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    if (offset < -threshold || velocity < -500) {
      goToPage(currentPage + 1);
    } else if (offset > threshold || velocity > 500) {
      goToPage(currentPage - 1);
    }
  }, [currentPage, goToPage]);

  const page = pages[currentPage];

  return (
    <div className="min-h-screen bg-warm-gradient flex flex-col relative overflow-hidden">
      {/* Header with page indicator */}
      <motion.div
        className="flex items-center justify-between px-5 pt-4 pb-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          {onBack ? (
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <img
              src="/echo-logo.png"
              alt="Echo"
              className="w-8 h-8 object-contain opacity-50"
            />
          )}
          <h1 className="text-lg font-display font-bold text-white">Votre profil</h1>
        </div>
        <span className="text-xs text-white/30 font-mono">
          {currentPage + 1}/{pages.length}
        </span>
      </motion.div>

      {/* Page dots */}
      <div className="flex items-center justify-center gap-1.5 pb-2">
        {pages.map((p, idx) => (
          <button
            key={p.id}
            onClick={() => goToPage(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === currentPage
                ? 'w-6 bg-cyan-400'
                : 'w-1.5 bg-white/20 hover:bg-white/30'
            }`}
          />
        ))}
      </div>

      {/* Swipeable content */}
      <div className="flex-1 relative overflow-hidden" ref={containerRef}>
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={page.id}
            custom={direction}
            className="absolute inset-0"
            variants={{
              enter: (d: number) => ({ opacity: 0, x: d > 0 ? 300 : -300 }),
              center: { opacity: 1, x: 0 },
              exit: (d: number) => ({ opacity: 0, x: d > 0 ? -300 : 300 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
          >
            <PageContainer
              title={page.title}
              icon={page.icon}
              iconColor={page.iconColor}
            >
              {page.render()}
            </PageContainer>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Nav arrows + bottom CTA */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-[hsl(215,15%,11%)] via-[hsl(215,15%,11%)/0.95] to-transparent"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {/* Page navigation arrows */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              currentPage === 0
                ? 'text-white/10'
                : 'text-white/40 hover:text-white hover:bg-white/10'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="text-xs text-white/30">{page.title}</span>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === pages.length - 1}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              currentPage === pages.length - 1
                ? 'text-white/10'
                : 'text-white/40 hover:text-white hover:bg-white/10'
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <Button
          onClick={onTalkToLuna}
          size="lg"
          className="w-full h-14 text-lg rounded-xl font-semibold shadow-glow transition-all hover:shadow-warm hover:scale-[1.02] bg-cyan-500 hover:bg-cyan-400 text-white"
        >
          <Mic className="w-5 h-5 mr-2" />
          Parler à Luna
        </Button>
      </motion.div>
    </div>
  );
}
