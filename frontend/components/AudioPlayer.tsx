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
      <div className="w-full max-w-app bg-white border-t border-gray-100 shadow-2xl pb-6 pt-3 px-4 pointer-events-auto">
        {/* Scrubber */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-gray-400 tabular-nums w-8 text-right">{fmt(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={(e) => seek(Number(e.target.value))}
            className="flex-1 h-1 accent-[#2B7FFF] cursor-pointer"
          />
          <span className="text-xs text-gray-400 tabular-nums w-8">{fmt(duration)}</span>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          {/* Speed */}
          <button
            onClick={nextSpeed}
            className="min-w-[48px] h-8 px-2.5 rounded-full bg-gray-100 text-xs font-semibold text-gray-700"
          >
            {speed}x
          </button>

          {/* ← 15  Play  15 → */}
          <div className="flex items-center gap-4">
            <button
              onClick={skipBack}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              <SkipBack size={20} className="text-gray-700" />
            </button>

            <button
              onClick={toggle}
              className="w-12 h-12 rounded-full bg-[#2B7FFF] flex items-center justify-center shadow-md active:scale-95 transition-transform"
            >
              {isPlaying ? (
                <Pause size={22} fill="white" className="text-white" />
              ) : (
                <Play size={22} fill="white" className="text-white ml-0.5" />
              )}
            </button>

            <button
              onClick={skipForward}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              <SkipForward size={20} className="text-gray-700" />
            </button>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  );
}
