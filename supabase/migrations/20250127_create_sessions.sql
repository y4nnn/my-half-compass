-- Users table (if not exists)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  email TEXT UNIQUE,
  name TEXT
);

-- Sessions table - each conversation session
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  session_number INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned'))
);

-- Messages table - all messages from all sessions
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL
);

-- User profile - aggregated from all sessions
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Basic info
  age_range TEXT,
  location TEXT,
  occupation TEXT,
  education TEXT,
  living_situation TEXT,
  relationship_status TEXT,

  -- Origins & Family
  origins TEXT,
  parents_background TEXT,
  siblings TEXT,
  family_relationship TEXT,
  family_values TEXT,

  -- Childhood & Education
  childhood_personality TEXT,
  education_experience TEXT,
  childhood_memories TEXT,
  parenting_style_received TEXT,

  -- Personality traits (JSON with scores and explanations)
  personality_traits JSONB,

  -- Life experiences
  life_experiences JSONB,
  challenges_overcome TEXT[],
  achievements TEXT[],
  regrets TEXT[],

  -- Emotional profile
  emotional_profile JSONB,
  coping_mechanisms TEXT[],
  fears TEXT[],
  triggers TEXT[],

  -- Relationship style
  relationship_history JSONB,
  attachment_style TEXT,
  love_languages TEXT[],
  deal_breakers TEXT[],
  ideal_partner TEXT,

  -- Values & Beliefs
  core_values TEXT[],
  political_leaning TEXT,
  spiritual_beliefs TEXT,
  worldview TEXT,

  -- Aspirations
  short_term_goals TEXT[],
  long_term_vision TEXT,
  career_ambitions TEXT,
  family_goals TEXT,

  -- Interests
  hobbies TEXT[],
  lifestyle TEXT,
  social_preferences TEXT,

  -- Raw data
  full_profile_json JSONB,

  -- Matching
  matching_keywords TEXT[],
  compatibility_factors TEXT[]
);

-- Context summary - what Luna knows from previous sessions
CREATE TABLE IF NOT EXISTS context_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- What was covered in this session
  topics_covered TEXT[],
  key_revelations TEXT[],
  emotional_moments TEXT[],

  -- Summary for next session
  summary_for_context TEXT,

  -- What still needs to be explored
  topics_to_explore TEXT[]
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_context_user ON context_summaries(user_id);

-- RLS Policies (basic - you may want to add auth)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_summaries ENABLE ROW LEVEL SECURITY;
