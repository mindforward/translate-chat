'use client';

import { useState, useEffect } from 'react';

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

  if (!loggedIn) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">⚙️</div>
            <h1 className="text-[28px] font-bold" style={{ color: '#1e375a' }}>Admin Panel</h1>
            <p className="text-base" style={{ color: 'var(--text-secondary)' }}>請輸入管理員密碼</p>
          </div>
          <form onSubmit={handleLogin} className="bg-white rounded-lg p-6" style={{ boxShadow: '0 30px 60px 0 rgba(170, 195, 225, 0.3)', border: '1px solid var(--border)' }}>
            {pwError && (
              <div className="mb-4 p-3.5 rounded-lg text-[14px] font-semibold" style={{ backgroundColor: '#fff5f5', border: '1px solid #fed7d7', color: '#e74c3c' }}>
                {pwError}
              </div>
            )}
            <input
              type="password"
              value={adminPw}
              onChange={(e) => setAdminPw(e.target.value)}
              placeholder="Admin Password"
              className="w-full px-4 py-3.5 rounded-lg text-[16px] placeholder: mb-4 transition-all focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
              autoFocus
            />
            <button
              type="submit"
              className="w-full py-3.5 rounded-lg font-bold text-white text-[16px] transition-all"
              style={{
                backgroundColor: 'var(--primary)',
                boxShadow: '0 8px 20px 0 rgba(0, 171, 228, 0.25)',
              }}
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
        body: JSON.stringify({ roomId: selectedRoom, expiresInMinutes: 15 }),
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
    <div className="min-h-dvh p-4 sm:p-6 sm:max-w-sm mx-auto" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: '#1e375a' }}>⚙️ Admin</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>管理 Invite Links</p>
        </div>
        <button
          onClick={() => {
            sessionStorage.removeItem('admin_logged_in');
            setLoggedIn(false);
          }}
          className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
          style={{
            backgroundColor: '#fff',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          登出
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3.5 rounded-lg text-[14px] font-semibold" style={{ backgroundColor: '#fff5f5', border: '1px solid #fed7d7', color: '#e74c3c' }}>
          {error}
        </div>
      )}

      {/* Room Selection */}
      <div className="bg-white rounded-lg p-5 mb-3" style={{ boxShadow: '0 2px 8px 0 rgba(35, 100, 210, 0.08)', border: '1px solid var(--border)' }}>
        <h2 className="font-semibold text-[16px] mb-3" style={{ color: '#1e375a' }}>選擇房間</h2>
        <div className="grid grid-cols-5 gap-2">
          {ROOMS.map((room) => (
            <button
              key={room.id}
              onClick={() => setSelectedRoom(room.id)}
              className={`py-2.5 text-xs font-semibold transition-all`}
              style={selectedRoom === room.id ? {
                backgroundColor: 'var(--primary)',
                color: '#fff',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 10px 0 rgba(0, 171, 228, 0.2)',
                border: 'none',
              } : {
                backgroundColor: '#fff',
                color: 'var(--text-secondary)',
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
              }}
            >
              {room.name}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Invite */}
      <div className="bg-white rounded-lg p-5" style={{ boxShadow: '0 2px 8px 0 rgba(35, 100, 210, 0.08)', border: '1px solid var(--border)' }}>
        <h2 className="font-semibold text-[16px] mb-1" style={{ color: '#1e375a' }}>🔗 一次性 Invite Link</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          產生後 15 分鐘有效，使用一次即失效
        </p>

        <button
          onClick={generateInvite}
          disabled={loading}
          className="w-full py-3.5 rounded-lg font-bold text-white text-[15px] transition-all disabled:opacity-40 mb-4"
          style={{
            backgroundColor: 'var(--primary)',
            boxShadow: '0 8px 20px 0 rgba(0, 171, 228, 0.25)',
          }}
        >
          {loading ? '產生中...' : '產生 Invite Link'}
        </button>

        {inviteToken && (
          <div className="space-y-2.5">
            <div className="p-3.5 rounded-lg" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>🔑 Token</p>
              <p className="font-mono text-[16px] font-bold select-all" style={{ color: 'var(--text)' }}>{inviteToken}</p>
            </div>
            <div className="p-3.5 rounded-lg" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>🔗 完整連結</p>
              <p className="text-sm break-all select-all" style={{ color: 'var(--text)' }}>{inviteUrl}</p>
            </div>
            <div className="p-3.5 rounded-lg" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>⏰ 到期</p>
              <p className="text-sm" style={{ color: 'var(--text)' }}>{expiresAt}</p>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
        Translate Chat v1.0
      </p>
    </div>
  );
}
