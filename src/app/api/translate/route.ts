import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text, sourceLang, targetLang } = await request.json();

    if (!text || !sourceLang || !targetLang) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const langMap: Record<string, string> = {
      yue: 'Cantonese (廣東話)',
      vi: 'Vietnamese (Tiếng Việt)',
      zh: 'Traditional Chinese (正體中文, 繁體字, NOT Simplified Chinese 簡體字)',
      en: 'English',
      ja: 'Japanese (日本語)',
      ko: 'Korean (한국어)',
    };

    const src = langMap[sourceLang] || sourceLang;
    const tgt = langMap[targetLang] || targetLang;

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'DEEPSEEK_API_KEY not configured' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the following text from ${src} to ${tgt}.

CRITICAL RULES:
1. Output ONLY the translated text in ${tgt}.
2. NEVER output in Chinese (Traditional or Simplified).
3. NEVER output in English.
4. NEVER add explanations, quotes, notes, or the original text.
5. If you cannot translate, output the best approximation.
6. Respond with nothing but the translation.`
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('DeepSeek API error:', response.status, errText);
      return NextResponse.json(
        { error: 'Translation failed' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const translated = data.choices?.[0]?.message?.content?.trim() || text;

    return NextResponse.json({ translated, sourceLang, targetLang });
  } catch (error) {
    console.error('Translate error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
