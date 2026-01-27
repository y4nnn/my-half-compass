-- RLS Policies for anonymous access
-- Since we're using anonymous users (no auth), we need permissive policies
-- In production, you'd want proper auth-based policies

-- Users table - allow all operations for now
CREATE POLICY "Allow anonymous insert on users"
  ON users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anonymous select on users"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Allow anonymous update on users"
  ON users FOR UPDATE
  USING (true);

-- Sessions table
CREATE POLICY "Allow anonymous insert on sessions"
  ON sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anonymous select on sessions"
  ON sessions FOR SELECT
  USING (true);

CREATE POLICY "Allow anonymous update on sessions"
  ON sessions FOR UPDATE
  USING (true);

-- Messages table
CREATE POLICY "Allow anonymous insert on messages"
  ON messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anonymous select on messages"
  ON messages FOR SELECT
  USING (true);

-- User profiles table
CREATE POLICY "Allow anonymous insert on user_profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anonymous select on user_profiles"
  ON user_profiles FOR SELECT
  USING (true);

CREATE POLICY "Allow anonymous update on user_profiles"
  ON user_profiles FOR UPDATE
  USING (true);

-- Context summaries table
CREATE POLICY "Allow anonymous insert on context_summaries"
  ON context_summaries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anonymous select on context_summaries"
  ON context_summaries FOR SELECT
  USING (true);
