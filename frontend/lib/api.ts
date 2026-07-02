const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface TranscriptSegment {
  speaker: string;
  text: string;
  start_ms: number;
  end_ms: number;
}

export interface Recording {
  id: number;
  title: string;
  icon: string;
  tags: string[];
  duration_sec: number;
  created_at: string;
  status: "uploading" | "processing" | "done" | "error";
  processing_step: string | null;
  processing_pct: number;
  notes_markdown: string | null;
  transcript_json: TranscriptSegment[];
  rating: number;
  share_enabled: boolean;
  share_token: string | null;
}

export interface RecordingListItem {
  id: number;
  title: string;
  icon: string;
  tags: string[];
  duration_sec: number;
  created_at: string;
  status: string;
}

export interface StatusResponse {
  status: string;
  step: string | null;
  percent: number;
  error_message?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  uploadRecording: async (
    file: Blob,
    opts: { context?: string; keywords?: string; language?: string }
  ): Promise<Recording> => {
    const form = new FormData();
    form.append("file", file, "recording.wav");
    if (opts.context) form.append("context", opts.context);
    if (opts.keywords) form.append("keywords", opts.keywords);
    if (opts.language) form.append("language", opts.language);
    return request<Recording>("/recordings/upload", { method: "POST", body: form });
  },

  listRecordings: (q?: string): Promise<RecordingListItem[]> => {
    const qs = q ? `?q=${encodeURIComponent(q)}` : "";
    return request<RecordingListItem[]>(`/recordings${qs}`);
  },

  getRecording: (id: number): Promise<Recording> =>
    request<Recording>(`/recordings/${id}`),

  getStatus: (id: number): Promise<StatusResponse> =>
    request<StatusResponse>(`/recordings/${id}/status`),

  updateRecording: (
    id: number,
    data: { title?: string; icon?: string; tags?: string[]; rating?: number }
  ): Promise<Recording> =>
    request<Recording>(`/recordings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  deleteRecording: (id: number): Promise<{ ok: boolean }> =>
    request<{ ok: boolean }>(`/recordings/${id}`, { method: "DELETE" }),

  toggleShare: (
    id: number,
    enabled: boolean
  ): Promise<{ share_enabled: boolean; share_url: string | null }> =>
    request(`/recordings/${id}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    }),

  chatWithRecording: (id: number, message: string): Promise<{ reply: string }> =>
    request<{ reply: string }>(`/recordings/${id}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    }),

  audioUrl: (id: number) => `${BASE}/recordings/${id}/audio`,

  exportUrl: (id: number, format: string) =>
    `${BASE}/recordings/${id}/export?format=${format}`,
};
