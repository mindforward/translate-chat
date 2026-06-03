'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const ROOMS = [
  { id: 1, name: 'Group A' },
  { id: 2, name: 'Group B' },
  { id: 3, name: 'Group C' },
  { id: 4, name: 'Group D' },
  { id: 5, name: 'Group E' },
];

export default function AdminPage() {
  const [selectedRoom, setSelectedRoom] = useState(1);
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        setError(data.error || 'Generation failed');
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
      <h1 className="text-2xl font-bold mb-2">⚙️ Admin Panel</h1>
      <p className="text-[var(--text-muted)] mb-6">管理房間同 Invite Links</p>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
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

      <p className="text-center text-xs text-[var(--text-muted)] mt-6">
        Translate Chat Admin v1.0
      </p>
    </div>
  );
}
