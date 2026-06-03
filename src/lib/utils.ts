import { v4 as uuidv4 } from 'uuid'

export function generateToken(): string {
  return uuidv4().replace(/-/g, '').substring(0, 16)
}

export function generateSessionToken(): string {
  return uuidv4()
}

export function getExpiryDate(minutes: number = 15): Date {
  const date = new Date()
  date.setMinutes(date.getMinutes() + minutes)
  return date
}

export function isExpired(dateStr: string): boolean {
  return new Date(dateStr) < new Date()
}

export function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    'yue': '廣東話',
    'vi': 'Tiếng Việt',
    'zh': '繁體中文',
    'en': 'English',
    'ja': '日本語',
    'ko': '한국어',
  }
  return languages[code] || code
}

export function getSystemPrompt(sourceLang: string, targetLang: string): string {
  const langMap: Record<string, string> = {
    'yue': 'Cantonese (廣東話)',
    'vi': 'Vietnamese (Tiếng Việt)',
    'zh': 'Traditional Chinese (繁體中文)',
    'en': 'English',
    'ja': 'Japanese (日本語)',
    'ko': 'Korean (한국어)',
  }

  const src = langMap[sourceLang] || sourceLang
  const tgt = langMap[targetLang] || targetLang

  return `You are a translator. Translate the following text from ${src} to ${tgt}. Only output the translated text, nothing else. No explanations, no quotes, no notes.`
}
