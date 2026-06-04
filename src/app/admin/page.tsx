'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { APP_VERSION } from '@/lib/version';

const ROOMS = [
  { id: 1, name: 'Room 1' },
  { id: 2, name: 'Room 2' },
  { id: 3, name: 'Room 3' },
  { id: 4, name: 'Room 4' },
  { id: 5, name: 'Room 5' },
];

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy}
      className="font-semibold rounded-lg transition-all whitespace-nowrap text-white"
      style={{
        fontSize: '16px',
        padding: '10px 16px',
        backgroundColor: copied ? '#28a745' : 'var(--primary)',
        border: 'none',
      }}>
      {copied ? '✓ 已複製' : '📋 複製'}
    </button>
  );
}

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

  // Clear room state
  const [clearRoomId, setClearRoomId] = useState(1);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState('');

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

  const handleClearRoom = async () => {
    setClearing(true);
    setClearSuccess('');
    try {
      const res = await fetch('/api/clear-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: clearRoomId }),
      });
      const data = await res.json();
      if (res.ok) {
        setClearSuccess(`Room ${clearRoomId} 對話已清空`);
      } else {
        setError(data.error || '清除失敗');
      }
    } catch {
      setError('清除失敗');
    }
    setClearing(false);
    setShowClearConfirm(false);
  };

  if (!loggedIn) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-[50px] py-5" style={{ backgroundColor: 'var(--bg)' }}>
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
              className="w-full px-4 py-3.5 rounded-lg text-[16px] placeholder: mb-4 transition-all focus:outline-none box-border"
              style={{
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '12px 8px',
              }}
              autoFocus
            />
            <button
              type="submit"
              className="w-full rounded-lg font-bold text-white transition-all"
              style={{
                fontSize: '20px',
                padding: '8px',
                marginTop: '10px',
                marginBottom: '10px',
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

  return (
    <>
    <div className="min-h-dvh px-[50px] py-5 sm:px-[50px] sm:py-6 sm:max-w-sm mx-auto" style={{ backgroundColor: 'var(--bg)' }}>
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
      {clearSuccess && (
        <div className="mb-4 p-3.5 rounded-lg text-[14px] font-semibold" style={{ backgroundColor: '#d4edda', border: '1px solid #c3e6cb', color: '#155724' }}>
          {clearSuccess}
        </div>
      )}

      {/* Room Selection */}
      <div className="bg-white rounded-lg p-5 mb-3" style={{ boxShadow: '0 2px 8px 0 rgba(35, 100, 210, 0.08)', border: '1px solid var(--border)' }}>
        <h2 className="font-semibold text-[16px] mb-3" style={{ color: '#1e375a' }}>選擇房間</h2>
        <div className="grid grid-cols-5">
          {ROOMS.map((room) => (
            <button
              key={room.id}
              onClick={() => { setSelectedRoom(room.id); setClearRoomId(room.id); }}
              className="font-semibold transition-all m-[3px]"
              style={{
                fontSize: '20px',
                padding: '8px',
                borderRadius: '8px',
                ...(selectedRoom === room.id ? {
                  backgroundColor: 'var(--primary)',
                  color: '#fff',
                  boxShadow: '0 4px 10px 0 rgba(0, 171, 228, 0.2)',
                  border: 'none',
                } : {
                  backgroundColor: '#fff',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }),
              }}
            >
              {room.name}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Invite */}
      <div className="bg-white rounded-lg p-5 mb-3" style={{ boxShadow: '0 2px 8px 0 rgba(35, 100, 210, 0.08)', border: '1px solid var(--border)' }}>
        <h2 className="font-semibold text-[16px] mb-1" style={{ color: '#1e375a' }}>🔗 一次性 Invite Link</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          產生後 15 分鐘有效，使用一次即失效
        </p>

        <button
          onClick={generateInvite}
          disabled={loading}
          className="w-full rounded-lg font-bold text-white transition-all disabled:opacity-40"
          style={{
            fontSize: '20px',
            padding: '8px',
            marginTop: '10px',
            marginBottom: '10px',
            backgroundColor: 'var(--primary)',
            boxShadow: '0 8px 20px 0 rgba(0, 171, 228, 0.25)',
            borderRadius: '12px',
          }}
        >
          {loading ? '產生中...' : '產生 Invite Link'}
        </button>

        {inviteToken && (
          <div className="space-y-3 mt-4">
            <div className="p-3.5 rounded-lg flex items-center justify-between gap-2" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <div className="min-w-0 flex-1">
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>🔑 Token</p>
                <p className="font-mono text-[16px] font-bold select-all break-all" style={{ color: 'var(--text)' }}>{inviteToken}</p>
              </div>
              <CopyBtn text={inviteToken} />
            </div>
            <div className="p-3.5 rounded-lg flex items-start justify-between gap-2" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <div className="min-w-0 flex-1">
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>🔗 完整連結</p>
                <p className="text-sm break-all select-all" style={{ color: 'var(--text)' }}>{inviteUrl}</p>
              </div>
              <CopyBtn text={inviteUrl} />
            </div>
            <div className="p-3.5 rounded-lg" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>⏰ 到期</p>
              <p className="text-sm" style={{ color: 'var(--text)' }}>{expiresAt}</p>
            </div>
          </div>
        )}
      </div>

      {/* Clear Messages — Danger Zone */}
      <div className="bg-white rounded-lg p-5" style={{ boxShadow: '0 2px 8px 0 rgba(35, 100, 210, 0.08)', border: '1px solid #f5c6cb' }}>
        <h2 className="font-semibold text-[16px] mb-1" style={{ color: '#e74c3c' }}>🗑️ Force 清空對話</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          清空所選房間嘅所有對話記錄，此操作無法復原
        </p>
        <button
          onClick={() => setShowClearConfirm(true)}
          className="w-full rounded-lg font-bold text-white transition-all"
          style={{
            fontSize: '20px',
            padding: '8px',
            marginTop: '10px',
            marginBottom: '10px',
            backgroundColor: '#e74c3c',
            boxShadow: '0 8px 20px 0 rgba(231, 76, 60, 0.25)',
            borderRadius: '12px',
          }}
        >
          清空 Room {clearRoomId} 對話
        </button>
      </div>

      <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
        Translate Chat v{APP_VERSION}
      </p>
    </div>

      {/* Clear Room Confirm Dialog — createPortal to body so overlay covers everything */}
      {showClearConfirm && typeof document !== 'undefined' && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowClearConfirm(false)}>
          <div className="shadow-2xl text-center"
            style={{ backgroundColor: '#ffffff', borderRadius: '20px', width: '50%', maxWidth: '380px', minWidth: '280px', padding: '24px', boxShadow: '0 30px 80px 0 rgba(0, 0, 0, 0.15)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="text-5xl mb-4">⚠️</div>
            <h3 className="text-[20px] font-bold mb-2" style={{ color: '#e74c3c' }}>確認清空 Room {clearRoomId}？</h3>
            <p className="text-[15px] mb-6" style={{ color: 'var(--text-secondary)' }}>
              所有對話記錄將被永久刪除<br/>此操作無法復原
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowClearConfirm(false)}
                className="flex-1 rounded-xl font-semibold transition-all hover:brightness-95"
                style={{ fontSize: '18px', padding: '15px', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
                取消
              </button>
              <button onClick={handleClearRoom} disabled={clearing}
                className="flex-1 rounded-xl font-bold text-white transition-all hover:brightness-110 disabled:opacity-40"
                style={{ fontSize: '18px', padding: '15px', backgroundColor: '#e74c3c' }}>
                {clearing ? '清空中...' : '確認清空'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
