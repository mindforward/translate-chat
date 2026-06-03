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
  const [otherNicknames, setOtherNicknames] = useState<string[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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

  return (
    <div className="h-dvh flex flex-col max-w-[780px] mx-auto bg-white border-x border-sky-200">

      {/* Header */}
      <header className="px-5 py-4 border-b border-sky-200 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push('/')}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-sky-50 text-[20px] text-gray-500 shrink-0 transition-colors">
            ←
          </button>
          <div className="min-w-0">
            <h1 className="font-bold text-[20px] text-gray-800 truncate">聊天室 {roomId}</h1>
            <p className="text-sm text-gray-400 truncate">
              {otherNicknames.length > 0 ? otherNicknames.join('、') : '等待其他人加入...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs px-3 py-1.5 bg-sky-50 text-sky-600 rounded-full font-semibold">
            {getLanguageName(language)}
          </span>
          <button onClick={() => setShowClearConfirm(true)}
            className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-full font-semibold hover:bg-red-100 transition-colors">
            清除
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3 bg-gradient-to-b from-sky-50 to-white">
        {messages.length === 0 && (
          <div className="text-center mt-24">
            <p className="text-6xl mb-4">💬</p>
            <p className="text-gray-600 font-semibold text-[18px]">未有對話記錄</p>
            <p className="text-[15px] text-gray-400 mt-2">發送第一條訊息開始對話吧！</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id}
            className={`message-enter flex ${isMyMessage(msg) ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] sm:max-w-[75%] lg:max-w-[65%] rounded-2xl px-5 py-4 ${
              isMyMessage(msg)
                ? 'bg-sky-600 rounded-br-sm'
                : 'bg-white border-2 border-sky-200 rounded-bl-sm shadow-sm'
            }`}>
              <p className={`text-sm font-semibold mb-1.5 ${
                isMyMessage(msg) ? 'text-sky-100' : 'text-gray-500'
              }`}>
                {msg.nickname}
                {msg.translated_lang && msg.translated_lang !== msg.original_lang && (
                  <span className="ml-1.5 opacity-60 text-xs">
                    {getLanguageName(msg.translated_lang)}
                  </span>
                )}
              </p>
              <p className={`text-[18px] sm:text-[19px] leading-relaxed whitespace-pre-wrap break-words font-medium ${
                isMyMessage(msg) ? 'text-white' : 'text-gray-800'
              }`}>
                {displayText(msg)}
              </p>
              <p className={`text-xs mt-1.5 text-right ${
                isMyMessage(msg) ? 'text-sky-100/70' : 'text-gray-400'
              }`}>
                {new Date(msg.created_at).toLocaleTimeString('zh-HK', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 sm:px-6 py-3.5 border-t border-sky-200 bg-white shrink-0">
        <div className="flex gap-2 items-center">
          <textarea ref={inputRef}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder={`輸入訊息 (${getLanguageName(language)})...`}
            rows={1}
            className="flex-1 px-5 py-3.5 bg-gray-50 border-2 border-sky-200 rounded-2xl text-gray-800 text-[17px] placeholder:text-gray-400 focus:outline-none focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-200 resize-none max-h-[150px] transition-all"
          />
          <button onClick={sendMessage}
            disabled={!inputText.trim() || sending}
            className="px-7 py-3.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-30 rounded-2xl font-bold text-white text-[17px] transition-all shrink-0 shadow-sm">
            {sending ? '...' : '發送 →'}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-gray-400 text-center">
          ⏎ Enter 發送 · ⇧ Shift+Enter 換行
        </p>
      </div>

      {/* Clear modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border-2 border-sky-200">
            <h3 className="text-[18px] font-bold text-gray-800 mb-3">清除對話記錄？</h3>
            <p className="text-[15px] text-gray-500 mb-5">無法復原。</p>
            <div className="flex gap-3">
              <button onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 bg-gray-100 rounded-xl text-[15px] font-semibold text-gray-600 hover:bg-gray-200 transition-colors">
                取消
              </button>
              <button onClick={clearMessages}
                className="flex-1 py-3 bg-red-500 rounded-xl text-[15px] font-bold text-white hover:bg-red-600 transition-colors">
                確認清除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
