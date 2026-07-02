"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

export interface RecordingSettings {
  context: string;
  keywords: string;
  audioLanguage: string;
  summaryLanguage: string;
}

const LANGUAGES = [
  { value: "auto", label: "Auto Detect" },
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "ar", label: "Arabic" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "pt", label: "Portuguese" },
];

const STORAGE_KEY = "minutes_ai_settings";

const defaultSettings: RecordingSettings = {
  context: "",
  keywords: "",
  audioLanguage: "auto",
  summaryLanguage: "auto",
};

interface Props {
  onClose: () => void;
}

export function PromptLanguageModal({ onClose }: Props) {
  const [settings, setSettings] = useState<RecordingSettings>(defaultSettings);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setSettings(JSON.parse(saved));
    } catch {}
  }, []);

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-white rounded-t-3xl px-5 pt-5 pb-10 max-h-[85vh] overflow-y-auto animate-slide-up">
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2B7FFF]" />
            <h2 className="font-semibold text-gray-900">Prompt & Language</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Context */}
        <label className="block text-sm font-semibold text-gray-900 mb-1.5">
          What are you recording?
        </label>
        <textarea
          rows={3}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#2B7FFF] resize-none"
          placeholder="A marketing strategy meeting..."
          value={settings.context}
          onChange={(e) => setSettings({ ...settings, context: e.target.value })}
        />

        {/* Keywords */}
        <label className="block text-sm font-semibold text-gray-900 mt-4 mb-0.5">Keywords</label>
        <p className="text-xs text-gray-400 mb-1.5">Specify uncommon acronyms or technical terms</p>
        <input
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#2B7FFF]"
          placeholder="KPI, Cache, JSON"
          value={settings.keywords}
          onChange={(e) => setSettings({ ...settings, keywords: e.target.value })}
        />

        {/* Audio Language */}
        <label className="block text-sm font-semibold text-gray-900 mt-4 mb-1.5">
          Audio Language
        </label>
        <select
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#2B7FFF] bg-white"
          value={settings.audioLanguage}
          onChange={(e) => setSettings({ ...settings, audioLanguage: e.target.value })}
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>

        {/* Summary Language */}
        <label className="block text-sm font-semibold text-gray-900 mt-4 mb-1.5">
          Summary Language
        </label>
        <select
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#2B7FFF] bg-white"
          value={settings.summaryLanguage}
          onChange={(e) => setSettings({ ...settings, summaryLanguage: e.target.value })}
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>

        {/* Save */}
        <button
          className="w-full mt-6 bg-[#2B7FFF] text-white font-semibold py-3.5 rounded-full"
          onClick={save}
        >
          Save
        </button>
      </div>
    </div>
  );
}

export function loadSettings(): RecordingSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return defaultSettings;
}
