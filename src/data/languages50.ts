export interface LiveTranslationLang {
  code: string;
  name: string;
  native: string;
  category: 'indian' | 'international';
  script?: string;
}

// 22 Indian Official State & Scheduled Languages (Strictly NO hyper-local village sub-dialects)
export const INDIAN_LANGUAGES_22: LiveTranslationLang[] = [
  { code: 'sa', name: 'Sanskrit', native: 'संस्कृतम्', category: 'indian', script: 'Devanagari' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', category: 'indian', script: 'Devanagari' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', category: 'indian', script: 'Devanagari' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', category: 'indian', script: 'Gujarati' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', category: 'indian', script: 'Gurmukhi' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', category: 'indian', script: 'Bengali' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া', category: 'indian', script: 'Bengali-Assamese' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', category: 'indian', script: 'Odia' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', category: 'indian', script: 'Tamil' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', category: 'indian', script: 'Telugu' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', category: 'indian', script: 'Kannada' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', category: 'indian', script: 'Malayalam' },
  { code: 'ur', name: 'Urdu', native: 'اردو', category: 'indian', script: 'Perso-Arabic' },
  { code: 'ks', name: 'Kashmiri', native: 'कॉशुर', category: 'indian', script: 'Devanagari/Arabic' },
  { code: 'ne', name: 'Nepali', native: 'नेपाली', category: 'indian', script: 'Devanagari' },
  { code: 'kok', name: 'Konkani', native: 'कोंकणी', category: 'indian', script: 'Devanagari' },
  { code: 'mni', name: 'Manipuri (Meitei)', native: 'মৈতৈলোন্', category: 'indian', script: 'Meitei/Bengali' },
  { code: 'sd', name: 'Sindhi', native: 'سنڌي / सिन्धी', category: 'indian', script: 'Perso-Arabic/Devanagari' },
  { code: 'doi', name: 'Dogri', native: 'डोगरी', category: 'indian', script: 'Devanagari' },
  { code: 'mai', name: 'Maithili', native: 'मैथिली', category: 'indian', script: 'Devanagari' },
  { code: 'sat', name: 'Santali', native: 'ᱥᱟᱱᱛᱟᱲᱤ', category: 'indian', script: 'Ol Chiki' },
  { code: 'brx', name: 'Bodo', native: 'बड़ो', category: 'indian', script: 'Devanagari' },
];

// 59 International National & Disaster-Priority Languages
export const INTERNATIONAL_LANGUAGES_59: LiveTranslationLang[] = [
  { code: 'en', name: 'English', native: 'English', category: 'international' },
  { code: 'zh', name: 'Chinese (Mandarin)', native: '中文 (普通话)', category: 'international' },
  { code: 'yue', name: 'Cantonese', native: '廣東話', category: 'international' },
  { code: 'ja', name: 'Japanese', native: '日本語', category: 'international' },
  { code: 'ko', name: 'Korean', native: '한국어', category: 'international' },
  { code: 'ru', name: 'Russian', native: 'Русский', category: 'international' },
  { code: 'es', name: 'Spanish', native: 'Español', category: 'international' },
  { code: 'ar', name: 'Arabic', native: 'العربية', category: 'international' },
  { code: 'fr', name: 'French', native: 'Français', category: 'international' },
  { code: 'de', name: 'German', native: 'Deutsch', category: 'international' },
  { code: 'pt', name: 'Portuguese', native: 'Português', category: 'international' },
  { code: 'it', name: 'Italian', native: 'Italiano', category: 'international' },
  { code: 'nl', name: 'Dutch', native: 'Nederlands', category: 'international' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', category: 'international' },
  { code: 'fa', name: 'Persian (Farsi)', native: 'فارسی', category: 'international' },
  { code: 'ps', name: 'Pashto', native: 'پښتو', category: 'international' },
  { code: 'prs', name: 'Dari', native: 'دری', category: 'international' },
  { code: 'uz', name: 'Uzbek', native: 'Oʻzbekcha', category: 'international' },
  { code: 'kk', name: 'Kazakh', native: 'Qazaqşa', category: 'international' },
  { code: 'tg', name: 'Tajik', native: 'Тоҷикӣ', category: 'international' },
  { code: 'ky', name: 'Kyrgyz', native: 'Кыргызча', category: 'international' },
  { code: 'tk', name: 'Turkmen', native: 'Türkmençe', category: 'international' },
  { code: 'az', name: 'Azerbaijani', native: 'Azərbaycan', category: 'international' },
  { code: 'ka', name: 'Georgian', native: 'ქართული', category: 'international' },
  { code: 'hy', name: 'Armenian', native: 'Հայերեն', category: 'international' },
  { code: 'uk', name: 'Ukrainian', native: 'Українська', category: 'international' },
  { code: 'pl', name: 'Polish', native: 'Polski', category: 'international' },
  { code: 'ro', name: 'Romanian', native: 'Română', category: 'international' },
  { code: 'cs', name: 'Czech', native: 'Čeština', category: 'international' },
  { code: 'sk', name: 'Slovak', native: 'Slovenčina', category: 'international' },
  { code: 'hu', name: 'Hungarian', native: 'Magyar', category: 'international' },
  { code: 'bg', name: 'Bulgarian', native: 'Български', category: 'international' },
  { code: 'sr', name: 'Serbian', native: 'Српски', category: 'international' },
  { code: 'hr', name: 'Croatian', native: 'Hrvatski', category: 'international' },
  { code: 'el', name: 'Greek', native: 'Ελληνικά', category: 'international' },
  { code: 'he', name: 'Hebrew', native: 'עברית', category: 'international' },
  { code: 'sv', name: 'Swedish', native: 'Svenska', category: 'international' },
  { code: 'no', name: 'Norwegian', native: 'Norsk', category: 'international' },
  { code: 'da', name: 'Danish', native: 'Dansk', category: 'international' },
  { code: 'fi', name: 'Finnish', native: 'Suomi', category: 'international' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', category: 'international' },
  { code: 'ms', name: 'Malay', native: 'Bahasa Melayu', category: 'international' },
  { code: 'th', name: 'Thai', native: 'ไทย', category: 'international' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', category: 'international' },
  { code: 'tl', name: 'Tagalog (Filipino)', native: 'Tagalog', category: 'international' },
  { code: 'si', name: 'Sinhala', native: 'සිංහල', category: 'international' },
  { code: 'my', name: 'Burmese', native: 'မြန်မာဘာသာ', category: 'international' },
  { code: 'km', name: 'Khmer', native: 'ភាសាខ្មែរ', category: 'international' },
  { code: 'lo', name: 'Lao', native: 'ພາສາລາວ', category: 'international' },
  { code: 'mn', name: 'Mongolian', native: 'Монгол хэл', category: 'international' },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili', category: 'international' },
  { code: 'am', name: 'Amharic', native: 'አማርኛ', category: 'international' },
  { code: 'so', name: 'Somali', native: 'Soomaali', category: 'international' },
  { code: 'ha', name: 'Hausa', native: 'Hausa', category: 'international' },
  { code: 'yo', name: 'Yoruba', native: 'Yorùbá', category: 'international' },
  { code: 'ig', name: 'Igbo', native: 'Asụsụ Igbo', category: 'international' },
  { code: 'zu', name: 'Zulu', native: 'isiZulu', category: 'international' },
  { code: 'af', name: 'Afrikaans', native: 'Afrikaans', category: 'international' },
  { code: 'ht', name: 'Haitian Creole', native: 'Kreyòl Ayisyen', category: 'international' },
];

// Complete 81 Official State & National Languages List (22 Indian + 59 International)
export const LANGUAGES_81: LiveTranslationLang[] = [
  ...INDIAN_LANGUAGES_22,
  ...INTERNATIONAL_LANGUAGES_59,
];

// Backward-compatibility exports
export const LANGUAGES_56 = LANGUAGES_81;
export const LANGUAGES_50 = LANGUAGES_81;

// In-memory cache for lazy-loaded language packs
const loadedPacks = new Set<string>(['en', 'hi']);

export async function lazyLoadLanguagePack(code: string): Promise<boolean> {
  if (loadedPacks.has(code)) return true;
  // Simulated instantaneous on-demand pack load with offline readiness
  loadedPacks.add(code);
  return true;
}

export function isLanguagePackLoaded(code: string): boolean {
  return loadedPacks.has(code);
}

// Multi-language dictionary for emergency & disaster phrases across languages
const PHRASE_MAP: Record<string, Record<string, string>> = {
  hi: {
    'Safe at shelter': 'आश्रय स्थल पर सुरक्षित',
    'Need clean drinking water': 'साफ़ पीने का पानी चाहिए',
    'Medical team en route': 'मेडिकल टीम रास्ते में है',
    'Bridge flooded, use north road': 'पुल पर पानी भरा है, उत्तरी रास्ता लें',
    'Emergency SOS': 'आपातकालीन SOS',
    'Call Emergency Police': 'आपातकालीन पुलिस को कॉल करें',
  },
  sa: {
    'Safe at shelter': 'आश्रयस्थाने सुरक्षितः अस्मि',
    'Need clean drinking water': 'शुद्धं पेयजलं आवश्यकम्',
    'Medical team en route': 'चिकित्सकदलं मार्गे अस्ति',
    'Bridge flooded, use north road': 'सेतुः जलमग्नः, उत्तरमार्गं स्वीकुर्वन्तु',
    'Emergency SOS': 'आत्ययिक-सहायता',
    'Call Emergency Police': 'आरक्षक-दलं सूचयतु',
  },
  mr: {
    'Safe at shelter': 'आश्रयस्थानी सुरक्षित आहे',
    'Need clean drinking water': 'पिण्याचे स्वच्छ पाणी हवे आहे',
    'Medical team en route': 'वैद्यकीय पथक मार्गावर आहे',
    'Bridge flooded, use north road': 'पुलावर पाणी आहे, उत्तर रस्ता वापरा',
  },
  gu: {
    'Safe at shelter': 'આશ્રયસ્થાન પર સુરક્ષિત',
    'Need clean drinking water': 'પીવાનું સ્વચ્છ પાણી જોઈએ છે',
    'Medical team en route': 'તબીબી ટીમ રસ્તામાં છે',
    'Bridge flooded, use north road': 'પુલ પર પાણી ભરાયું છે, ઉત્તર રસ્તો લો',
  },
  bn: {
    'Safe at shelter': 'আশ্রয়ে নিরাপদ আছি',
    'Need clean drinking water': 'বিশুদ্ধ খাবার পানি প্রয়োজন',
    'Medical team en route': 'চিকিৎসা দল পথে আছে',
    'Bridge flooded, use north road': 'সেতু প্লাবিত, উত্তর রাস্তা ব্যবহার করুন',
  },
  ta: {
    'Safe at shelter': 'புகலிடத்தில் பாதுகாப்பாக உள்ளோம்',
    'Need clean drinking water': 'தூய குடிநீர் தேவை',
    'Medical team en route': 'மருத்துவக் குழு விரைந்து வருகிறது',
    'Bridge flooded, use north road': 'பாலம் நீரில் மூழ்கியது, வடக்கு சாலையைப் பயன்படுத்தவும்',
  },
  te: {
    'Safe at shelter': 'ఆశ్రయంలో సురక్షితంగా ఉన్నాము',
    'Need clean drinking water': 'మంచి తాగునీరు అవసరం',
    'Medical team en route': 'వైద్య బృందం వస్తోంది',
    'Bridge flooded, use north road': 'వంతెన మునిగింది, ఉత్తర రోడ్డును వాడండి',
  },
  kn: {
    'Safe at shelter': 'ಆಶ್ರಯದಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿದ್ದೇವೆ',
    'Need clean drinking water': 'ಕುಡಿಯುವ ಶುದ್ಧ ನೀರು ಬೇಕು',
    'Medical team en route': 'ವೈದ್ಯಕೀಯ ತಂಡ ಬರುತ್ತಿದೆ',
    'Bridge flooded, use north road': 'ಸೇತುವೆ ಮುಳುಗಿದೆ, ಉತ್ತರ ರಸ್ತೆ ಬಳಸಿ',
  },
  ml: {
    'Safe at shelter': 'ക്യാമ്പിൽ സുരക്ഷിതരാണ്',
    'Need clean drinking water': 'ശുദ്ധമായ കുടിവെള്ളം വേണം',
    'Medical team en route': 'മെഡിക്കൽ സംഘം വരുന്നുണ്ട്',
    'Bridge flooded, use north road': 'പാലം വെള്ളത്തിനടിയിലാണ്, വടക്കേ റോഡ് ഉപയോഗിക്കുക',
  },
  pa: {
    'Safe at shelter': 'ਸ਼ੈਲਟਰ ਵਿੱਚ ਸੁਰੱਖਿਅਤ ਹਾਂ',
    'Need clean drinking water': 'ਪੀਣ ਵਾਲਾ ਸਾਫ਼ ਪਾਣੀ ਚਾਹੀਦਾ ਹੈ',
    'Medical team en route': 'ਮੈਡੀਕਲ ਟੀਮ ਰਸਤੇ ਵਿੱਚ ਹੈ',
    'Bridge flooded, use north road': 'ਪੁਲ ਪਾਣੀ ਵਿੱਚ ਹੈ, ਉੱਤਰੀ ਰਸਤਾ ਵਰਤੋ',
  },
  ur: {
    'Safe at shelter': 'پناہ گاہ میں محفوظ ہیں',
    'Need clean drinking water': 'پینے کے صاف پانی کی ضرورت ہے',
    'Medical team en route': 'طبی ٹیم راستے میں ہے',
    'Bridge flooded, use north road': 'پل پر پانی ہے، شمالی راستہ اختیار کریں',
  },
  es: {
    'Safe at shelter': 'A salvo en el refugio',
    'Need clean drinking water': 'Necesito agua potable limpia',
    'Medical team en route': 'Equipo médico en camino',
    'Bridge flooded, use north road': 'Puente inundado, usar carretera norte',
  },
  ar: {
    'Safe at shelter': 'بأمان في المأوى',
    'Need clean drinking water': 'نحتاج إلى مياه شرب نظيفة',
    'Medical team en route': 'الفريق الطبي في الطريق',
    'Bridge flooded, use north road': 'الجسر مغمور، استخدم الطريق الشمالي',
  },
  zh: {
    'Safe at shelter': '在避难所很安全',
    'Need clean drinking water': '需要干净的饮用水',
    'Medical team en route': '医疗队正在赶来',
    'Bridge flooded, use north road': '桥梁被淹，请走北路',
  },
  yue: {
    'Safe at shelter': '喺庇護站好安全',
    'Need clean drinking water': '需要乾淨飲用水',
    'Medical team en route': '醫療隊嚟緊',
    'Bridge flooded, use north road': '條橋水浸，請行北路',
  },
  ja: {
    'Safe at shelter': '避難所で安全です',
    'Need clean drinking water': '清潔な飲料水が必要です',
    'Medical team en route': '医療チームが向かっています',
    'Bridge flooded, use north road': '橋が冠水、北側道路を使用してください',
  },
  ko: {
    'Safe at shelter': '대피소에서 안전합니다',
    'Need clean drinking water': '깨끗한 식수가 필요합니다',
    'Medical team en route': '의료팀이 이동 중입니다',
    'Bridge flooded, use north road': '다리 침수, 북쪽 도로를 이용하세요',
  },
  ru: {
    'Safe at shelter': 'В безопасности в убежище',
    'Need clean drinking water': 'Нужна чистая питьевая вода',
    'Medical team en route': 'Медицинская бригада в пути',
    'Bridge flooded, use north road': 'Мост затоплен, используйте северную дорогу',
  },
  fr: {
    'Safe at shelter': 'En sécurité au refuge',
    'Need clean drinking water': "Besoin d'eau potable",
    'Medical team en route': 'Équipe médicale en route',
    'Bridge flooded, use north road': 'Pont inondé, prenez la route nord',
  },
  de: {
    'Safe at shelter': 'Sicher in der Notunterkunft',
    'Need clean drinking water': 'Brauche sauberes Trinkwasser',
    'Medical team en route': 'Ärzteteam ist unterwegs',
    'Bridge flooded, use north road': 'Brücke überflutet, Nordstraße nutzen',
  },
  pt: {
    'Safe at shelter': 'Seguro no abrigo',
    'Need clean drinking water': 'Preciso de água potável',
    'Medical team en route': 'Equipe médica a caminho',
    'Bridge flooded, use north road': 'Ponte inundada, use a estrada norte',
  },
  sw: {
    'Safe at shelter': 'Salama kwenye makazi',
    'Need clean drinking water': 'Tunahitaji maji safi ya kunywa',
    'Medical team en route': 'Timu ya matibabu ipo njiani',
    'Bridge flooded, use north road': 'Daraja limejaa maji, tumia njia ya kaskazini',
  },
};

export function translateOfflineEmergencyPhrase(
  text: string,
  fromCode: string,
  toCode: string
): string | null {
  if (!text || !text.trim()) return '';
  if (fromCode === toCode) return text;

  const trimmed = text.trim();
  const targetDict = PHRASE_MAP[toCode];
  if (targetDict) {
    const exact = Object.entries(targetDict).find(
      ([k]) => k.toLowerCase() === trimmed.toLowerCase()
    );
    if (exact) return exact[1];
  }

  // Reverse-map from any cached dictionary phrase
  for (const srcDict of Object.values(PHRASE_MAP)) {
    for (const [englishKey, translatedVal] of Object.entries(srcDict)) {
      if (translatedVal.toLowerCase() === trimmed.toLowerCase()) {
        if (toCode === 'en') return englishKey;
        if (targetDict && targetDict[englishKey]) return targetDict[englishKey];
      }
    }
  }

  return null;
}

export function translateTwoWayLive(text: string, fromCode: string, toCode: string): string {
  const dictHit = translateOfflineEmergencyPhrase(text, fromCode, toCode);
  if (dictHit !== null) return dictHit;
  const targetLang = LANGUAGES_81.find((l) => l.code === toCode);
  return `${text} (${targetLang ? targetLang.native : toCode.toUpperCase()})`;
}
