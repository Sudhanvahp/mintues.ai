"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Mic, Plus, MoreHorizontal } from "lucide-react";
import { api, RecordingListItem } from "@/lib/api";
import { ContextMenu } from "@/components/ContextMenu";

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
}

export default function HomePage() {
  const router = useRouter();
  const [recordings, setRecordings] = useState<RecordingListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  const load = useCallback(async (q?: string) => {
    try {
      const data = await api.listRecordings(q);
      setRecordings(data);
    } catch {
      // backend not available yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (val: string) => {
    setSearch(val);
    load(val || undefined);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteRecording(id);
      setRecordings((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert("Delete failed");
    }
    setMenuOpen(null);
  };

  const handleRename = async (id: number, title: string) => {
    try {
      await api.updateRecording(id, { title });
      setRecordings((prev) => prev.map((r) => (r.id === id ? { ...r, title } : r)));
    } catch {
      alert("Rename failed");
    }
    setMenuOpen(null);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-app mx-auto bg-white min-h-screen flex flex-col relative">

        {/* Header */}
        <div className="px-5 pt-14 pb-2">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#2B7FFF]" />
            <span className="text-xs font-semibold text-[#2B7FFF] tracking-wide uppercase">Minutes AI</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Minutes</h1>
        </div>

        {/* Search */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
            <Search size={15} className="text-gray-400 flex-shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400 text-gray-800 font-medium"
              placeholder="Search notes and transcripts..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto pb-32">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="w-8 h-8 border-2 border-[#2B7FFF] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400 font-medium">Loading...</p>
            </div>
          ) : recordings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 px-8 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Mic size={26} className="text-[#2B7FFF]" />
              </div>
              <div>
                <p className="text-gray-800 font-semibold text-base">
                  {search ? "No results found" : "No recordings yet"}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {search ? "Try a different search term" : "Tap Record Minutes to get started"}
                </p>
              </div>
            </div>
          ) : (
            <div className="px-5 space-y-2.5 pt-1">
              {recordings.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center gap-3.5 bg-white border border-gray-100 rounded-2xl px-4 py-3.5 shadow-sm active:bg-gray-50 cursor-pointer relative transition-shadow hover:shadow-md"
                  onClick={() => {
                    if (menuOpen === rec.id) return;
                    router.push(rec.status === "processing" ? `/processing/${rec.id}` : `/notes/${rec.id}`);
                  }}
                >
                  {/* Icon */}
                  <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-xl flex-shrink-0">
                    {rec.icon || "🌐"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate leading-snug">{rec.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-gray-400 font-medium">
                        {formatDate(rec.created_at)} · {formatDuration(rec.duration_sec)}
                      </p>
                      {rec.status === "processing" && (
                        <span className="text-[10px] font-semibold text-[#2B7FFF] bg-blue-50 px-1.5 py-0.5 rounded-full">
                          Processing
                        </span>
                      )}
                      {rec.status === "error" && (
                        <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
                          Error
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Menu */}
                  <button
                    className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-full hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(menuOpen === rec.id ? null : rec.id);
                    }}
                  >
                    <MoreHorizontal size={17} className="text-gray-400" />
                  </button>

                  {menuOpen === rec.id && (
                    <ContextMenu
                      recording={rec}
                      onClose={() => setMenuOpen(null)}
                      onDelete={() => handleDelete(rec.id)}
                      onRename={(title) => handleRename(rec.id, title)}
                      onIconChange={async (icon) => {
                        await api.updateRecording(rec.id, { icon });
                        setRecordings((prev) => prev.map((r) => (r.id === rec.id ? { ...r, icon } : r)));
                        setMenuOpen(null);
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom: Record button */}
        <div className="fixed bottom-0 left-0 right-0 pointer-events-none">
          <div className="w-full max-w-app mx-auto px-5 pb-8 pt-6 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-auto">
            <div className="flex items-center gap-3">
              <button
                className="flex-1 flex items-center justify-center gap-2.5 bg-[#2B7FFF] text-white font-semibold py-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-[0.98] transition-transform"
                onClick={() => router.push("/record")}
              >
                <Mic size={19} />
                Record Minutes
              </button>
              <button
                className="w-14 h-14 rounded-2xl bg-[#2B7FFF] flex items-center justify-center shadow-lg shadow-blue-200 active:scale-[0.98] transition-transform"
                onClick={() => router.push("/record")}
              >
                <Plus size={22} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
