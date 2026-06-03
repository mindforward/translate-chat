-- ============================================
-- Translate Chat - Complete Database Setup
-- ============================================
-- Run this in Supabase Dashboard SQL Editor
-- 在 Supabase Dashboard → SQL Editor 執行以下 SQL
-- ============================================

-- 1. Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Invite Links
CREATE TABLE IF NOT EXISTS invite_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invite_links_token ON invite_links(token);

-- 3. Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  language TEXT NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);

-- 4. Messages
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES sessions(session_token) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  original_text TEXT NOT NULL,
  original_lang TEXT NOT NULL,
  translated_text TEXT,
  translated_lang TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, created_at);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms FORCE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read rooms" ON rooms FOR SELECT USING (true);

ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_links FORCE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read invite links" ON invite_links FOR SELECT USING (true);
CREATE POLICY "Anyone can update invite links" ON invite_links FOR UPDATE USING (true);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read sessions" ON sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can create sessions" ON sessions FOR INSERT WITH CHECK (true);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read room messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Anyone can insert messages" ON messages FOR INSERT WITH CHECK (true);

-- ============================================
-- Seed default rooms with bcrypt passwords
-- Passwords: fred2024, joseph2024, family2024, friends2024, guest2024
-- ============================================

INSERT INTO rooms (id, name, password_hash) VALUES
  (1, 'Group A', '$2b$10$JJeMOeo393xBOUIq2HyvXe/pNRwgVANyQRfKmsdSRj6xGLMyManzO'),
  (2, 'Group B', '$2b$10$cZeI3U6Jkx11na/C91pY/eqOFGCC4DXEsH6KzUOBRty1lAoa9GBKm'),
  (3, 'Group C', '$2b$10$FGCWj3NUAexP6MtF/jGEseKZ1hUYkaI3Mye5ixcv1hx2Odq5j0ed.'),
  (4, 'Group D', '$2b$10$YsQPeGfVxjlIacPk1gigiuUu.lPU8QoxyOCa0QE1rafgMnRH/raXK'),
  (5, 'Group E', '$2b$10$S7p.Xdgcrp0jJDUYFrVvKuwDBwBVOVX9vj2pfh7JL0zyjSbTO1mSG')
ON CONFLICT (id) DO NOTHING;
