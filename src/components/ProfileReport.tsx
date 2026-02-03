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
  Scale
} from "lucide-react";
import { useState } from "react";

// Scenario definitions for progress display (14 total: 4 required + 10 optional)
const SCENARIO_ORDER: { id: string; name: string; required: boolean; sensitive?: boolean }[] = [
  // Core scenarios (required)
  { id: 'intro', name: 'Introduction', required: true },
  { id: 'love_history', name: 'Histoire amoureuse', required: true },
  { id: 'love_vision', name: "Vision de l'amour", required: true },
  { id: 'values', name: 'Valeurs & identité', required: true },
  // Standard exploration scenarios
  { id: 'family', name: 'Famille & origines', required: false },
  { id: 'emotions', name: 'Émotions & sensibilité', required: false },
  { id: 'lifestyle', name: 'Mode de vie', required: false },
  { id: 'dreams', name: 'Rêves & aspirations', required: false },
  { id: 'wounds', name: 'Blessures & forces', required: false, sensitive: true },
  // Deep exploration scenarios
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

function ScenarioProgressCard({ scenarioSummaries }: { scenarioSummaries?: Record<string, ScenarioSummary> }) {
  const summaries = scenarioSummaries || {};

  const exploredCount = SCENARIO_ORDER.filter(s => summaries[s.id]?.explored).length;
  const totalCount = SCENARIO_ORDER.length;
  const progressPercent = Math.round((exploredCount / totalCount) * 100);

  const getConfidenceColor = (confidence?: string) => {
    switch (confidence) {
      case 'élevé': return 'bg-green-500';
      case 'moyen': return 'bg-amber-500';
      case 'faible': return 'bg-gray-400';
      default: return 'bg-gray-300';
    }
  };

  const getConfidenceWidth = (confidence?: string) => {
    switch (confidence) {
      case 'élevé': return '100%';
      case 'moyen': return '66%';
      case 'faible': return '33%';
      default: return '0%';
    }
  };

  const getConfidenceLabel = (confidence?: string) => {
    switch (confidence) {
      case 'élevé': return 'Élevé';
      case 'moyen': return 'Moyen';
      case 'faible': return 'Faible';
      default: return 'Non exploré';
    }
  };

  return (
    <motion.div
      className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.02 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          <h2 className="font-semibold text-foreground">Progression des sujets</h2>
        </div>
        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
          {exploredCount}/{totalCount} ({progressPercent}%)
        </span>
      </div>

      {/* Overall progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      </div>

      {/* Individual scenarios */}
      <div className="space-y-2.5">
        {SCENARIO_ORDER.map((scenario) => {
          const summary = summaries[scenario.id];
          const isExplored = summary?.explored;
          const confidence = summary?.confidence;

          return (
            <div key={scenario.id} className="flex items-center gap-3">
              {/* Status icon */}
              {isExplored ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
              )}

              {/* Scenario name */}
              <span className={`text-sm flex-1 ${isExplored ? 'text-foreground' : 'text-muted-foreground'}`}>
                {scenario.name}
                {scenario.required && !isExplored && (
                  <span className="text-xs text-amber-500 ml-1">*</span>
                )}
                {scenario.sensitive && (
                  <span className="text-xs text-rose-400 ml-1" title="Sujet sensible">♡</span>
                )}
              </span>

              {/* Confidence bar */}
              <div className="w-20 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${getConfidenceColor(confidence)}`}
                    initial={{ width: 0 }}
                    animate={{ width: getConfidenceWidth(confidence) }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  />
                </div>
              </div>

              {/* Confidence label */}
              <span className={`text-xs w-16 text-right ${
                isExplored ? 'text-muted-foreground' : 'text-muted-foreground/50'
              }`}>
                {getConfidenceLabel(confidence)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-border/30 flex flex-col gap-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>* Requis</span>
            <span className="text-rose-400">♡ Sensible</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> Élevé
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Moyen
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-400"></span> Faible
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Assessment result type definitions
interface AssessmentResult {
  completed?: boolean;
  result?: string;
  explanation?: string;
  confidence?: 'faible' | 'moyen' | 'élevé';
  // Specific fields for different assessments
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

// Assessment display configuration
const ASSESSMENT_CONFIG: { id: keyof AssessmentResults; name: string; icon: React.ElementType; color: string }[] = [
  { id: 'attachment_style', name: "Style d'attachement", icon: HeartHandshake, color: 'text-pink-500' },
  { id: 'love_language', name: "Langages de l'amour", icon: Heart, color: 'text-red-500' },
  { id: 'conflict_style', name: "Gestion des conflits", icon: Scale, color: 'text-orange-500' },
  { id: 'emotional_intelligence', name: "Intelligence émotionnelle", icon: Lightbulb, color: 'text-yellow-500' },
  { id: 'situational_judgment', name: "Jugement situationnel", icon: Compass, color: 'text-blue-500' },
  { id: 'logic_puzzles', name: "Raisonnement logique", icon: Puzzle, color: 'text-purple-500' },
  { id: 'general_culture', name: "Culture générale", icon: BookOpen, color: 'text-teal-500' },
];

function AssessmentResultsCard({ assessmentResults }: { assessmentResults?: AssessmentResults }) {
  if (!assessmentResults) return null;

  // Filter to only show completed assessments
  const completedAssessments = ASSESSMENT_CONFIG.filter(
    config => assessmentResults[config.id]?.completed
  );

  if (completedAssessments.length === 0) return null;

  return (
    <motion.div
      className="p-5 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/20"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.03 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-violet-500" />
          <h2 className="font-semibold text-foreground">Résultats des évaluations</h2>
        </div>
        <span className="text-sm font-medium text-violet-600 dark:text-violet-400">
          {completedAssessments.length} test{completedAssessments.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {completedAssessments.map((config) => {
          const result = assessmentResults[config.id];
          if (!result) return null;

          const Icon = config.icon;

          return (
            <div
              key={config.id}
              className="p-3 rounded-xl bg-background/50 border border-border/30"
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${config.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{config.name}</span>
                    {result.confidence && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        result.confidence === 'élevé' ? 'bg-green-500/20 text-green-600' :
                        result.confidence === 'moyen' ? 'bg-amber-500/20 text-amber-600' :
                        'bg-gray-500/20 text-gray-600'
                      }`}>
                        {result.confidence}
                      </span>
                    )}
                  </div>

                  {/* Main result */}
                  <div className="mb-1">
                    <span className="text-sm font-semibold text-primary">
                      {config.id === 'love_language' && result.primary
                        ? `${result.primary}${result.secondary ? ` / ${result.secondary}` : ''}`
                        : result.result}
                    </span>
                  </div>

                  {/* Additional details based on assessment type */}
                  {config.id === 'logic_puzzles' && result.correctAnswers !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      {result.correctAnswers}/{result.totalQuestions || 4} réponses correctes
                    </p>
                  )}

                  {config.id === 'love_language' && result.givingStyle && (
                    <p className="text-xs text-muted-foreground">
                      Donne l'amour par : {result.givingStyle}
                    </p>
                  )}

                  {config.id === 'attachment_style' && (result.anxietyScore || result.avoidanceScore) && (
                    <p className="text-xs text-muted-foreground">
                      Anxiété: {result.anxietyScore || 'N/A'} • Évitement: {result.avoidanceScore || 'N/A'}
                    </p>
                  )}

                  {/* Explanation */}
                  {result.explanation && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {result.explanation}
                    </p>
                  )}

                  {/* Values revealed for situational judgment */}
                  {config.id === 'situational_judgment' && result.valuesRevealed && result.valuesRevealed.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {result.valuesRevealed.slice(0, 3).map((value, idx) => (
                        <span key={idx} className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
                          {value}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Areas of strength for general culture */}
                  {config.id === 'general_culture' && result.areasOfStrength && result.areasOfStrength.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {result.areasOfStrength.slice(0, 3).map((area, idx) => (
                        <span key={idx} className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600">
                          {area}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

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
    conversationJournal,
    overallSummary,
    keyInsights,
    matchingKeywords,
    compatibilityFactors,
    dimensionsCovered,
    dimensionsToExplore,
    scenarioSummaries,
    assessmentResults
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
        {/* Scenario Progress */}
        <ScenarioProgressCard scenarioSummaries={scenarioSummaries} />

        {/* Assessment Results */}
        <AssessmentResultsCard assessmentResults={assessmentResults} />

        {/* Conversation Journal */}
        {conversationJournal && (
          <motion.div
            className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/20"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 }}
          >
            <div className="flex items-start gap-3 mb-4">
              <BookOpen className="w-5 h-5 text-indigo-500 mt-0.5" />
              <h2 className="font-semibold text-foreground">Journal des conversations</h2>
            </div>

            {/* Cumulative Narrative */}
            {conversationJournal.cumulativeNarrative && (
              <p className="text-sm text-foreground/90 leading-relaxed mb-4">
                {conversationJournal.cumulativeNarrative}
              </p>
            )}

            {/* Recurring Themes */}
            {conversationJournal.recurringThemes && conversationJournal.recurringThemes.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2">Thèmes récurrents</p>
                <div className="flex flex-wrap gap-2">
                  {conversationJournal.recurringThemes.map((theme: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-medium"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Session Entries */}
            {conversationJournal.sessions && conversationJournal.sessions.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Sessions ({conversationJournal.sessions.length})</p>
                {conversationJournal.sessions.map((session: {
                  sessionNumber: number;
                  date?: string;
                  topicsDiscussed?: string[];
                  keyMoments?: string[];
                  emotionalTone?: string;
                  briefSummary?: string;
                }, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-background/50 border border-border/30"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-foreground">
                        Session {session.sessionNumber}
                      </span>
                      {session.date && (
                        <span className="text-xs text-muted-foreground">
                          • {new Date(session.date).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                      {session.emotionalTone && (
                        <span className="ml-auto text-xs text-muted-foreground italic">
                          {session.emotionalTone}
                        </span>
                      )}
                    </div>
                    {session.briefSummary && (
                      <p className="text-sm text-foreground/80 mb-2">{session.briefSummary}</p>
                    )}
                    {session.topicsDiscussed && session.topicsDiscussed.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {session.topicsDiscussed.map((topic: string, tidx: number) => (
                          <span
                            key={tidx}
                            className="px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground text-xs"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Progression Notes */}
            {conversationJournal.progressionNotes && (
              <div className="mt-4 pt-3 border-t border-border/30">
                <p className="text-xs text-muted-foreground mb-1">Notes d'évolution</p>
                <p className="text-sm text-foreground/80 italic">{conversationJournal.progressionNotes}</p>
              </div>
            )}
          </motion.div>
        )}

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