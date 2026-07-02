"use client";
import { useState, useEffect } from "react";
import { X, Link, FileText, MessageSquare, Music } from "lucide-react";
import { api, Recording } from "@/lib/api";

interface Props {
  recording: Recording;
  onClose: () => void;
  onUpdate: (updated: Partial<Recording>) => void;
}

export function ShareModal({ recording, onClose, onUpdate }: Props) {
  const [shareEnabled, setShareEnabled] = useState(recording.share_enabled);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (recording.share_enabled && recording.share_token) {
      setShareUrl(`${window.location.origin}/shared/${recording.share_token}`);
    }
  }, [recording]);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const res = await api.toggleShare(recording.id, !shareEnabled);
      setShareEnabled(res.share_enabled);
      setShareUrl(res.share_url);
      onUpdate({ share_enabled: res.share_enabled, share_token: recording.share_token });
    } catch {
      alert("Failed to toggle sharing");
    } finally {
      setToggling(false);
    }
  };

  const copy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportNotesPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(recording.title, 14, 20);
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(recording.notes_markdown || "No notes available.", 180);
    doc.text(lines, 14, 35);
    doc.save(`${recording.title}_notes.pdf`);
  };

  const exportTranscriptPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`${recording.title} — Transcript`, 14, 20);
    doc.setFontSize(10);
    let y = 35;
    for (const seg of recording.transcript_json) {
      const lines = doc.splitTextToSize(`${seg.speaker}: ${seg.text}`, 180);
      if (y + lines.length * 6 > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(lines, 14, y);
      y += lines.length * 6 + 3;
    }
    doc.save(`${recording.title}_transcript.pdf`);
  };

  const exportAudio = () => {
    const a = document.createElement("a");
    a.href = api.audioUrl(recording.id);
    a.download = `${recording.title}.audio`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl px-5 pt-5 pb-10">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-gray-900 text-lg">Share Minutes</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Link sharing toggle */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Link size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-900">Link Sharing</span>
            </div>
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`w-12 h-6 rounded-full transition-colors relative ${shareEnabled ? "bg-[#2B7FFF]" : "bg-gray-200"}`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${shareEnabled ? "left-6" : "left-0.5"}`}
              />
            </button>
          </div>
          <p className="text-xs text-gray-400">Enable or disable link sharing</p>

          {shareEnabled && shareUrl && (
            <div className="flex items-center gap-2 mt-3">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none truncate"
              />
              <button
                onClick={copy}
                className="px-3 py-2 bg-[#2B7FFF] text-white text-xs rounded-xl font-medium"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
        </div>

        {/* Export options */}
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Export / Download</p>
        <div className="space-y-1">
          {[
            { icon: <FileText size={18} />, label: "Share Notes as PDF", action: exportNotesPDF },
            {
              icon: <FileText size={18} />,
              label: "Share Notes as Text",
              action: () =>
                downloadText(recording.notes_markdown || "No notes.", `${recording.title}_notes.txt`),
            },
            { icon: <MessageSquare size={18} />, label: "Share Transcript as PDF", action: exportTranscriptPDF },
            {
              icon: <MessageSquare size={18} />,
              label: "Share Transcript as Text",
              action: () => {
                const text = recording.transcript_json
                  .map((s) => `${s.speaker}: ${s.text}`)
                  .join("\n");
                downloadText(text || "No transcript.", `${recording.title}_transcript.txt`);
              },
            },
            { icon: <Music size={18} />, label: "Share Audio File", action: exportAudio },
          ].map(({ icon, label, action }) => (
            <button
              key={label}
              onClick={action}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-sm text-gray-800"
            >
              <span className="text-gray-500">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
