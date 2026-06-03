'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [status, setStatus] = useState<'verifying' | 'expired' | 'used' | 'invalid'>('verifying');
  const [roomId, setRoomId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;

    const verify = async () => {
      try {
        const res = await fetch('/api/verify-room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteToken: token }),
        });
        const data = await res.json();

        if (!res.ok) {
          if (data.error?.includes('使用過')) {
            setStatus('used');
          } else if (data.error?.includes('過期')) {
            setStatus('expired');
          } else {
            setStatus('invalid');
          }
          return;
        }

        // Store invite info in sessionStorage, then redirect
        sessionStorage.setItem('invite_room_id', String(data.room_id));
        sessionStorage.setItem('invite_token', token);
        setRoomId(data.room_id);

        // Redirect immediately to login page
        router.replace('/');
      } catch {
        setStatus('invalid');
      }
    };

    verify();
  }, [token, router]);

  const statusConfig = {
    verifying: {
      icon: '⏳',
      title: '驗證 Invite Link...',
      color: '#00abe4',
    },
    expired: {
      icon: '⏰',
      title: 'Invite Link 已過期',
      desc: '15 分鐘有效期限已過，請向管理員獲取新嘅 Invite Link',
      color: '#e74c3c',
    },
    used: {
      icon: '✅',
      title: 'Invite Link 已經使用過',
      desc: '每個 Invite Link 只能使用一次',
      color: '#f39c12',
    },
    invalid: {
      icon: '❌',
      title: 'Invite Link 無效',
      desc: '請檢查連結是否正確，或向管理員獲取新嘅 Invite Link',
      color: '#e74c3c',
    },
  };

  const cfg = statusConfig[status];

  return (
    <div className="min-h-dvh flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="text-center">
        <div className="text-6xl mb-6">{cfg.icon}</div>
        <h1 className="text-[22px] font-bold mb-3" style={{ color: cfg.color }}>{cfg.title}</h1>
        {'desc' in cfg && (
          <p className="text-[15px] max-w-sm" style={{ color: 'var(--text-secondary)' }}>{cfg.desc}</p>
        )}
        {status === 'verifying' && (
          <div className="mt-6 animate-pulse text-[15px]" style={{ color: 'var(--text-muted)' }}>驗證中...</div>
        )}
        {status !== 'verifying' && (
          <button
            onClick={() => router.push('/')}
            className="mt-6 px-6 py-3 rounded-lg font-bold text-white text-[15px] transition-all"
            style={{
              backgroundColor: 'var(--primary)',
              boxShadow: '0 8px 20px 0 rgba(0, 171, 228, 0.25)',
            }}
          >
            返回首頁
          </button>
        )}
      </div>
    </div>
  );
}
