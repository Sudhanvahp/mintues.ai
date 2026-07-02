"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Settings, MessageCircle, Zap, Mic, Plus, MoreHorizontal } from "lucide-react";
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
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "numeric", year: "numeric" });
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

  useEffect(() => {
    load();
  }, [load]);

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
      setRecordings((prev) =>
        prev.map((r) => (r.id === id ? { ...r, title } : r))
      );
    } catch {
      alert("Rename failed");
    }
    setMenuOpen(null);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-app mx-auto bg-white min-h-screen flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-12 pb-3">
          <button className="flex items-center gap-1.5 bg-[#2B7FFF] text-white text-xs font-semibold px-3 py-1.5 rounded-full">
            <Zap size={12} fill="white" />
            Upgrade
          </button>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <MessageCircle size={18} className="text-gray-500" />
            </button>
            <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <Settings size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Title */}
        <h1 className="px-4 text-[28px] font-bold text-gray-900 mb-4">My minutes</h1>

        {/* Search */}
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2.5">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400 text-gray-800"
              placeholder="Search notes and transcripts"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto pb-28">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-2 border-[#2B7FFF] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Loading...</p>
            </div>
          ) : recordings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 px-8 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <Mic size={28} className="text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                {search ? "No recordings match your search." : "Tap Record Minutes to get started"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recordings.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 cursor-pointer relative"
                  onClick={() => {
                    if (menuOpen === rec.id) return;
                    if (rec.status === "processing") {
                      router.push(`/processing/${rec.id}`);
                    } else {
                      router.push(`/notes/${rec.id}`);
                    }
                  }}
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                    {rec.icon || "🌐"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{rec.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(rec.created_at)} • {formatDuration(rec.duration_sec)}
                      {rec.status === "processing" && (
                        <span className="ml-2 text-[#2B7FFF] font-medium">Processing...</span>
                      )}
                      {rec.status === "error" && (
                        <span className="ml-2 text-red-500 font-medium">Error</span>
                      )}
                    </p>
                  </div>

                  {/* Menu button */}
                  <button
                    className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-full hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(menuOpen === rec.id ? null : rec.id);
                    }}
                  >
                    <MoreHorizontal size={18} className="text-gray-400" />
                  </button>

                  {/* Context menu */}
                  {menuOpen === rec.id && (
                    <ContextMenu
                      recording={rec}
                      onClose={() => setMenuOpen(null)}
                      onDelete={() => handleDelete(rec.id)}
                      onRename={(title) => handleRename(rec.id, title)}
                      onIconChange={async (icon) => {
                        await api.updateRecording(rec.id, { icon });
                        setRecordings((prev) =>
                          prev.map((r) => (r.id === rec.id ? { ...r, icon } : r))
                        );
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
        <div className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none">
          <div className="w-full max-w-app px-4 pb-8 pt-4 bg-gradient-to-t from-white via-white to-transparent pointer-events-auto">
            <div className="flex items-center gap-3">
              <button
                className="flex-1 flex items-center justify-center gap-2 bg-[#2B7FFF] text-white font-semibold py-4 rounded-full shadow-lg active:opacity-90"
                onClick={() => router.push("/record")}
              >
                <Mic size={20} />
                Record Minutes
              </button>
              <button
                className="w-14 h-14 rounded-full bg-[#2B7FFF] flex items-center justify-center shadow-lg active:opacity-90"
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
