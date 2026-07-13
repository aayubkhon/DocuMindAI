import type {
  ChatResponse,
  DocumentMeta,
  GenerationParams,
  QuizResponse,
} from "./types";
import type { Lang } from "./i18n";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.detail ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async listDocuments(): Promise<DocumentMeta[]> {
    return handle(await fetch(`${API_URL}/documents`, { cache: "no-store" }));
  },

  async uploadDocument(file: File): Promise<{ document: DocumentMeta }> {
    const form = new FormData();
    form.append("file", file);
    return handle(
      await fetch(`${API_URL}/documents`, { method: "POST", body: form })
    );
  },

  async deleteDocument(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/documents/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Delete failed (${res.status})`);
  },

  async chat(
    question: string,
    documentId: string | null,
    params: GenerationParams,
    language: Lang
  ): Promise<ChatResponse> {
    return handle(
      await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          document_id: documentId,
          params,
          language,
        }),
      })
    );
  },

  async summarize(
    documentId: string,
    params: GenerationParams,
    language: Lang
  ): Promise<ChatResponse> {
    return handle(
      await fetch(`${API_URL}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: documentId, params, language }),
      })
    );
  },

  async quiz(
    documentId: string,
    params: GenerationParams,
    language: Lang
  ): Promise<QuizResponse> {
    return handle(
      await fetch(`${API_URL}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: documentId, params, language }),
      })
    );
  },
};
