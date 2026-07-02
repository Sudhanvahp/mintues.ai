"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { X, Check } from "lucide-react";
import { usePolling } from "@/hooks/usePolling";
import { api, StatusResponse } from "@/lib/api";

const STEPS = [
  "Processing Audio",
  "Transcribing",
  "Identifying Speakers",
  "Taking Notes",
  "Finishing Touches",
];

export default function ProcessingPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [status, setStatus] = useState<StatusResponse>({
    status: "processing",
    step: "Processing Audio",
    percent: 5,
  });

  usePolling(
    () => api.getStatus(id),
    2000,
    (data) => {
      setStatus(data);
      if (data.status === "done") {
        setTimeout(() => router.push(`/notes/${id}`), 500);
      }
    },
    (data) => data.status === "done" || data.status === "error",
    true
  );

  const currentStepIndex = STEPS.findIndex((s) => s === status.step);

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
            onClick={() => router.push("/")}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <X size={16} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 gap-6">
          {status.status === "error" ? (
            <div className="w-full text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                <X size={28} className="text-red-400" />
              </div>
              <p className="text-gray-900 font-semibold">Processing failed</p>
              <p className="text-gray-400 text-sm">{status.error_message || "Unknown error"}</p>
              <button
                className="bg-[#2B7FFF] text-white px-6 py-3 rounded-full font-medium text-sm"
                onClick={() => router.push("/")}
              >
                Go home
              </button>
            </div>
          ) : (
            <>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">Processing your recording</p>
                <p className="text-sm text-gray-400 mt-0.5">AI is working on it now</p>
              </div>

              {/* Steps card */}
              <div className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {STEPS.map((step, i) => {
                  const isDone = i < currentStepIndex || status.status === "done";
                  const isCurrent = i === currentStepIndex && status.status !== "done";
                  const isPending = i > currentStepIndex && status.status !== "done";

                  return (
                    <div
                      key={step}
                      className={`flex items-center gap-3 px-4 py-3.5 ${i < STEPS.length - 1 ? "border-b border-gray-50" : ""}`}
                    >
                      {/* Step indicator */}
                      {isDone ? (
                        <div className="w-7 h-7 rounded-full bg-[#2B7FFF] flex items-center justify-center flex-shrink-0">
                          <Check size={14} className="text-white" strokeWidth={3} />
                        </div>
                      ) : isCurrent ? (
                        <div className="w-7 h-7 flex-shrink-0 relative">
                          <svg className="w-7 h-7 animate-spin-slow" viewBox="0 0 28 28">
                            <circle
                              cx="14" cy="14" r="11"
                              fill="none"
                              stroke="#e5e7eb"
                              strokeWidth="2.5"
                            />
                            <circle
                              cx="14" cy="14" r="11"
                              fill="none"
                              stroke="#2B7FFF"
                              strokeWidth="2.5"
                              strokeDasharray="45 24"
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full border-2 border-gray-200 flex-shrink-0" />
                      )}

                      {/* Step name */}
                      <span
                        className={`flex-1 text-sm font-medium ${
                          isPending ? "text-gray-400" : "text-gray-900"
                        }`}
                      >
                        {step}
                      </span>

                      {/* Percent badge */}
                      {isCurrent && (
                        <span className="text-sm font-semibold text-[#2B7FFF]">
                          {status.percent}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Hint */}
              <p className="text-gray-400 text-xs text-center px-4 leading-relaxed">
                For longer recordings, this might take a minute or two.{"\n"}Don&apos;t leave the page.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
