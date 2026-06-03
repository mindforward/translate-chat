'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Message } from '@/lib/supabase';
import { getLanguageName } from '@/lib/utils';

type RealtimePayload = {
  new: Message;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
};

export default function ChatRoom() {
  const params = useParams();
  const router = useRouter();
  const roomId = Number(params.id);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [language, setLanguage] = useState('');
  const [otherLanguages, setOtherLanguages] = useState<string[]>([]);
  const [otherNicknames, setOtherNicknames] = useState<string[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
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
    setLanguage(lang);

    loadMessages(roomId);
    loadRoomInfo(roomId);
    setJoined(true);

    // Subscribe to realtime
    const channel = supabase
      .channel(`room-${roomId}-${Date.now()}`)
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

  const loadRoomInfo = async (rid: number) => {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('nickname, language')
      .eq('room_id', rid);

    if (sessions) {
      const myNick = sessionStorage.getItem('nickname');
      const myLang = sessionStorage.getItem('language');
      const others = sessions.filter((s) => s.nickname !== myNick);
      setOtherNicknames(others.map((s) => s.nickname));
      setOtherLanguages([...new Set(others.map((s) => s.language).filter((l) => l !== myLang))]);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || sending || !sessionToken) return;
    setSending(true);

    try {
      // Fetch latest room languages directly from DB
      const { data: sessions } = await supabase
        .from('sessions')
        .select('language')
        .eq('room_id', roomId);

      const otherLangs = [...new Set(
        (sessions || [])
          .map((s) => s.language)
          .filter((l) => l !== language)
      )];

      let translatedText = null;
      let translatedLang = null;

      if (otherLangs.length > 0) {
        const targetLang = otherLangs[0];
        const transRes = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: inputText.trim(),
            sourceLang: language,
            targetLang: targetLang,
          }),
        });
        const transData = await transRes.json();
        if (transRes.ok) {
          translatedText = transData.translated;
          translatedLang = targetLang;
        }
      }

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
      // Refocus input
      inputRef.current?.focus();
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
    <div className="h-dvh flex flex-col max-w-2xl mx-auto px-0">
      {/* Header */}
      <header className="bg-white border-b border-[var(--border)] px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push('/')}
            className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors text-xl shrink-0"
          >
            ←
          </button>
          <div className="min-w-0">
            <h1 className="font-semibold text-[17px] text-[var(--text)] truncate">
              聊天室 {roomId}
            </h1>
            <p className="text-[13px] text-[var(--text-secondary)] truncate">
              {otherNicknames.length > 0
                ? otherNicknames.join('、')
                : '等待其他人加入...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[12px] px-2.5 py-1 bg-[var(--primary-bg)] text-[var(--primary)] rounded-full font-medium">
            {getLanguageName(language)}
          </span>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-[12px] px-2.5 py-1 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors"
          >
            清除
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 bg-[var(--bg)]">
        {messages.length === 0 && (
          <div className="text-center mt-16">
            <p className="text-5xl mb-3">💬</p>
            <p className="text-[var(--text-secondary)] font-medium">未有對話記錄</p>
            <p className="text-[13px] text-[var(--text-muted)] mt-1">發送第一條訊息開始對話吧！</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message-enter flex ${isMyMessage(msg) ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 ${
                isMyMessage(msg)
                  ? 'bg-[var(--bg-chat-own)] rounded-br-md text-white'
                  : 'bg-white border border-[var(--border)] rounded-bl-md text-[var(--text)]'
              }`}
            >
              {/* Nickname */}
              <p className={`text-[12px] mb-0.5 font-medium ${isMyMessage(msg) ? 'text-indigo-200' : 'text-[var(--text-secondary)]'}`}>
                {msg.nickname}
                {msg.original_lang !== displayLang(msg) && (
                  <span className="ml-1 opacity-60 text-[11px]">
                    → {getLanguageName(displayLang(msg))}
                  </span>
                )}
              </p>

              {/* Message */}
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                {displayText(msg)}
              </p>

              {/* Timestamp */}
              <p className={`text-[10px] mt-0.5 text-right ${isMyMessage(msg) ? 'text-indigo-200/60' : 'text-[var(--text-muted)]'}`}>
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
      <div className="bg-white border-t border-[var(--border)] px-3 py-2.5 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              // Auto-resize
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder={`輸入訊息 (${getLanguageName(language)})...`}
            rows={1}
            className="flex-1 px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-2xl text-[var(--text)] text-[15px] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary-light)] resize-none max-h-[120px]"
          />
          <button
            onClick={sendMessage}
            disabled={!inputText.trim() || sending}
            className="px-5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary)]/90 disabled:opacity-30 rounded-2xl font-medium text-white text-[15px] transition-colors shrink-0"
          >
            {sending ? '...' : '發送'}
          </button>
        </div>
        <p className="mt-1 text-[11px] text-[var(--text-muted)] text-center">
          Enter 發送 · Shift+Enter 換行
        </p>
      </div>

      {/* Clear confirm modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-[17px] font-semibold text-[var(--text)] mb-2">清除對話記錄？</h3>
            <p className="text-[14px] text-[var(--text-secondary)] mb-5">
              此操作將會清除所有對話記錄，無法復原。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 bg-[var(--bg-input)] rounded-xl text-[14px] font-medium text-[var(--text)] hover:bg-[var(--border)] transition-colors"
              >
                取消
              </button>
              <button
                onClick={clearMessages}
                className="flex-1 py-2.5 bg-[var(--danger)] rounded-xl text-[14px] font-medium text-white hover:bg-red-600 transition-colors"
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
