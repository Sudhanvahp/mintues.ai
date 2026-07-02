"use client";
import { useState, useRef, useCallback, useEffect } from "react";

export interface AudioRecorderState {
  isRecording: boolean;
  duration: number;
  audioBlob: Blob | null;
  waveformData: number[];
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  reset: () => void;
}

function encodeWAV(chunks: Float32Array[], sampleRate: number): Blob {
  const totalLen = chunks.reduce((s, c) => s + c.length, 0);
  const buf = new ArrayBuffer(44 + totalLen * 2);
  const view = new DataView(buf);
  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  str(0, "RIFF");
  view.setUint32(4, 36 + totalLen * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);          // PCM
  view.setUint16(22, 1, true);          // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, "data");
  view.setUint32(40, totalLen * 2, true);
  let off = 44;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++) {
      const s = Math.max(-1, Math.min(1, chunk[i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([buf], { type: "audio/wav" });
}

export function useAudioRecorder(): AudioRecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([0, 0, 0]);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef<number>(16000);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);
  const activeRef = useRef(false);

  const stopWaveform = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    analyserRef.current = null;
    setWaveformData([0, 0, 0]);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioBlob(null);
      chunksRef.current = [];
      activeRef.current = false;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = ctx;
      sampleRateRef.current = ctx.sampleRate;

      const source = ctx.createMediaStreamSource(stream);

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      source.connect(processor);
      processor.connect(ctx.destination);
      activeRef.current = true;

      processor.onaudioprocess = (e) => {
        if (!activeRef.current) return;
        chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        const s = Math.floor(data.length / 3);
        const avg = (a: number, b: number) => {
          let t = 0; for (let i = a; i < b; i++) t += data[i]; return t / (b - a);
        };
        setWaveformData([Math.min(100, avg(0, s)), Math.min(100, avg(s, s * 2)), Math.min(100, avg(s * 2, data.length))]);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Microphone access denied");
    }
  }, []);

  const stopRecording = useCallback(() => {
    activeRef.current = false;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    stopWaveform();

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }

    const blob = encodeWAV(chunksRef.current, sampleRateRef.current);
    setAudioBlob(blob);

    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setIsRecording(false);
  }, [stopWaveform]);

  const reset = useCallback(() => {
    activeRef.current = false;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    stopWaveform();
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    chunksRef.current = [];
    setAudioBlob(null);
    setDuration(0);
    setError(null);
    setIsRecording(false);
  }, [stopWaveform]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      stopWaveform();
      processorRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => {});
    };
  }, [stopWaveform]);

  return { isRecording, duration, audioBlob, waveformData, error, startRecording, stopRecording, reset };
}
