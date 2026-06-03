'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Message } from '@/lib/supabase';
import { getLanguageName } from '@/lib/utils';

// Realtime type for Supabase
type RealtimePayload = {
  new: Message;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
};

export default function ChatRoom() {
  const params = useParams();
  const router = useRouter();
  const roomId = Number(params.id);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [language, setLanguage] = useState('');
  const [otherLanguages, setOtherLanguages] = useState<string[]>([]);
  const [otherNicknames, setOtherNicknames] = useState<string[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    // Check auth
    const st = sessionStorage.getItem('session_token');
    const nn = sessionStorage.getItem('nickname');
    const lang = sessionStorage.getItem('language');
    const rid = sessionStorage.getItem('room_id');

    if (!st || !nn || !lang || !rid || Number(rid) !== roomId) {
      router.push('/');
      return;
    }

    setSessionToken(st);
    setNickname(nn);
    setLanguage(lang || 'yue');

    // Load initial messages
    loadMessages(roomId);

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePayload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    // Load room participants
    loadRoomInfo(roomId, lang);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async (rid: number) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', rid)
      .order('created_at', { ascending: true })
      .limit(200);

    if (data) setMessages(data);
  };

  const loadRoomInfo = async (rid: number, myLang: string) => {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('nickname, language')
      .eq('room_id', rid);

    if (sessions) {
      const others = sessions.filter((s) => s.nickname !== nickname);
      setOtherNicknames(others.map((s) => s.nickname));
      setOtherLanguages([...new Set(others.map((s) => s.language).filter((l) => l !== myLang))]);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || sending || !sessionToken) return;
    setSending(true);

    try {
      // First, get translation
      const translateTo = otherLanguages.length > 0 ? otherLanguages[0] : null;
      let translatedText = null;
      let translatedLang = null;

      if (translateTo && translateTo !== language) {
        const transRes = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: inputText.trim(),
            sourceLang: language,
            targetLang: translateTo,
          }),
        });
        const transData = await transRes.json();
        if (transRes.ok) {
          translatedText = transData.translated;
          translatedLang = translateTo;
        }
      }

      // Save message
      const { error } = await supabase.from('messages').insert({
        room_id: roomId,
        session_id: sessionToken,
        nickname,
        original_text: inputText.trim(),
        original_lang: language,
        translated_text: translatedText,
        translated_lang: translatedLang,
      });

      if (error) {
        console.error('Send error:', error);
      }
      setInputText('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
    setSending(false);
  };

  const clearMessages = async () => {
    if (!sessionToken) return;
    try {
      const res = await fetch('/api/clear-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
      });
      if (res.ok) {
        setMessages([]);
        setShowClearConfirm(false);
      }
    } catch (err) {
      console.error('Error clearing messages:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const displayText = (msg: Message) => {
    // Show translated text if it's in the user's language
    if (msg.original_lang !== language && msg.translated_lang === language) {
      return msg.translated_text || msg.original_text;
    }
    return msg.original_text;
  };

  const displayLang = (msg: Message) => {
    if (msg.original_lang !== language && msg.translated_lang === language) {
      return msg.translated_lang;
    }
    return msg.original_lang;
  };

  const isMyMessage = (msg: Message) => msg.nickname === nickname;

  return (
    <div className="h-screen flex flex-col max-w-3xl mx-auto">
      {/* Header */}
      <header className="bg-[var(--bg-card)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="text-[var(--text-muted)] hover:text-white transition-colors"
          >
            ←
          </button>
          <div>
            <h1 className="font-semibold">Room {roomId}</h1>
            <p className="text-xs text-[var(--text-muted)]">
              {otherNicknames.join(', ') || '等待參與者...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 bg-[var(--bg-input)] rounded-lg text-[var(--text-muted)]">
            {getLanguageName(language)}
          </span>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-xs px-2 py-1 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
          >
            清除對話
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-[var(--text-muted)] mt-20">
            <p className="text-4xl mb-4">💬</p>
            <p>未有對話記錄</p>
            <p className="text-sm">發送第一條訊息開始對話吧！</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message-enter flex ${isMyMessage(msg) ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                isMyMessage(msg)
                  ? 'bg-[var(--primary)] rounded-br-md'
                  : 'bg-[var(--bg-card)] border border-[var(--border)] rounded-bl-md'
              }`}
            >
              {/* Nickname */}
              <p className={`text-xs mb-1 ${isMyMessage(msg) ? 'text-blue-200' : 'text-[var(--text-muted)]'}`}>
                {msg.nickname}
                {msg.original_lang !== displayLang(msg) && (
                  <span className="ml-1 opacity-60">→ {getLanguageName(displayLang(msg))}</span>
                )}
              </p>

              {/* Message text */}
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {displayText(msg)}
              </p>

              {/* Timestamp */}
              <p className={`text-[10px] mt-1 ${isMyMessage(msg) ? 'text-blue-200/60' : 'text-[var(--text-muted)]/60'}`}>
                {new Date(msg.created_at).toLocaleTimeString('zh-HK', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-[var(--bg-card)] border-t border-[var(--border)] p-4">
        <div className="flex gap-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`輸入訊息 (${getLanguageName(language)})...`}
            rows={1}
            className="flex-1 px-4 py-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] resize-none"
          />
          <button
            onClick={sendMessage}
            disabled={!inputText.trim() || sending}
            className="px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-30 rounded-xl font-semibold transition-colors"
          >
            {sending ? '...' : '發送'}
          </button>
        </div>
        <p className="mt-1 text-[10px] text-[var(--text-muted)]">
          按 Enter 發送 · Shift+Enter 換行
        </p>
      </div>

      {/* Clear confirm modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] rounded-2xl p-6 max-w-sm w-full border border-[var(--border)]">
            <h3 className="text-lg font-semibold mb-2">清除對話記錄？</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              此操作將會清除 Room {roomId} 的所有對話記錄，而且無法復原。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2 bg-[var(--bg-input)] rounded-xl text-sm hover:bg-[var(--border)] transition-colors"
              >
                取消
              </button>
              <button
                onClick={clearMessages}
                className="flex-1 py-2 bg-red-500 rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                確認清除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
