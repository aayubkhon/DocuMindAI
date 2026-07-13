export const LANGUAGES = [
  { code: "ko", label: "한국어" },
  { code: "uz", label: "Oʻzbekcha" },
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
] as const;

export type Lang = (typeof LANGUAGES)[number]["code"];

const CODES = LANGUAGES.map((l) => l.code) as readonly string[];

export interface Dict {
  subtitle: string;
  uploadPdf: string;
  working: string;
  library: string;
  noDocs: string;
  indexing: string;
  failed: string;
  delete: string;
  creativeFreedom: string;
  contextChunks: string;
  summarize: string;
  quiz: string;
  scopeAll: string;
  scopeDoc: (name: string) => string;
  scopeIndexing: (name: string) => string;
  placeholder: string;
  retrievalDetails: string;
  thinking: string;
  askPlaceholder: string;
  send: string;
  language: string;
  answerLabel: string;
  summarizeMsg: string;
}

export const translations: Record<Lang, Dict> = {
  en: {
    subtitle: "Document intelligence",
    uploadPdf: "Upload PDF",
    working: "Working…",
    library: "Document Library",
    noDocs: "No documents yet.",
    indexing: "indexing…",
    failed: "failed",
    delete: "Delete",
    creativeFreedom: "Creative Freedom",
    contextChunks: "Context chunks",
    summarize: "Summarize Document",
    quiz: "Generate Quiz",
    scopeAll: "Scope: all documents",
    scopeDoc: (n) => `Scope: ${n}`,
    scopeIndexing: (n) => `Indexing ${n}…`,
    placeholder: "Upload a PDF and ask a question to get started.",
    retrievalDetails: "Retrieval Details",
    thinking: "Thinking…",
    askPlaceholder: "Ask a question or type a command…",
    send: "Send",
    language: "Language",
    answerLabel: "Answer",
    summarizeMsg: "Summarize this document.",
  },
  uz: {
    subtitle: "Hujjat tahlili",
    uploadPdf: "PDF yuklash",
    working: "Bajarilmoqda…",
    library: "Hujjatlar kutubxonasi",
    noDocs: "Hali hujjat yoʻq.",
    indexing: "indekslanmoqda…",
    failed: "xato",
    delete: "Oʻchirish",
    creativeFreedom: "Ijodiy erkinlik",
    contextChunks: "Kontekst boʻlaklari",
    summarize: "Hujjatni xulosalash",
    quiz: "Test yaratish",
    scopeAll: "Qamrov: barcha hujjatlar",
    scopeDoc: (n) => `Qamrov: ${n}`,
    scopeIndexing: (n) => `Indekslanmoqda ${n}…`,
    placeholder: "PDF yuklang va savol bering.",
    retrievalDetails: "Qidiruv tafsilotlari",
    thinking: "Oʻylayapti…",
    askPlaceholder: "Savol bering yoki buyruq kiriting…",
    send: "Yuborish",
    language: "Til",
    answerLabel: "Javob",
    summarizeMsg: "Ushbu hujjatni xulosalab ber.",
  },
  ru: {
    subtitle: "Анализ документов",
    uploadPdf: "Загрузить PDF",
    working: "Обработка…",
    library: "Библиотека документов",
    noDocs: "Документов пока нет.",
    indexing: "индексируется…",
    failed: "ошибка",
    delete: "Удалить",
    creativeFreedom: "Творческая свобода",
    contextChunks: "Фрагменты контекста",
    summarize: "Сделать конспект",
    quiz: "Создать тест",
    scopeAll: "Область: все документы",
    scopeDoc: (n) => `Область: ${n}`,
    scopeIndexing: (n) => `Индексация ${n}…`,
    placeholder: "Загрузите PDF и задайте вопрос.",
    retrievalDetails: "Детали поиска",
    thinking: "Думаю…",
    askPlaceholder: "Задайте вопрос или введите команду…",
    send: "Отправить",
    language: "Язык",
    answerLabel: "Ответ",
    summarizeMsg: "Сделай конспект этого документа.",
  },
  ko: {
    subtitle: "문서 인텔리전스",
    uploadPdf: "PDF 업로드",
    working: "처리 중…",
    library: "문서 라이브러리",
    noDocs: "아직 문서가 없습니다.",
    indexing: "색인 중…",
    failed: "실패",
    delete: "삭제",
    creativeFreedom: "창의적 자유도",
    contextChunks: "컨텍스트 청크",
    summarize: "문서 요약",
    quiz: "퀴즈 생성",
    scopeAll: "범위: 모든 문서",
    scopeDoc: (n) => `범위: ${n}`,
    scopeIndexing: (n) => `색인 중 ${n}…`,
    placeholder: "PDF를 업로드하고 질문해 보세요.",
    retrievalDetails: "검색 세부정보",
    thinking: "생각 중…",
    askPlaceholder: "질문을 입력하거나 명령을 입력하세요…",
    send: "전송",
    language: "언어",
    answerLabel: "정답",
    summarizeMsg: "이 문서를 요약해 줘.",
  },
};

const STORAGE_KEY = "documind-lang";

/** Pick a default language from a saved choice or the browser/OS locale. */
export function detectLang(): Lang {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved && CODES.includes(saved)) return saved as Lang;
  const locale = navigator.language.slice(0, 2).toLowerCase();
  return CODES.includes(locale) ? (locale as Lang) : "en";
}

export function saveLang(lang: Lang): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, lang);
  }
}
