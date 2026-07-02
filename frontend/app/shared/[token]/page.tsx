"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { AlignLeft, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Recording, RecordingListItem } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Tab = "minutes" | "transcript";

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m} min, ${s} sec`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "numeric", year: "numeric" });
}

export default function SharedNotePage() {
  const params = useParams();
  const token = params.token as string;

  const [recording, setRecording] = useState<Recording | null>(null);
  const [tab, setTab] = useState<Tab>("minutes");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/recordings`);
      if (!res.ok) throw new Error();
      const list = await res.json();
      const match = list.find((r: RecordingListItem) => r.share_token === token);
      if (!match) { setNotFound(true); return; }
      const detail = await fetch(`${BASE}/recordings/${match.id}`);
      setRecording(await detail.json());
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#2B7FFF] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3 text-center px-6">
      <p className="text-5xl">🔒</p>
      <h1 className="text-xl font-bold text-gray-900">Link not available</h1>
      <p className="text-gray-400 text-sm">This note is either private or the link has been disabled.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-app mx-auto min-h-screen flex flex-col">
        {/* Header */}
        <div className="px-4 pt-12 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2B7FFF]" />
            <span className="text-xs text-gray-400 font-medium">Minutes AI</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xl">
              {recording.icon}
            </div>
            <h1 className="text-xl font-bold text-gray-900">{recording.title}</h1>
          </div>
          <p className="text-xs text-gray-400">{formatDate(recording.created_at)} • {formatDuration(recording.duration_sec)}</p>
        </div>

        {/* Tabs */}
        <div className="px-4 mb-4">
          <div className="flex bg-gray-100 rounded-full p-1">
            {(["minutes", "transcript"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-medium transition-colors ${
                  tab === t ? "bg-[#2B7FFF] text-white" : "text-gray-500"
                }`}
              >
                {t === "minutes" ? <AlignLeft size={14} /> : <MessageSquare size={14} />}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 pb-10 overflow-y-auto">
          {tab === "minutes" ? (
            <div className="prose prose-sm max-w-none text-gray-800">
              {recording.notes_markdown ? (
                <ReactMarkdown>{recording.notes_markdown}</ReactMarkdown>
              ) : (
                <p className="text-gray-400 text-sm">No notes available.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {(recording.transcript_json || []).map((seg, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-[#2B7FFF]">
                      {seg.speaker.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-900 block mb-0.5">{seg.speaker}</span>
                    <p className="text-sm text-gray-700 leading-relaxed">{seg.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
