import { supabase } from '@/integrations/supabase/client';
import type { TranscriptMessage } from '@/hooks/useGeminiVoice';
import { estimateSessionCost, type VoiceProvider } from './costEstimation';

// Types for database operations
export interface Session {
  id: string;
  user_id: string;
  created_at: string;
  ended_at: string | null;
  session_number: number;
  status: 'active' | 'completed' | 'abandoned';
  duration_seconds?: number;
  provider?: VoiceProvider;
  estimated_cost_usd?: number;
  estimated_input_tokens?: number;
  estimated_output_tokens?: number;
}

export interface ContextSummary {
  topics_covered: string[];
  key_revelations: string[];
  emotional_moments: string[];
  summary_for_context: string;
  topics_to_explore: string[];
}

// Get current authenticated user ID
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

// Ensure user exists in users table (called after auth)
export async function ensureUserExists(userId: string, email?: string): Promise<void> {
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  if (!existingUser) {
    await supabase.from('users').insert({
      id: userId,
      email: email,
    });
  }
}

// Create a new session
export async function createSession(userId: string): Promise<Session> {
  // Get the count of previous sessions for this user
  const { count } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const sessionNumber = (count || 0) + 1;

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      session_number: sessionNumber,
      status: 'active'
    })
    .select()
    .single();

  if (error) throw error;
  return data as Session;
}

// Save a message to the database
export async function saveMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .insert({
      session_id: sessionId,
      role,
      content
    });

  if (error) {
    console.error('Failed to save message:', error);
  }
}

// Save multiple messages in batch (for resilience)
export async function saveMessagesBatch(
  sessionId: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<number> {
  if (messages.length === 0) return 0;

  const { error } = await supabase
    .from('messages')
    .insert(
      messages.map(msg => ({
        session_id: sessionId,
        role: msg.role,
        content: msg.content
      }))
    );

  if (error) {
    console.error('Failed to batch save messages:', error);
    return 0;
  }

  console.log(`Batch saved ${messages.length} messages`);
  return messages.length;
}

// Session stats for cost tracking
export interface SessionStats {
  durationSeconds: number;
  provider: VoiceProvider;
}

// End a session and generate summary
export async function endSession(
  sessionId: string,
  userId: string,
  stats?: SessionStats
): Promise<void> {
  // Build update object
  const updateData: Record<string, unknown> = {
    ended_at: new Date().toISOString(),
    status: 'completed'
  };

  // Add cost tracking data if stats provided
  if (stats) {
    const costEstimate = estimateSessionCost(stats.durationSeconds, stats.provider);
    updateData.duration_seconds = stats.durationSeconds;
    updateData.provider = stats.provider;
    updateData.estimated_cost_usd = costEstimate.estimatedCostUSD;
    updateData.estimated_input_tokens = costEstimate.estimatedInputTokens;
    updateData.estimated_output_tokens = costEstimate.estimatedOutputTokens;

    console.log(`Session ended - Duration: ${costEstimate.durationFormatted}, Estimated cost: ${costEstimate.estimatedCostFormatted}`);
  }

  const { error } = await supabase
    .from('sessions')
    .update(updateData)
    .eq('id', sessionId);

  if (error) {
    console.error('Failed to end session:', error);
  }

  // Generate summary in background (don't wait for it)
  generateSessionSummary(sessionId, userId).catch(err => {
    console.error('Failed to generate session summary:', err);
  });
}

// Generate a summary for a completed session
async function generateSessionSummary(sessionId: string, userId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('generate-summary', {
    body: { sessionId, userId }
  });

  if (error) {
    console.error('Error calling generate-summary function:', error);
    return;
  }

  console.log('Session summary generated:', data);
}

// Get previous context for a user
export async function getPreviousContext(userId: string): Promise<{
  summaries: ContextSummary[];
  lastSessionMessages: TranscriptMessage[];
  sessionCount: number;
  userName: string | null;
}> {
  // Get user's name if set
  const { data: userData } = await supabase
    .from('users')
    .select('name')
    .eq('id', userId)
    .single();

  // Get all context summaries
  const { data: summaries } = await supabase
    .from('context_summaries')
    .select('topics_covered, key_revelations, emotional_moments, summary_for_context, topics_to_explore')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  // Get last session's messages for immediate context
  const { data: lastSession } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let lastSessionMessages: TranscriptMessage[] = [];
  if (lastSession) {
    const { data: messages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('session_id', lastSession.id)
      .order('created_at', { ascending: true });

    if (messages) {
      lastSessionMessages = messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));
    }
  }

  // Get session count
  const { count } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  return {
    summaries: (summaries || []) as ContextSummary[],
    lastSessionMessages,
    sessionCount: count || 0,
    userName: userData?.name || null
  };
}

// Save context summary after a session
export async function saveContextSummary(
  userId: string,
  sessionId: string,
  summary: ContextSummary
): Promise<void> {
  const { error } = await supabase
    .from('context_summaries')
    .insert({
      user_id: userId,
      session_id: sessionId,
      topics_covered: summary.topics_covered,
      key_revelations: summary.key_revelations,
      emotional_moments: summary.emotional_moments,
      summary_for_context: summary.summary_for_context,
      topics_to_explore: summary.topics_to_explore
    });

  if (error) {
    console.error('Failed to save context summary:', error);
  }
}

// Update user's name when discovered in conversation
export async function updateUserName(userId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ name })
    .eq('id', userId);

  if (error) {
    console.error('Failed to update user name:', error);
  }
}

// Build context prompt from previous sessions
export function buildContextPrompt(context: {
  summaries: ContextSummary[];
  sessionCount: number;
  userName: string | null;
}): string {
  if (context.sessionCount === 0) {
    return '';
  }

  let prompt = '\n\n=== CONTEXTE DES SESSIONS PRÉCÉDENTES ===\n';

  if (context.userName) {
    prompt += `Tu connais déjà cette personne, elle s'appelle ${context.userName}.\n`;
  }

  prompt += `C'est la session numéro ${context.sessionCount + 1} avec cette personne.\n\n`;

  if (context.summaries.length > 0) {
    prompt += 'Ce que tu sais déjà sur elle :\n';

    for (const summary of context.summaries) {
      if (summary.summary_for_context) {
        prompt += `- ${summary.summary_for_context}\n`;
      }
      if (summary.key_revelations && summary.key_revelations.length > 0) {
        prompt += `- Révélations importantes : ${summary.key_revelations.join(', ')}\n`;
      }
      if (summary.topics_to_explore && summary.topics_to_explore.length > 0) {
        prompt += `- Sujets à explorer : ${summary.topics_to_explore.join(', ')}\n`;
      }
    }

    prompt += '\nUtilise ces informations pour continuer à creuser et approfondir ta connaissance de cette personne. Fais référence à ce que tu sais déjà de manière naturelle.\n';
  }

  return prompt;
}
