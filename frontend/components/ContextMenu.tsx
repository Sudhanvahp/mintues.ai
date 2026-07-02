"use client";
import { useEffect, useRef, useState } from "react";
import { Pencil, Smile, Tag, Trash2 } from "lucide-react";
import { RecordingListItem } from "@/lib/api";

const ICONS = ["🌐", "📋", "💼", "🎯", "💡", "📊", "🔬", "🎙️", "📝", "🤝", "🚀", "⭐"];

interface Props {
  recording: RecordingListItem | { id: number; title: string; icon: string; tags: string[] };
  onClose: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
  onIconChange: (icon: string) => void;
}

export function ContextMenu({ recording, onClose, onDelete, onRename, onIconChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"menu" | "rename" | "icon">("menu");
  const [renameValue, setRenameValue] = useState(recording.title);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  if (mode === "rename") {
    return (
      <div
        ref={ref}
        className="absolute right-4 top-14 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-64"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold text-gray-900 mb-2">Rename</p>
        <input
          autoFocus
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2B7FFF]"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onRename(renameValue);
            if (e.key === "Escape") setMode("menu");
          }}
        />
        <div className="flex gap-2 mt-3">
          <button
            className="flex-1 py-2 text-sm text-gray-500 rounded-xl border border-gray-200"
            onClick={() => setMode("menu")}
          >
            Cancel
          </button>
          <button
            className="flex-1 py-2 text-sm text-white bg-[#2B7FFF] rounded-xl font-medium"
            onClick={() => onRename(renameValue)}
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  if (mode === "icon") {
    return (
      <div
        ref={ref}
        className="absolute right-4 top-14 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-64"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold text-gray-900 mb-3">Choose icon</p>
        <div className="grid grid-cols-6 gap-2">
          {ICONS.map((icon) => (
            <button
              key={icon}
              className={`text-2xl p-1 rounded-xl hover:bg-gray-100 ${recording.icon === icon ? "bg-blue-50 ring-1 ring-[#2B7FFF]" : ""}`}
              onClick={() => onIconChange(icon)}
            >
              {icon}
            </button>
          ))}
        </div>
        <button
          className="w-full mt-3 py-2 text-sm text-gray-500 rounded-xl border border-gray-200"
          onClick={() => setMode("menu")}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="absolute right-4 top-14 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-52"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 text-sm text-gray-800"
        onClick={() => setMode("rename")}
      >
        <Pencil size={16} className="text-gray-500" />
        Rename
      </button>
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 text-sm text-gray-800 border-t border-gray-50"
        onClick={() => setMode("icon")}
      >
        <Smile size={16} className="text-gray-500" />
        Edit icon
      </button>
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 text-sm text-red-500 border-t border-gray-100"
        onClick={onDelete}
      >
        <Trash2 size={16} className="text-red-400" />
        Delete
      </button>
    </div>
  );
}
