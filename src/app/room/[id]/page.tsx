'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
  const [otherNicknames, setOtherNicknames] = useState<string[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [speakingId, setSpeakingId] = useState<number | null>(null);

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

    return () => { supabase.removeChannel(channel); };
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
      setOtherNicknames(sessions.filter((s) => s.nickname !== myNick).map((s) => s.nickname));
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || sending || !sessionToken) return;
    setSending(true);

    try {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('language')
        .eq('room_id', roomId);

      const otherLangs = [...new Set(
        (sessions || []).map((s) => s.language).filter((l) => l !== language)
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
            targetLang,
          }),
        });
        const transData = await transRes.json();
        if (transRes.ok) {
          translatedText = transData.translated;
          translatedLang = targetLang;
        }
      }

      await supabase.from('messages').insert({
        room_id: roomId,
        session_id: sessionToken,
        nickname,
        original_text: inputText.trim(),
        original_lang: language,
        translated_text: translatedText,
        translated_lang: translatedLang,
      });

      setInputText('');
      inputRef.current?.focus();
    } catch (err) {
      console.error(err);
    }
    setSending(false);
  };

  const clearMessages = async () => {
    if (!sessionToken) return;
    const res = await fetch('/api/clear-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId }),
    });
    if (res.ok) {
      setMessages([]);
      setShowClearConfirm(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const displayText = (msg: Message) => {
    if (msg.original_lang !== language && msg.translated_lang === language) {
      return msg.translated_text || msg.original_text;
    }
    return msg.original_text;
  };

  const isMyMessage = (msg: Message) => msg.nickname === nickname;

  /** Determine which language to speak based on what text is shown */
  const speechLangFor = useCallback((msg: Message): string => {
    if (msg.original_lang !== language && msg.translated_lang === language) {
      return language; // showing translated text → speak in user's language
    }
    return msg.original_lang; // showing original text → speak in original language
  }, [language]);

  const speakText = useCallback((text: string, langCode: string, msgId: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    const langMap: Record<string, string> = {
      yue: 'zh-HK',
      zh: 'zh-CN',
      en: 'en-US',
      ja: 'ja-JP',
      ko: 'ko-KR',
      vi: 'vi-VN',
    };
    utterance.lang = langMap[langCode] || 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    setSpeakingId(msgId);

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    window.speechSynthesis.speak(utterance);
  }, []);

  return (
    <div className="h-dvh flex flex-col max-w-[780px] mx-auto bg-white">
      {/* Header — single row: ← back + room title | lang + clear */}
      <header className="px-4 py-3 border-b flex items-center justify-between shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push('/')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-50 text-[18px] shrink-0 transition-colors"
            style={{ color: 'var(--text-secondary)' }}>
            ←
          </button>
          <div className="min-w-0">
            <h1 className="font-bold truncate" style={{ fontSize: '18px', color: 'var(--text)' }}>
              聊天室 {roomId}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs px-3 py-1.5 rounded-full font-semibold whitespace-nowrap"
            style={{
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
            }}>
            {getLanguageName(language)}
          </span>
          <button onClick={() => setShowClearConfirm(true)}
            className="text-xs px-3 py-1.5 rounded-full font-semibold hover:bg-red-50 transition-colors whitespace-nowrap"
            style={{ color: 'var(--text-muted)' }}>
            清除
          </button>
        </div>
      </header>

      {/* Participants bar */}
      <div className="px-4 py-2 text-xs border-b text-center"
        style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
        {otherNicknames.length > 0
          ? `在線：${[nickname, ...otherNicknames].join('、')}`
          : '等待其他人加入...'}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-2"
        style={{ backgroundColor: 'var(--bg)' }}>
        {messages.length === 0 && (
          <div className="text-center mt-24">
            <p className="text-6xl mb-4">💬</p>
            <p className="font-semibold text-[18px]" style={{ color: 'var(--text)' }}>未有對話記錄</p>
            <p className="text-[15px] mt-2" style={{ color: 'var(--text-muted)' }}>發送第一條訊息開始對話吧！</p>
          </div>
        )}
        {messages.map((msg) => {
          const display = displayText(msg);
          const isMine = isMyMessage(msg);
          const isSpeaking = speakingId === msg.id;

          return (
            <div key={msg.id}
              className="message-enter message-group">
              <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                <div
                  className="max-w-[88%] sm:max-w-[75%] lg:max-w-[65%] rounded-xl"
                  style={{
                    padding: '10px',
                    backgroundColor: isMine ? '#f0f4ff' : 'var(--bg-other)',
                    boxShadow: isMine
                      ? '0 2px 8px 0 rgba(35, 100, 210, 0.08)'
                      : '0 2px 8px 0 rgba(35, 100, 210, 0.08)',
                    border: isMine
                      ? '1px solid #d0e0ff'
                      : '1px solid var(--border)',
                  }}>
                  <p className="text-sm font-semibold mb-1"
                    style={{ color: 'var(--text-muted)' }}>
                    {msg.nickname}
                    {msg.translated_lang && msg.translated_lang !== msg.original_lang && (
                      <span className="ml-1.5 opacity-60 text-xs">
                        {getLanguageName(msg.translated_lang)}
                      </span>
                    )}
                  </p>

                  <p className="text-[18px] sm:text-[19px] leading-relaxed whitespace-pre-wrap break-words font-medium"
                    style={{ color: '#1e375a' }}>
                    {display}
                  </p>

                  <div className="flex items-center justify-between mt-1.5">
                    <button
                      onClick={() => speakText(display, speechLangFor(msg), msg.id)}
                      className="tts-btn w-7 h-7 flex items-center justify-center rounded-md transition-colors text-sm"
                      style={{
                        color: '#1e375a',
                        opacity: isSpeaking ? 1 : undefined,
                      }}
                      title="發音"
                    >
                      {isSpeaking ? '🔊' : '🔈'}
                    </button>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(msg.created_at).toLocaleTimeString('zh-HK', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 sm:px-6 py-3 border-t shrink-0 bg-white" style={{ borderColor: 'var(--border)' }}>
        <div className="flex gap-3 items-center">
          <textarea ref={inputRef}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder={`輸入訊息 (${getLanguageName(language)})...`}
            rows={1}
            className="flex-1 rounded-lg placeholder: resize-none max-h-[120px] transition-all focus:outline-none"
            style={{
              fontSize: '20px',
              padding: '8px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          />
          <button onClick={sendMessage}
            disabled={!inputText.trim() || sending}
            className="rounded-lg font-bold text-white transition-all shrink-0 disabled:opacity-30 whitespace-nowrap"
            style={{
              fontSize: '20px',
              padding: '8px 16px',
              backgroundColor: 'var(--primary)',
              boxShadow: '0 8px 20px 0 rgba(0, 171, 228, 0.25)',
              borderRadius: '12px',
            }}>
            {sending ? '...' : '發送 →'}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
          ⏎ Enter 發送 · ⇧ Shift+Enter 換行
        </p>
      </div>

      {/* Clear modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-lg"
            style={{ boxShadow: '0 30px 60px 0 rgba(170, 195, 225, 0.3)' }}>
            <h3 className="text-[18px] font-bold mb-3" style={{ color: 'var(--text)' }}>清除對話記錄？</h3>
            <p className="text-[15px] mb-5" style={{ color: 'var(--text-secondary)' }}>無法復原。</p>
            <div className="flex gap-3">
              <button onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 rounded-lg text-[15px] font-semibold transition-colors"
                style={{ backgroundColor: 'var(--bg)', color: 'var(--text-secondary)' }}>
                取消
              </button>
              <button onClick={clearMessages}
                className="flex-1 py-3 rounded-lg text-[15px] font-bold text-white transition-colors"
                style={{ backgroundColor: '#e74c3c' }}>
                確認清除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
