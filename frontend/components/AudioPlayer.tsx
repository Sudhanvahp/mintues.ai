"use client";
import { X, Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { AudioPlayerState } from "@/hooks/useAudioPlayer";

interface Props {
  player: AudioPlayerState;
  onClose: () => void;
}

function fmt(sec: number): string {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const SPEEDS = [1, 1.5, 2];

export function AudioPlayer({ player, onClose }: Props) {
  const { isPlaying, currentTime, duration, speed, toggle, skipBack, skipForward, seek, setSpeed } = player;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const nextSpeed = () => {
    const idx = SPEEDS.indexOf(speed);
    setSpeed(SPEEDS[(idx + 1) % SPEEDS.length]);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <div className="w-full max-w-app bg-white border-t border-gray-100 shadow-2xl pb-6 pt-3 px-5 pointer-events-auto">
        {/* Scrubber */}
        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-[11px] text-gray-400 tabular-nums font-medium w-8 text-right">{fmt(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={(e) => seek(Number(e.target.value))}
            className="flex-1 h-1 accent-[#2B7FFF] cursor-pointer"
          />
          <span className="text-[11px] text-gray-400 tabular-nums font-medium w-8">{fmt(duration)}</span>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          {/* Speed */}
          <button
            onClick={nextSpeed}
            className="min-w-[48px] h-8 px-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-600 transition-colors"
          >
            {speed}x
          </button>

          {/* ← 15  Play  15 → */}
          <div className="flex items-center gap-3">
            <button
              onClick={skipBack}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
            >
              <SkipBack size={20} className="text-gray-600" />
            </button>

            <button
              onClick={toggle}
              className="w-12 h-12 rounded-2xl bg-[#2B7FFF] flex items-center justify-center shadow-md shadow-blue-200 active:scale-95 transition-transform"
            >
              {isPlaying ? (
                <Pause size={20} fill="white" className="text-white" />
              ) : (
                <Play size={20} fill="white" className="text-white ml-0.5" />
              )}
            </button>

            <button
              onClick={skipForward}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
            >
              <SkipForward size={20} className="text-gray-600" />
            </button>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  );
}
