/**
 * PROMPT BUILDER
 * Assembles the full system prompt from components:
 * CORE_PERSONA + SESSION_INSTRUCTIONS + ACTIVE_SCENARIO + MEMORY
 *
 * Scenarios are loaded from scenarios.json for easy updates without redeploy
 */

import { CORE_PERSONA } from './core-persona.ts';
import { FIRST_SESSION_INTRO, RETURNING_SESSION_INTRO, SESSION_ENDING_SOON, DYNAMIC_SCENARIO_INSTRUCTIONS, getAvailableScenariosText } from './session-instructions.ts';
import scenariosData from './scenarios.json' with { type: 'json' };

export interface Scenario {
  id: string;
  name: string;
  description: string;
  order: number;
  required: boolean;
  sensitive?: boolean;
  goals: string[];
  prompt: string;
}

export interface ScenariosConfig {
  version: string;
  lastUpdated: string;
  scenarios: Record<string, Scenario>;
  scenarioOrder: string[];
  requiredScenarios: string[];
  config: {
    maxSessionDurationMs: number;
    warningBeforeEndMs: number;
    minScenarioDurationMs: number;
  };
}

// Load scenarios from JSON
const SCENARIOS_CONFIG = scenariosData as ScenariosConfig;

export interface PromptContext {
  isFirstSession: boolean;
  memory?: string;              // What Luna knows about this user
  activeScenarioId?: string;    // Current scenario to explore
  completedScenarios?: string[];// Scenarios already done
  enableDynamicSwitching?: boolean; // Whether to include tool instructions
}

/**
 * Build the complete system prompt for a session
 */
export function buildSystemPrompt(context: PromptContext): string {
  const parts: string[] = [];

  // 1. Core persona (always first)
  parts.push(CORE_PERSONA);
  parts.push('\n---\n');

  // 2. Session context (first time vs returning)
  if (context.isFirstSession) {
    parts.push(FIRST_SESSION_INTRO);
  } else if (context.memory) {
    parts.push(RETURNING_SESSION_INTRO(context.memory));
  }
  parts.push('\n---\n');

  // 3. Active scenario (if any)
  const scenarioId = context.activeScenarioId || 'intro';
  const scenario = SCENARIOS_CONFIG.scenarios[scenarioId];
  if (scenario) {
    parts.push(scenario.prompt);
  }

  // 4. Note about completed scenarios (so Luna doesn't repeat)
  if (context.completedScenarios && context.completedScenarios.length > 0) {
    parts.push('\n---\n');
    parts.push(`SUJETS DÉJÀ EXPLORÉS (ne pas refaire en détail, sauf si la personne en reparle spontanément):\n`);
    const completedNames = context.completedScenarios
      .map(id => SCENARIOS_CONFIG.scenarios[id]?.name || id)
      .join(', ');
    parts.push(completedNames);
  }

  // 5. Dynamic scenario switching instructions (only if tools enabled)
  if (context.enableDynamicSwitching) {
    parts.push('\n---\n');
    parts.push(DYNAMIC_SCENARIO_INSTRUCTIONS);

    // 6. Available scenarios for switching
    const scenarioNames: Record<string, string> = {};
    for (const [id, scenario] of Object.entries(SCENARIOS_CONFIG.scenarios)) {
      scenarioNames[id] = scenario.name;
    }
    parts.push('\n---\n');
    parts.push(getAvailableScenariosText(context.completedScenarios || [], scenarioNames));
  }

  return parts.join('\n');
}

/**
 * Get the session ending prompt (to inject when time is running out)
 */
export function getSessionEndingPrompt(): string {
  return SESSION_ENDING_SOON;
}

/**
 * Get a specific scenario by ID
 */
export function getScenario(scenarioId: string): Scenario | undefined {
  return SCENARIOS_CONFIG.scenarios[scenarioId];
}

/**
 * Get all available scenario IDs in order
 */
export function getAvailableScenarios(): string[] {
  return SCENARIOS_CONFIG.scenarioOrder;
}

/**
 * Get required scenarios
 */
export function getRequiredScenarios(): string[] {
  return SCENARIOS_CONFIG.requiredScenarios;
}

/**
 * Get next scenario to explore based on completed ones
 */
export function getNextScenario(completedScenarios: string[]): string | null {
  const completed = new Set(completedScenarios);

  // First, check required scenarios
  for (const scenarioId of SCENARIOS_CONFIG.requiredScenarios) {
    if (!completed.has(scenarioId)) {
      return scenarioId;
    }
  }

  // Then, check optional scenarios in order
  for (const scenarioId of SCENARIOS_CONFIG.scenarioOrder) {
    if (!completed.has(scenarioId)) {
      return scenarioId;
    }
  }

  return null; // All scenarios completed
}

/**
 * Session config from JSON
 */
export const SESSION_CONFIG = SCENARIOS_CONFIG.config;

/**
 * Get all scenarios data (for admin/debugging)
 */
export function getAllScenariosData(): ScenariosConfig {
  return SCENARIOS_CONFIG;
}

export default {
  buildSystemPrompt,
  getSessionEndingPrompt,
  getScenario,
  getAvailableScenarios,
  getRequiredScenarios,
  getNextScenario,
  SESSION_CONFIG,
  getAllScenariosData,
};
