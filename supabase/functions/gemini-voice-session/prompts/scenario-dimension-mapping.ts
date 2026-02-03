/**
 * SCENARIO TO PROFILE DIMENSION MAPPING
 * Maps each conversation scenario to the profile dimensions it primarily explores.
 * Used for:
 * - Tracking which dimensions have been covered
 * - Generating per-scenario summaries in the profile
 * - Prioritizing which scenarios to explore next
 */

export type Scenario = 'intro' | 'love_history' | 'love_vision' | 'values' | 'family' | 'emotions' | 'lifestyle' | 'dreams' | 'wounds';

export type ProfileDimension =
  | 'basicInfo'
  | 'identityAndSelfConcept'
  | 'temperament'
  | 'emotionRegulation'
  | 'cognitiveStyle'
  | 'motivation'
  | 'personalityTraits'
  | 'interpersonalStyle'
  | 'socialCognition'
  | 'behavioralPatterns'
  | 'strengthsAndProtectiveFactors'
  | 'vulnerabilities'
  | 'developmentalFactors'
  | 'relationshipProfile';

export interface ScenarioDimensionMap {
  primary: ProfileDimension[];   // Main dimensions this scenario explores
  secondary: ProfileDimension[]; // Dimensions that may be touched indirectly
}

/**
 * Mapping of each scenario to the profile dimensions it explores
 */
export const SCENARIO_DIMENSION_MAP: Record<Scenario, ScenarioDimensionMap> = {
  intro: {
    primary: ['basicInfo'],
    secondary: ['personalityTraits'] // First impression of personality
  },

  love_history: {
    primary: ['interpersonalStyle', 'relationshipProfile'],
    secondary: ['vulnerabilities', 'emotionRegulation', 'developmentalFactors']
  },

  love_vision: {
    primary: ['relationshipProfile', 'motivation'],
    secondary: ['identityAndSelfConcept', 'interpersonalStyle']
  },

  values: {
    primary: ['identityAndSelfConcept', 'socialCognition'],
    secondary: ['motivation', 'cognitiveStyle']
  },

  family: {
    primary: ['developmentalFactors', 'interpersonalStyle'],
    secondary: ['vulnerabilities', 'socialCognition']
  },

  emotions: {
    primary: ['temperament', 'emotionRegulation'],
    secondary: ['interpersonalStyle', 'personalityTraits']
  },

  lifestyle: {
    primary: ['behavioralPatterns', 'personalityTraits'],
    secondary: ['motivation', 'strengthsAndProtectiveFactors']
  },

  dreams: {
    primary: ['motivation', 'identityAndSelfConcept'],
    secondary: ['strengthsAndProtectiveFactors', 'cognitiveStyle']
  },

  wounds: {
    primary: ['vulnerabilities', 'strengthsAndProtectiveFactors'],
    secondary: ['emotionRegulation', 'developmentalFactors', 'interpersonalStyle']
  }
};

/**
 * Human-readable names for dimensions (in French)
 */
export const DIMENSION_LABELS: Record<ProfileDimension, string> = {
  basicInfo: 'Informations de base',
  identityAndSelfConcept: 'Identité & concept de soi',
  temperament: 'Tempérament & réactivité',
  emotionRegulation: 'Régulation émotionnelle',
  cognitiveStyle: 'Style cognitif',
  motivation: 'Motivation & objectifs',
  personalityTraits: 'Traits de personnalité',
  interpersonalStyle: 'Style interpersonnel',
  socialCognition: 'Cognition sociale',
  behavioralPatterns: 'Patterns comportementaux',
  strengthsAndProtectiveFactors: 'Forces & facteurs protecteurs',
  vulnerabilities: 'Vulnérabilités',
  developmentalFactors: 'Facteurs développementaux',
  relationshipProfile: 'Profil relationnel'
};

/**
 * Human-readable names for scenarios (in French)
 */
export const SCENARIO_LABELS: Record<Scenario, string> = {
  intro: 'Introduction',
  love_history: 'Historique amoureux',
  love_vision: 'Vision de l\'amour',
  values: 'Valeurs & identité',
  family: 'Famille & origines',
  emotions: 'Émotions & sensibilité',
  lifestyle: 'Mode de vie',
  dreams: 'Rêves & aspirations',
  wounds: 'Blessures & forces'
};

/**
 * Get all dimensions covered by a set of completed scenarios
 */
export function getDimensionsCovered(completedScenarios: Scenario[]): ProfileDimension[] {
  const dimensions = new Set<ProfileDimension>();

  for (const scenario of completedScenarios) {
    const map = SCENARIO_DIMENSION_MAP[scenario];
    if (map) {
      map.primary.forEach(d => dimensions.add(d));
      map.secondary.forEach(d => dimensions.add(d));
    }
  }

  return Array.from(dimensions);
}

/**
 * Get dimensions that still need exploration
 */
export function getDimensionsToExplore(completedScenarios: Scenario[]): ProfileDimension[] {
  const covered = new Set(getDimensionsCovered(completedScenarios));
  const allDimensions: ProfileDimension[] = [
    'basicInfo',
    'identityAndSelfConcept',
    'temperament',
    'emotionRegulation',
    'cognitiveStyle',
    'motivation',
    'personalityTraits',
    'interpersonalStyle',
    'socialCognition',
    'behavioralPatterns',
    'strengthsAndProtectiveFactors',
    'vulnerabilities',
    'developmentalFactors',
    'relationshipProfile'
  ];

  return allDimensions.filter(d => !covered.has(d));
}

/**
 * Suggest next scenarios based on what's been covered
 */
export function suggestNextScenarios(completedScenarios: Scenario[]): Scenario[] {
  const allScenarios: Scenario[] = ['intro', 'love_history', 'love_vision', 'values', 'family', 'emotions', 'lifestyle', 'dreams', 'wounds'];
  const requiredScenarios: Scenario[] = ['intro', 'love_history', 'love_vision', 'values'];

  const completed = new Set(completedScenarios);

  // First, suggest required scenarios that haven't been done
  const missingRequired = requiredScenarios.filter(s => !completed.has(s));
  if (missingRequired.length > 0) {
    return missingRequired;
  }

  // Then suggest remaining scenarios in order
  return allScenarios.filter(s => !completed.has(s));
}

export default {
  SCENARIO_DIMENSION_MAP,
  DIMENSION_LABELS,
  SCENARIO_LABELS,
  getDimensionsCovered,
  getDimensionsToExplore,
  suggestNextScenarios
};
