"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { ChatResponse, DocumentMeta, SourceChunk } from "@/lib/types";
import { LANGUAGES, translations, detectLang, saveLang, type Lang } from "@/lib/i18n";
import styles from "./page.module.scss";
import {
  BrainCircuit,
  Globe,
  UploadCloud,
  FileText,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Sparkles,
  ChevronDown,
  MessageSquare,
  Send,
  User,
  Sliders,
  ChevronRight,
  RefreshCw,
  FolderOpen
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: SourceChunk[];
}

export default function Home() {
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [temperature, setTemperature] = useState(0.3);
  const [topK, setTopK] = useState(4);
  const [lang, setLang] = useState<Lang>("en");
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const params = { temperature, top_k: topK };
  const t = translations[lang];

  // Default the language from the browser/OS locale (or a saved choice) after mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(detectLang());
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  function changeLang(next: Lang) {
    setLang(next);
    saveLang(next);
  }

  const refresh = useCallback(async () => {
    try {
      setDocuments(await api.listDocuments());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const docs = await api.listDocuments();
        if (!cancelled) setDocuments(docs);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // While any document is still indexing, poll for its updated status.
  useEffect(() => {
    if (!documents.some((d) => d.status === "processing")) return;
    const timer = setTimeout(() => {
      refresh();
    }, 4500);
    return () => clearTimeout(timer);
  }, [documents, refresh]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { document } = await api.uploadDocument(file);
      await refresh();
      setActiveDoc(document.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteDocument(id);
      if (activeDoc === id) setActiveDoc(null);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function pushAssistant(res: ChatResponse) {
    setMessages((m) => [
      ...m,
      { role: "assistant", content: res.answer, sources: res.sources },
    ]);
  }

  async function handleAsk() {
    const question = input.trim();
    if (!question || busy) return;
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      pushAssistant(await api.chat(question, activeDoc, params, lang));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSummarize() {
    if (!activeDoc || busy) return;
    setMessages((m) => [...m, { role: "user", content: t.summarizeMsg }]);
    setBusy(true);
    try {
      pushAssistant(await api.summarize(activeDoc, params, lang));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleQuiz() {
    if (!activeDoc || busy) return;
    setBusy(true);
    try {
      const quiz = await api.quiz(activeDoc, params, lang);
      const text = quiz.questions
        .map(
          (q, i) =>
            `${i + 1}. ${q.question}\n${q.options
              .map((o) => `   - ${o}`)
              .join("\n")}\n   ${t.answerLabel}: ${q.answer}`
        )
        .join("\n\n");
      pushAssistant({
        answer: text || "Could not generate a quiz.",
        sources: [],
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const active = documents.find((d) => d.id === activeDoc);
  const activeName = active?.filename ?? "";
  const activeReady = active?.status === "ready";

  const getFormatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className={styles.app}>
      {/* Sidebar Section */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.logoArea}>
            <div className={styles.logoIcon}>
              <BrainCircuit className={styles.goldGlyph} size={20} />
            </div>
            <div>
              <h1 className={styles.brandTitle}>DocuMind<span className={styles.goldText}>_AI</span></h1>
              <p className={styles.brandSub}>{t.subtitle}</p>
            </div>
          </div>
          <div className={styles.langSelectWrapper}>
            <Globe className={styles.langIcon} size={14} />
            <select
              className={styles.langSelect}
              value={lang}
              onChange={(e) => changeLang(e.target.value as Lang)}
              aria-label={t.language}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <ChevronDown className={styles.langChevron} size={12} />
          </div>
        </div>

        {/* Upload Zone */}
        <div className={styles.uploadWrap}>
          <div
            className={`${styles.uploadCard} ${busy ? styles.busy : ""}`}
            onClick={() => !busy && fileRef.current?.click()}
          >
            {busy ? (
              <Loader2 className={`${styles.uploadIcon} ${styles.spin}`} size={24} />
            ) : (
              <UploadCloud className={styles.uploadIcon} size={24} />
            )}
            <span className={styles.uploadText}>{busy ? t.working : t.uploadPdf}</span>
            <span className={styles.uploadMeta}>PDF (max 15MB)</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            onChange={handleUpload}
            hidden
          />
        </div>

        {/* Document Library list */}
        <div className={styles.library}>
          <div className={styles.libraryHeader}>
            <span className={styles.libraryTitle}>{t.library}</span>
            <button className={styles.refreshBtn} onClick={refresh} title="Refresh Library">
              <RefreshCw size={12} />
            </button>
          </div>
          <ul className={styles.docList}>
            {documents.map((doc) => {
              const isActive = activeDoc === doc.id;
              return (
                <li
                  key={doc.id}
                  className={`${styles.docItem} ${isActive ? styles.active : ""}`}
                >
                  <button
                    className={styles.docName}
                    onClick={() => setActiveDoc(doc.id)}
                    title={doc.error ?? doc.filename}
                  >
                    <div className={styles.docInfoLeft}>
                      <FileText className={styles.docFileIcon} size={16} />
                      <div className={styles.docTextDetails}>
                        <span className={styles.docFile}>{doc.filename}</span>
                        <span className={styles.docFileSize}>
                          {getFormatSize(doc.size_bytes)}
                          {doc.num_chunks > 0 && ` • ${doc.num_chunks} chunks`}
                        </span>
                      </div>
                    </div>
                    {doc.status === "processing" && (
                      <span className={styles.badgeProcessing}>
                        <Loader2 size={10} className={styles.spin} />
                        {t.indexing}
                      </span>
                    )}
                    {doc.status === "failed" && (
                      <span className={styles.badgeFailed}>
                        <AlertCircle size={10} />
                        {t.failed}
                      </span>
                    )}
                    {doc.status === "ready" && (
                      <span className={styles.badgeReady}>
                        <CheckCircle2 size={10} />
                      </span>
                    )}
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(doc.id)}
                    aria-label={t.delete}
                    title={t.delete}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
            {documents.length === 0 && (
              <li className={styles.empty}>
                <FolderOpen className={styles.emptyIcon} size={24} />
                <p>{t.noDocs}</p>
              </li>
            )}
          </ul>
        </div>

        {/* AI Parameters Panel */}
        <div className={styles.params}>
          <div className={styles.paramsHeader}>
            <Sliders size={12} className={styles.paramsHeaderIcon} />
            <span>AI Settings</span>
          </div>
          
          <label className={styles.param}>
            <div className={styles.paramMeta}>
              <span>{t.creativeFreedom}</span>
              <span className={styles.paramValue}>{temperature.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
            />
          </label>
          <label className={styles.param}>
            <div className={styles.paramMeta}>
              <span>{t.contextChunks}</span>
              <span className={styles.paramValue}>{topK}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
            />
          </label>
        </div>
      </aside>

      {/* Main Workspace Section */}
      <main className={styles.main}>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <button
              className={styles.btnPrimary}
              onClick={handleSummarize}
              disabled={!activeReady || busy}
            >
              <BookOpen size={14} />
              {t.summarize}
            </button>
            <button
              className={styles.btnGhost}
              onClick={handleQuiz}
              disabled={!activeReady || busy}
            >
              <Sparkles size={14} />
              {t.quiz}
            </button>
          </div>
          <div className={styles.toolbarRight}>
            <span className={styles.scope}>
              {activeDoc ? (
                activeReady ? (
                  <>
                    <span className={styles.statusDotActive} />
                    {t.scopeDoc(activeName)}
                  </>
                ) : (
                  <>
                    <span className={styles.statusDotIndexing} />
                    {t.scopeIndexing(activeName)}
                  </>
                )
              ) : (
                <>
                  <span className={styles.statusDotAll} />
                  {t.scopeAll}
                </>
              )}
            </span>
          </div>
        </div>

        {/* Messages Feed */}
        <div className={styles.messages}>
          {messages.length === 0 && (
            <div className={styles.placeholder}>
              <div className={styles.placeholderLogo}>
                <BrainCircuit className={styles.placeholderLogoIcon} size={48} />
              </div>
              <h2>Welcome to DocuMind_AI</h2>
              <p className={styles.placeholderSub}>{t.placeholder}</p>
              
              <div className={styles.featuresGrid}>
                <div className={styles.featureCard}>
                  <div className={styles.featureCardIcon}><UploadCloud size={18} /></div>
                  <h3>1. Upload PDFs</h3>
                  <p>Load any documentation, textbook or report.</p>
                </div>
                <div className={styles.featureCard}>
                  <div className={styles.featureCardIcon}><MessageSquare size={18} /></div>
                  <h3>2. Interactive Chat</h3>
                  <p>Ask queries and receive answers based on document facts.</p>
                </div>
                <div className={styles.featureCard}>
                  <div className={styles.featureCardIcon}><BookOpen size={18} /></div>
                  <h3>3. Summarization</h3>
                  <p>Extract core ideas and bullet points instantly.</p>
                </div>
                <div className={styles.featureCard}>
                  <div className={styles.featureCardIcon}><Sparkles size={18} /></div>
                  <h3>4. Generative Quizzes</h3>
                  <p>Test knowledge with automatic quiz generation.</p>
                </div>
              </div>
            </div>
          )}

          {messages.map((m, i) => {
            const isUser = m.role === "user";
            return (
              <div
                key={i}
                className={`${styles.row} ${isUser ? styles.user : ""}`}
              >
                <div className={`${styles.avatar} ${isUser ? styles.userAvatar : styles.aiAvatar}`}>
                  {isUser ? <User size={14} /> : <BrainCircuit size={14} />}
                </div>
                <div className={`${styles.bubble} ${isUser ? styles.user : ""}`}>
                  <p className={styles.bubbleText}>{m.content}</p>
                  
                  {m.sources && m.sources.length > 0 && (
                    <div className={styles.sources}>
                      <div className={styles.sourcesHeader}>
                        <FolderOpen size={12} className={styles.sourcesHeaderIcon} />
                        <span>{t.retrievalDetails}</span>
                      </div>
                      <div className={styles.sourceCardsContainer}>
                        {m.sources.map((s, j) => {
                          const citationKey = `${i}-${j}`;
                          const isExpanded = expandedSource === citationKey;
                          return (
                            <div
                              key={j}
                              className={`${styles.sourceCard} ${isExpanded ? styles.expanded : ""}`}
                              onClick={() => setExpandedSource(isExpanded ? null : citationKey)}
                            >
                              <div className={styles.sourceCardHeader}>
                                <span className={styles.sourceBadge}>
                                  Source {j + 1} {s.page ? `• Page ${s.page}` : ""}
                                </span>
                                <ChevronRight
                                  className={`${styles.expandChevron} ${isExpanded ? styles.rotate : ""}`}
                                  size={12}
                                />
                              </div>
                              <p className={styles.sourceSnippet}>
                                {isExpanded ? s.snippet : `${s.snippet.slice(0, 100)}…`}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {busy && (
            <div className={styles.row}>
              <div className={`${styles.avatar} ${styles.aiAvatar}`}>
                <BrainCircuit size={14} />
              </div>
              <div className={styles.bubble}>
                <div className={styles.thinking}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Errors display */}
        {error && (
          <div className={styles.error}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Chat Composer */}
        <div className={styles.composer}>
          <div className={styles.composerInner}>
            <input
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder={t.askPlaceholder}
            />
            <button
              className={styles.sendBtn}
              onClick={handleAsk}
              disabled={busy || !input.trim()}
              title={t.send}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
