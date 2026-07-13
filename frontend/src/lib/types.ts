export interface DocumentMeta {
  id: string;
  filename: string;
  size_bytes: number;
  num_chunks: number;
  uploaded_at: string;
}

export interface SourceChunk {
  document_id: string;
  filename: string;
  page: number | null;
  snippet: string;
  score: number | null;
}

export interface ChatResponse {
  answer: string;
  sources: SourceChunk[];
}

export interface GenerationParams {
  temperature: number;
  top_k: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

export interface QuizResponse {
  questions: QuizQuestion[];
}
