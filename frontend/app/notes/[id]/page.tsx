"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, MoreHorizontal, Share2, AlignLeft, MessageSquare, ThumbsUp, ThumbsDown, Play, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { api, Recording } from "@/lib/api";
import { AudioPlayer } from "@/components/AudioPlayer";
import { ShareModal } from "@/components/ShareModal";
import { ContextMenu } from "@/components/ContextMenu";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";

type Tab = "minutes" | "transcript" | "chat";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m === 0) return `0 min, ${s} sec`;
  return `${m} min, ${s} sec`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "numeric", year: "numeric" });
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
  const s = (totalSec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function NotesPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [recording, setRecording] = useState<Recording | null>(null);
  const [tab, setTab] = useState<Tab>("minutes");
  const [showShare, setShowShare] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [loading, setLoading] = useState(true);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const player = useAudioPlayer();

  const load = useCallback(async () => {
    try {
      const data = await api.getRecording(id);
      setRecording(data);
    } catch {
      router.push("/");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const handleRate = async (rating: number) => {
    if (!recording) return;
    const newRating = recording.rating === rating ? 0 : rating;
    try {
      const updated = await api.updateRecording(id, { rating: newRating });
      setRecording(updated);
    } catch {}
  };

  const handlePlayAudio = () => {
    player.load(api.audioUrl(id));
    player.play();
    setShowPlayer(true);
  };

  const handleClosePlayer = () => {
    player.unload();
    setShowPlayer(false);
  };

  const sendChat = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", text: msg }]);
    setChatLoading(true);
    try {
      const res = await api.chatWithRecording(id, msg);
      setChatMessages((prev) => [...prev, { role: "assistant", text: res.reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setChatMessages((prev) => [...prev, { role: "assistant", text: `Error: ${msg}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Group consecutive transcript segments by same speaker
  const transcriptGroups = recording?.transcript_json.reduce(
    (groups: { speaker: string; texts: string[]; start_ms: number }[], seg) => {
      const last = groups[groups.length - 1];
      if (last && last.speaker === seg.speaker) {
        last.texts.push(seg.text);
      } else {
        groups.push({ speaker: seg.speaker, texts: [seg.text], start_ms: seg.start_ms });
      }
      return groups;
    },
    []
  ) ?? [];

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2B7FFF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!recording) return null;

  const bottomPad = tab === "chat"
    ? (showPlayer ? "pb-[160px]" : "pb-[88px]")
    : (showPlayer ? "pb-40" : "pb-24");

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-app mx-auto min-h-screen flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-12 pb-3 sticky top-0 bg-white z-30">
          <button
            onClick={() => router.push("/")}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <div className="flex items-center gap-2 relative">
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                <MoreHorizontal size={20} className="text-gray-700" />
              </button>
              {showMenu && (
                <ContextMenu
                  recording={recording}
                  onClose={() => setShowMenu(false)}
                  onDelete={async () => {
                    await api.deleteRecording(id);
                    router.push("/");
                  }}
                  onRename={async (title) => {
                    const updated = await api.updateRecording(id, { title });
                    setRecording(updated);
                    setShowMenu(false);
                  }}
                  onIconChange={async (icon) => {
                    const updated = await api.updateRecording(id, { icon });
                    setRecording(updated);
                    setShowMenu(false);
                  }}
                />
              )}
            </div>
            <button
              onClick={() => setShowShare(true)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              <Share2 size={18} className="text-gray-700" />
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xl">
              {recording.icon}
            </div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight flex-1 min-w-0">{recording.title}</h1>
          </div>
          <p className="text-xs text-gray-400">
            {formatDate(recording.created_at)} • {formatDuration(recording.duration_sec)}
          </p>
        </div>

        {/* Tab bar — 3 tabs */}
        <div className="px-4 mb-4 sticky top-[88px] bg-white z-20 pb-2">
          <div className="flex bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setTab("minutes")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-medium transition-colors ${
                tab === "minutes" ? "bg-[#2B7FFF] text-white shadow-sm" : "text-gray-500"
              }`}
            >
              <AlignLeft size={13} />
              Minutes
            </button>
            <button
              onClick={() => setTab("transcript")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-medium transition-colors ${
                tab === "transcript" ? "bg-[#2B7FFF] text-white shadow-sm" : "text-gray-500"
              }`}
            >
              <MessageSquare size={13} />
              Transcript
            </button>
            <button
              onClick={() => setTab("chat")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-medium transition-colors ${
                tab === "chat" ? "bg-[#2B7FFF] text-white shadow-sm" : "text-gray-500"
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Chat
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className={`flex-1 overflow-y-auto px-4 ${bottomPad}`}>
          {tab === "minutes" ? (
            <div>
              <div className="prose prose-sm max-w-none text-gray-800 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-1 [&_strong]:font-semibold [&_ul]:pl-5 [&_li]:mb-0.5">
                {recording.notes_markdown ? (
                  <ReactMarkdown>{recording.notes_markdown}</ReactMarkdown>
                ) : (
                  <p className="text-gray-400 text-sm">No notes available.</p>
                )}
              </div>

              {/* Rate these notes */}
              <div className="mt-8 flex items-center gap-3 border-t border-gray-100 pt-6">
                <span className="text-sm text-gray-500 flex-1">Rate these notes</span>
                <button
                  onClick={() => handleRate(-1)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    recording.rating === -1 ? "bg-red-100" : "bg-gray-100 hover:bg-red-50"
                  }`}
                >
                  <ThumbsDown size={18} className={recording.rating === -1 ? "text-red-500" : "text-gray-500"} />
                </button>
                <button
                  onClick={() => handleRate(1)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    recording.rating === 1 ? "bg-green-100" : "bg-gray-100 hover:bg-green-50"
                  }`}
                >
                  <ThumbsUp size={18} className={recording.rating === 1 ? "text-green-500" : "text-gray-500"} />
                </button>
                <button
                  onClick={showPlayer ? player.toggle : handlePlayAudio}
                  className="w-10 h-10 rounded-full bg-[#2B7FFF] flex items-center justify-center"
                >
                  <Play size={18} fill="white" className="text-white ml-0.5" />
                </button>
              </div>
            </div>

          ) : tab === "transcript" ? (
            /* ── Transcript: paragraphs grouped by speaker ── */
            <div className="space-y-5">
              {transcriptGroups.length === 0 ? (
                <p className="text-gray-400 text-sm">No transcript available.</p>
              ) : (
                transcriptGroups.map((group, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-[11px] font-bold text-[#2B7FFF]">
                          {group.speaker.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-gray-900">{group.speaker}</span>
                      <span className="text-[10px] text-gray-400">{formatTime(group.start_ms)}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed pl-9">
                      {group.texts.join(" ")}
                    </p>
                  </div>
                ))
              )}
            </div>

          ) : (
            /* ── Chat tab ── */
            <div>
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2B7FFF" strokeWidth="2" strokeLinecap="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-700 font-semibold text-base">Ask about this meeting</p>
                  <p className="text-gray-400 text-sm mt-1 mb-5">Get summaries, find action items, ask questions</p>
                  <div className="flex flex-col gap-2 w-full">
                    {["What were the key decisions?", "What are the action items?", "Who said what?"].map((q) => (
                      <button
                        key={q}
                        onClick={() => setChatInput(q)}
                        className="text-sm bg-gray-50 border border-gray-200 text-gray-600 rounded-2xl px-4 py-2.5 text-left hover:bg-gray-100 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pb-2">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-[#2B7FFF] text-white rounded-br-sm"
                          : "bg-gray-100 text-gray-800 rounded-bl-sm"
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat input bar — fixed bottom when chat tab active */}
        {tab === "chat" && (
          <div className={`fixed left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 z-30 ${showPlayer ? "bottom-[76px]" : "bottom-0"}`}>
            <div className="max-w-app mx-auto flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()}
                placeholder="Ask about this meeting..."
                className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm outline-none placeholder-gray-400"
                disabled={chatLoading}
              />
              <button
                onClick={sendChat}
                disabled={!chatInput.trim() || chatLoading}
                className="w-10 h-10 rounded-full bg-[#2B7FFF] flex items-center justify-center disabled:opacity-40 flex-shrink-0"
              >
                <Send size={16} className="text-white ml-0.5" />
              </button>
            </div>
          </div>
        )}

        {/* Audio player bar */}
        {showPlayer && (
          <AudioPlayer player={player} onClose={handleClosePlayer} />
        )}
      </div>

      {showShare && (
        <ShareModal
          recording={recording}
          onClose={() => setShowShare(false)}
          onUpdate={(updates) => setRecording((prev) => prev ? { ...prev, ...updates } : prev)}
        />
      )}
    </div>
  );
}
