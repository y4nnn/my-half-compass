/**
 * Cost estimation utilities for voice session tracking
 * Based on provider pricing as of January 2025
 */

export type VoiceProvider = 'gemini' | 'grok';

// Pricing constants (USD per unit)
// Gemini Live API: Audio is tokenized at ~25 tokens/second
// Input: $0.00025/1K tokens, Output: $0.001/1K tokens (2.5-flash)
// For native audio model, pricing may differ - using conservative estimates
const GEMINI_TOKENS_PER_SECOND = 25;
const GEMINI_INPUT_COST_PER_1K_TOKENS = 0.00025;
const GEMINI_OUTPUT_COST_PER_1K_TOKENS = 0.001;

// Grok pricing (xAI) - estimates based on available info
// Using grok-3 model for voice
const GROK_TOKENS_PER_SECOND = 25; // Estimated similar to Gemini
const GROK_INPUT_COST_PER_1K_TOKENS = 0.003; // Grok tends to be pricier
const GROK_OUTPUT_COST_PER_1K_TOKENS = 0.015;

export interface SessionCostEstimate {
  provider: VoiceProvider;
  durationSeconds: number;
  durationFormatted: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUSD: number;
  estimatedCostFormatted: string;
}

/**
 * Format duration in seconds to a human-readable string
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs}s`;
}

/**
 * Estimate the cost of a voice session based on duration and provider
 *
 * Assumptions:
 * - Roughly 50/50 split between user speaking and assistant speaking
 * - Audio is tokenized at ~25 tokens/second for both input and output
 */
export function estimateSessionCost(
  durationSeconds: number,
  provider: VoiceProvider
): SessionCostEstimate {
  // Assume roughly equal input/output time (user speaks, assistant responds)
  const inputSeconds = durationSeconds * 0.5;
  const outputSeconds = durationSeconds * 0.5;

  let inputTokens: number;
  let outputTokens: number;
  let inputCost: number;
  let outputCost: number;

  if (provider === 'gemini') {
    inputTokens = Math.round(inputSeconds * GEMINI_TOKENS_PER_SECOND);
    outputTokens = Math.round(outputSeconds * GEMINI_TOKENS_PER_SECOND);
    inputCost = (inputTokens / 1000) * GEMINI_INPUT_COST_PER_1K_TOKENS;
    outputCost = (outputTokens / 1000) * GEMINI_OUTPUT_COST_PER_1K_TOKENS;
  } else {
    inputTokens = Math.round(inputSeconds * GROK_TOKENS_PER_SECOND);
    outputTokens = Math.round(outputSeconds * GROK_TOKENS_PER_SECOND);
    inputCost = (inputTokens / 1000) * GROK_INPUT_COST_PER_1K_TOKENS;
    outputCost = (outputTokens / 1000) * GROK_OUTPUT_COST_PER_1K_TOKENS;
  }

  const totalCost = inputCost + outputCost;

  return {
    provider,
    durationSeconds,
    durationFormatted: formatDuration(durationSeconds),
    estimatedInputTokens: inputTokens,
    estimatedOutputTokens: outputTokens,
    estimatedCostUSD: totalCost,
    estimatedCostFormatted: totalCost < 0.01
      ? `<$0.01`
      : `$${totalCost.toFixed(3)}`,
  };
}

/**
 * Get cost per minute for a provider (useful for display)
 */
export function getCostPerMinute(provider: VoiceProvider): number {
  return estimateSessionCost(60, provider).estimatedCostUSD;
}

/**
 * Format a cost estimate for display
 */
export function formatCostSummary(estimate: SessionCostEstimate): string {
  return `${estimate.durationFormatted} | ~${estimate.estimatedInputTokens + estimate.estimatedOutputTokens} tokens | ${estimate.estimatedCostFormatted}`;
}
