"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Settings } from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { PromptLanguageModal, loadSettings } from "@/components/PromptLanguageModal";
import { api } from "@/lib/api";

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function RecordPage() {
  const router = useRouter();
  const { isRecording, duration, audioBlob, waveformData, error, startRecording, stopRecording, reset } =
    useAudioRecorder();
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stopped, setStopped] = useState(false);
  const startedRef = useRef(false);

  // Use ref guard to prevent StrictMode double-call (fixes even-number timer)
  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      startRecording();
    }
  }, [startRecording]);

  // When audioBlob is ready after stopping, show Transcribe button (don't auto-upload)
  useEffect(() => {
    if (audioBlob) {
      setStopped(true);
    }
  }, [audioBlob]);

  const handleUpload = async (blob: Blob) => {
    if (blob.size < 2000) {
      alert(
        "No audio was captured (file is " + blob.size + " bytes).\n\n" +
        "Please check:\n" +
        "1. Your microphone is plugged in\n" +
        "2. Browser has microphone permission (click the lock icon in the address bar)\n" +
        "3. Windows microphone privacy: Start → Settings → Privacy → Microphone → allow browser\n\n" +
        "Note: HDMI monitors usually don't have a microphone — use a USB or 3.5mm mic."
      );
      reset();
      setStopped(false);
      startedRef.current = false;
      return;
    }
    setUploading(true);
    try {
      const settings = loadSettings();
      const language = settings.audioLanguages.length === 1
        ? settings.audioLanguages[0]
        : "auto";
      const recording = await api.uploadRecording(blob, {
        context: settings.context,
        keywords: settings.keywords,
        language,
      });
      router.push(`/processing/${recording.id}`);
    } catch (err) {
      console.error(err);
      alert("Upload failed. Is the backend running?");
      setUploading(false);
    }
  };

  const handleStop = () => stopRecording();

  const handleTranscribe = () => {
    if (audioBlob) handleUpload(audioBlob);
  };

  const handleDiscard = () => {
    reset();
    router.back();
  };

  const handleReRecord = () => {
    reset();
    setStopped(false);
    startedRef.current = true;
    setTimeout(() => startRecording(), 150);
  };

  const waveHeights = waveformData.map((v) => Math.max(8, (v / 100) * 40));

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-app mx-auto min-h-screen flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-12 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2B7FFF]" />
            <span className="font-semibold text-gray-900">Minutes AI</span>
          </div>
          <button
            onClick={handleDiscard}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <X size={16} className="text-gray-600" />
          </button>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
          {uploading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-[#2B7FFF] border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">Uploading recording...</p>
            </div>
          ) : stopped ? (
            /* ── Stopped: show Transcribe & Summarize ── */
            <>
              <div className="w-[200px] h-[240px] bg-gray-100 rounded-[40px] flex items-center justify-center">
                <div className="w-[130px] h-[130px] rounded-full bg-gray-300 flex items-center justify-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="1.5" fill="none" />
                    <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" />
                    <line x1="8" y1="23" x2="16" y2="23" stroke="white" strokeWidth="2" />
                  </svg>
                </div>
              </div>

              <p className="text-[32px] font-bold text-gray-900 tabular-nums">{formatTime(duration)}</p>
              <p className="text-gray-400 text-sm">Recording complete</p>

              <div className="w-full flex flex-col gap-3 mt-2">
                <button
                  onClick={handleTranscribe}
                  className="w-full bg-[#2B7FFF] text-white rounded-full py-4 font-semibold text-base flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                  Transcribe &amp; Summarize
                </button>
                <button
                  onClick={handleReRecord}
                  className="w-full border border-gray-200 text-gray-500 rounded-full py-3.5 font-medium text-sm active:scale-95 transition-transform"
                >
                  Re-record
                </button>
              </div>
            </>
          ) : (
            /* ── Recording in progress ── */
            <>
              <div className="w-[200px] h-[240px] bg-gray-100 rounded-[40px] flex items-center justify-center relative">
                {isRecording && (
                  <div className="absolute w-[130px] h-[130px] rounded-full bg-[#2B7FFF]/20 mic-pulse" />
                )}
                <button
                  onClick={isRecording ? handleStop : () => startRecording()}
                  className="w-[130px] h-[130px] rounded-full bg-[#2B7FFF] flex items-center justify-center shadow-lg active:scale-95 transition-transform relative z-10"
                >
                  {isRecording ? (
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                      <rect x="6" y="6" width="4" height="12" rx="1" />
                      <rect x="14" y="6" width="4" height="12" rx="1" />
                    </svg>
                  ) : (
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="1.5" fill="none" />
                      <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" />
                      <line x1="8" y1="23" x2="16" y2="23" stroke="white" strokeWidth="2" />
                    </svg>
                  )}
                </button>
              </div>

              <p className="text-[32px] font-bold text-gray-900 tabular-nums">{formatTime(duration)}</p>

              <div className="flex items-center gap-2 h-10">
                {waveHeights.map((h, i) => (
                  <div
                    key={i}
                    className={`w-2 rounded-full bg-[#2B7FFF] transition-all duration-75 wave-bar-${i + 1}`}
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>

              <p className="text-gray-400 text-sm">
                {isRecording ? "Tap to stop recording..." : "Tap mic to start"}
              </p>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-left w-full">
                  <p className="text-red-600 text-sm font-semibold mb-1">Microphone access denied</p>
                  <ul className="text-red-500 text-xs space-y-1 list-disc list-inside">
                    <li>Click the lock icon in the address bar → allow Microphone</li>
                    <li>Windows: Settings → Privacy → Microphone → allow browser</li>
                    <li>Close Teams, Zoom, or any app using the mic</li>
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom: Prompt & Language (only while recording) */}
        {!uploading && !stopped && (
          <div className="px-4 pb-10">
            <button
              className="w-full flex items-center justify-center gap-2 bg-gray-50 border border-gray-100 rounded-2xl py-3 text-sm text-gray-500 font-medium hover:bg-gray-100 transition-colors"
              onClick={() => setShowModal(true)}
            >
              <Settings size={16} className="text-gray-400" />
              Prompt &amp; Language
            </button>
          </div>
        )}
      </div>

      {showModal && <PromptLanguageModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
