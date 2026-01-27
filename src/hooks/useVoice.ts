/**
 * Unified voice hook that abstracts between Gemini and Grok providers
 */

import { useGeminiVoice } from './useGeminiVoice';
import { useGrokVoice, type GrokVoiceOption } from './useGrokVoice';

export type VoiceProvider = 'gemini' | 'grok';
export type { GrokVoiceOption } from './useGrokVoice';

export interface TranscriptMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Existing profile data to provide context to the voice agent
export interface ExistingProfileContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: Record<string, any>;
  sessionCount: number;
}

interface UseVoiceOptions {
  provider: VoiceProvider;
  userId: string;
  grokVoice?: GrokVoiceOption; // Voice selection for Grok
  existingProfile?: ExistingProfileContext; // Pass existing profile for context
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  onTranscript?: (message: TranscriptMessage) => void;
  onSessionStart?: (sessionNumber: number) => void;
}

interface VoiceHookReturn {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  status: ConnectionStatus;
  isSpeaking: boolean;
  isListening: boolean;
  sessionReady: boolean;
  micLevel: number;
  transcript: TranscriptMessage[];
  getTranscript: () => TranscriptMessage[];
  sessionNumber: number;
  isConnected: boolean;
  isConnecting: boolean;
  provider: VoiceProvider;
}

// Get the default provider from environment or fallback to gemini
export function getDefaultProvider(): VoiceProvider {
  const envProvider = import.meta.env.VITE_VOICE_PROVIDER;
  if (envProvider === 'grok') return 'grok';
  return 'gemini';
}

export function useVoice(options: UseVoiceOptions): VoiceHookReturn {
  const { provider, grokVoice, existingProfile, ...hookOptions } = options;

  // Call both hooks but only use the active one
  // React hooks must be called unconditionally
  const geminiHook = useGeminiVoice({ ...hookOptions, existingProfile });
  const grokHook = useGrokVoice({ ...hookOptions, voice: grokVoice, existingProfile });

  // Return the appropriate hook based on provider
  const activeHook = provider === 'grok' ? grokHook : geminiHook;

  return {
    ...activeHook,
    provider,
  };
}

// Export individual hooks for direct use
export { useGeminiVoice } from './useGeminiVoice';
export { useGrokVoice } from './useGrokVoice';
