"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { ChatResponse, DocumentMeta, SourceChunk } from "@/lib/types";
import styles from "./page.module.scss";

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
  const fileRef = useRef<HTMLInputElement>(null);

  const params = { temperature, top_k: topK };

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
      pushAssistant(await api.chat(question, activeDoc, params));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSummarize() {
    if (!activeDoc || busy) return;
    setMessages((m) => [
      ...m,
      { role: "user", content: "Summarize this document." },
    ]);
    setBusy(true);
    try {
      pushAssistant(await api.summarize(activeDoc, params));
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
      const quiz = await api.quiz(activeDoc, params);
      const text = quiz.questions
        .map(
          (q, i) =>
            `${i + 1}. ${q.question}\n${q.options
              .map((o) => `   - ${o}`)
              .join("\n")}\n   Answer: ${q.answer}`
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

  const activeName = documents.find((d) => d.id === activeDoc)?.filename ?? "";

  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <h1>DocuMind_AI</h1>
          <p>Document intelligence</p>
        </div>

        <div className={styles.uploadWrap}>
          <button
            className={styles.uploadBtn}
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            {busy ? "Working…" : "Upload PDF"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            onChange={handleUpload}
            hidden
          />
        </div>

        <div className={styles.library}>
          <h2 className={styles.libraryTitle}>Document Library</h2>
          <ul className={styles.docList}>
            {documents.map((doc) => (
              <li
                key={doc.id}
                className={`${styles.docItem} ${
                  activeDoc === doc.id ? styles.active : ""
                }`}
              >
                <button
                  className={styles.docName}
                  onClick={() => setActiveDoc(doc.id)}
                  title={doc.filename}
                >
                  {doc.filename}
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(doc.id)}
                >
                  Delete
                </button>
              </li>
            ))}
            {documents.length === 0 && (
              <li className={styles.empty}>No documents yet.</li>
            )}
          </ul>
        </div>

        <div className={styles.params}>
          <label className={styles.param}>
            <span>Creative Freedom · {temperature.toFixed(1)}</span>
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
            <span>Context chunks · {topK}</span>
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

      <main className={styles.main}>
        <div className={styles.toolbar}>
          <button
            className={styles.btnPrimary}
            onClick={handleSummarize}
            disabled={!activeDoc || busy}
          >
            Summarize Document
          </button>
          <button
            className={styles.btnGhost}
            onClick={handleQuiz}
            disabled={!activeDoc || busy}
          >
            Generate Quiz
          </button>
          <span className={styles.scope}>
            {activeDoc ? `Scope: ${activeName}` : "Scope: all documents"}
          </span>
        </div>

        <div className={styles.messages}>
          {messages.length === 0 && (
            <div className={styles.placeholder}>
              Upload a PDF and ask a question to get started.
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`${styles.row} ${
                m.role === "user" ? styles.user : ""
              }`}
            >
              <div
                className={`${styles.bubble} ${
                  m.role === "user" ? styles.user : ""
                }`}
              >
                <p className={styles.bubbleText}>{m.content}</p>
                {m.sources && m.sources.length > 0 && (
                  <div className={styles.sources}>
                    <p className={styles.sourcesTitle}>Retrieval Details</p>
                    <ul>
                      {m.sources.map((s, j) => (
                        <li key={j} className={styles.source}>
                          {s.page ? `(Page ${s.page}) ` : ""}
                          {s.snippet.slice(0, 90)}…
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && <div className={styles.thinking}>Thinking…</div>}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.composer}>
          <input
            className={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            placeholder="Ask a question or type a command…"
          />
          <button
            className={styles.sendBtn}
            onClick={handleAsk}
            disabled={busy}
          >
            Send
          </button>
        </div>
      </main>
    </div>
  );
}
