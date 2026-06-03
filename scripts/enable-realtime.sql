-- ============================================
-- Enable Realtime for messages table
-- 在 Supabase Dashboard → SQL Editor 執行
-- ============================================

-- Add messages table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Verify
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
