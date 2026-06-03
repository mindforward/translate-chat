'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const ROOMS = [
  { id: 1, name: 'Group A' },
  { id: 2, name: 'Group B' },
  { id: 3, name: 'Group C' },
  { id: 4, name: 'Group D' },
  { id: 5, name: 'Group E' },
];

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [adminPw, setAdminPw] = useState('');
  const [pwError, setPwError] = useState('');

  const [selectedRoom, setSelectedRoom] = useState(1);
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if already logged in this session
    if (sessionStorage.getItem('admin_logged_in') === 'true') {
      setLoggedIn(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');

    try {
      const res = await fetch('/admin/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPw }),
      });
      if (res.ok) {
        sessionStorage.setItem('admin_logged_in', 'true');
        setLoggedIn(true);
      } else {
        setPwError('密碼錯誤');
      }
    } catch {
      setPwError('連線錯誤');
    }
  };

  // If not logged in, show login screen
  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">⚙️ Admin Panel</h1>
            <p className="text-[var(--text-muted)]">請輸入管理員密碼</p>
          </div>
          <form onSubmit={handleLogin} className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)]">
            {pwError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {pwError}
              </div>
            )}
            <input
              type="password"
              value={adminPw}
              onChange={(e) => setAdminPw(e.target.value)}
              placeholder="Admin Password"
              className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] mb-4"
              autoFocus
            />
            <button
              type="submit"
              className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-xl font-semibold transition-colors"
            >
              進入
            </button>
          </form>
        </div>
      </div>
    );
  }

  const generateInvite = async () => {
    setLoading(true);
    setError('');
    setInviteUrl('');
    setInviteToken('');

    try {
      const res = await fetch('/api/generate-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedRoom,
          expiresInMinutes: 15,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Check if it's a table-doesn't-exist error
        if (data.hint) {
          setError(data.hint);
        } else {
          setError(data.error || 'Generation failed');
        }
      } else {
        setInviteUrl(data.url);
        setInviteToken(data.token);
        setExpiresAt(new Date(data.expires_at).toLocaleString('zh-HK'));
      }
    } catch {
      setError('Network error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">⚙️ Admin Panel</h1>
          <p className="text-[var(--text-muted)]">管理房間同 Invite Links</p>
        </div>
        <button
          onClick={() => {
            sessionStorage.removeItem('admin_logged_in');
            setLoggedIn(false);
          }}
          className="text-xs px-3 py-1.5 bg-[var(--bg-input)] rounded-lg text-[var(--text-muted)] hover:text-white transition-colors"
        >
          登出
        </button>
      </div>

      {/* Database not setup warning */}
      {error && (
        <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <div className="flex gap-2">
            <span className="text-yellow-400 text-lg">⚠️</span>
            <div>
              <p className="text-yellow-400 text-sm font-medium mb-1">需要先設定 Database</p>
              <p className="text-yellow-300/70 text-xs">
                {error.includes('relation') || error.includes('does not exist') || error.includes('Failed')
                  ? 'Database tables 未建立。請去 Supabase Dashboard → SQL Editor，執行以下 SQL：'
                  : error}
              </p>
              {error.includes('Failed') && (
                <pre className="mt-2 p-2 bg-black/30 rounded-lg text-[10px] text-yellow-300/60 overflow-x-auto max-h-32 overflow-y-auto">
                  {`-- 貼去 Supabase Dashboard → SQL Editor 執行\nCREATE TABLE IF NOT EXISTS rooms (\n  id SERIAL PRIMARY KEY,\n  name TEXT NOT NULL,\n  password_hash TEXT NOT NULL,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);\n\nCREATE TABLE IF NOT EXISTS invite_links (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,\n  token TEXT UNIQUE NOT NULL,\n  expires_at TIMESTAMPTZ NOT NULL,\n  used BOOLEAN DEFAULT FALSE,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);`}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Room Selection */}
      <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] mb-4">
        <h2 className="font-semibold mb-4">選擇房間</h2>
        <div className="grid grid-cols-5 gap-2">
          {ROOMS.map((room) => (
            <button
              key={room.id}
              onClick={() => setSelectedRoom(room.id)}
              className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                selectedRoom === room.id
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--bg-input)] text-[var(--text-muted)] hover:border-[var(--primary)] border border-[var(--border)]'
              }`}
            >
              {room.name}
            </button>
          ))}
        </div>
        <p className="text-sm text-[var(--text-muted)] mt-3">
          當前選擇: Room {selectedRoom} ({ROOMS[selectedRoom - 1].name})
        </p>
      </div>

      {/* Generate Invite Link */}
      <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)]">
        <h2 className="font-semibold mb-4">🔗 產生一次性 Invite Link</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          產生後 15 分鐘內有效，使用一次後即失效
        </p>

        <button
          onClick={generateInvite}
          disabled={loading}
          className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-xl font-semibold transition-colors disabled:opacity-50 mb-4"
        >
          {loading ? '產生中...' : '產生 Invite Link'}
        </button>

        {inviteToken && (
          <div className="space-y-3">
            <div className="p-3 bg-[var(--bg-input)] rounded-xl">
              <p className="text-xs text-[var(--text-muted)] mb-1">🔑 Token</p>
              <p className="font-mono text-lg font-bold select-all">{inviteToken}</p>
            </div>
            <div className="p-3 bg-[var(--bg-input)] rounded-xl">
              <p className="text-xs text-[var(--text-muted)] mb-1">🔗 Full URL</p>
              <p className="text-sm break-all select-all">{inviteUrl}</p>
            </div>
            <div className="p-3 bg-[var(--bg-input)] rounded-xl">
              <p className="text-xs text-[var(--text-muted)] mb-1">⏰ 到期時間</p>
              <p className="text-sm">{expiresAt}</p>
            </div>
          </div>
        )}
      </div>

      {/* Room Passwords Info */}
      <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] mt-4">
        <h2 className="font-semibold mb-4">🔒 Room Passwords</h2>
        <div className="space-y-2">
          {[
            { room: 1, name: 'Group A', pw: 'fred2024' },
            { room: 2, name: 'Group B', pw: 'joseph2024' },
            { room: 3, name: 'Group C', pw: 'family2024' },
            { room: 4, name: 'Group D', pw: 'friends2024' },
            { room: 5, name: 'Group E', pw: 'guest2024' },
          ].map((r) => (
            <div
              key={r.room}
              className="flex items-center justify-between p-3 bg-[var(--bg-input)] rounded-xl"
            >
              <div>
                <span className="text-sm font-medium">Room {r.room}</span>
                <span className="text-xs text-[var(--text-muted)] ml-2">({r.name})</span>
              </div>
              <code className="text-sm font-mono px-2 py-1 bg-[var(--bg)] rounded-lg">
                {r.pw}
              </code>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-3">
          💡 你可以喺 Supabase Dashboard 嘅 SQL Editor 修改密碼
        </p>
      </div>

      {/* Setup DB reminder */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mt-4">
        <h3 className="font-semibold text-yellow-400 text-sm mb-2">📋 未設定 Database？</h3>
        <p className="text-xs text-yellow-300/70 mb-2">
          去 Supabase Dashboard → SQL Editor，執行 <code className="bg-black/30 px-1 rounded">scripts/schema-final.sql</code> 全部內容
        </p>
        <details className="text-xs">
          <summary className="text-yellow-400/60 cursor-pointer hover:text-yellow-400">睇 SQL</summary>
          <pre className="mt-2 p-2 bg-black/30 rounded-lg text-[10px] text-yellow-300/50 overflow-x-auto max-h-48 overflow-y-auto">
{`CREATE TABLE IF NOT EXISTS rooms (...) ...
CREATE TABLE IF NOT EXISTS invite_links (...) ...
CREATE TABLE IF NOT EXISTS sessions (...) ...
CREATE TABLE IF NOT EXISTS messages (...) ...

-- 之後 INSERT 5 間房密碼：
INSERT INTO rooms VALUES
  (1, 'Group A', 'HASHED_PASSWORD_1'),
  (2, 'Group B', 'HASHED_PASSWORD_2'),
  ... etc

完整 SQL 喺:
https://github.com/mindforward/translate-chat/blob/main/scripts/schema-final.sql`}
          </pre>
        </details>
      </div>

      <p className="text-center text-xs text-[var(--text-muted)] mt-6">
        Translate Chat Admin v1.0
      </p>
    </div>
  );
}
