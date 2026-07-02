"use client";
import { useState, useRef, useCallback, useEffect } from "react";

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  load: (src: string) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  skipForward: () => void;
  skipBack: () => void;
  setSpeed: (s: number) => void;
  unload: () => void;
}

export function useAudioPlayer(): AudioPlayerState {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeedState] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    return audioRef.current;
  }, []);

  const load = useCallback(
    (src: string) => {
      const audio = ensureAudio();
      audio.src = src;
      audio.playbackRate = speed;

      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      audio.ondurationchange = () => setDuration(audio.duration || 0);
      audio.onplay = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        audio.currentTime = 0;
      };
      audio.load();
    },
    [ensureAudio, speed]
  );

  const play = useCallback(() => {
    audioRef.current?.play().catch(() => {});
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play().catch(() => {});
  }, [isPlaying]);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(time, audioRef.current.duration || 0));
  }, []);

  const skipForward = useCallback(() => {
    seek((audioRef.current?.currentTime || 0) + 15);
  }, [seek]);

  const skipBack = useCallback(() => {
    seek((audioRef.current?.currentTime || 0) - 15);
  }, [seek]);

  const setSpeed = useCallback((s: number) => {
    setSpeedState(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  }, []);

  const unload = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  return { isPlaying, currentTime, duration, speed, load, play, pause, toggle, seek, skipForward, skipBack, setSpeed, unload };
}
