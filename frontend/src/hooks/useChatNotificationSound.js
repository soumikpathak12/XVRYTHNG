// src/hooks/useNotificationSound.js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';


export function useNotificationSound({
  src = '/sounds/incoming.mp3',
  initialMuted = false,
  initialVolume = 1.0,        // 0.0 - 1.0
  allowWhenHidden = true,     // set false if you only want sounds when tab is visible
} = {}) {
  // <audio> element for file playback
  const audioRef = useRef(null);
  // Single shared AudioContext + nodes for beep fallback
  const audioCtxRef = useRef(null);
  const unlockedRef = useRef(false);     // becomes true after user gesture unlocks audio
  const [muted, setMuted] = useState(initialMuted);
  const [volume, setVolume] = useState(
    Math.min(1, Math.max(0, Number(initialVolume)))
  );

  // Create <audio> once
  useEffect(() => {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous'; // safe default; no effect for same-origin
    audioRef.current = audio;
  }, [src]);

  // Keep audio element in sync with mute & volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = muted;
      audioRef.current.volume = volume;
    }
  }, [muted, volume]);

  // Create a single AudioContext lazily
  const ensureAudioContext = useCallback(() => {
    if (audioCtxRef.current) return audioCtxRef.current;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtxRef.current = new Ctx();
    return audioCtxRef.current;
  }, []);

  // Try to unlock audio on first user gesture (mousedown / touchstart / keydown)
  useEffect(() => {
    const tryUnlock = async () => {
      if (unlockedRef.current) return;
      const ctx = ensureAudioContext();
      // On some browsers the context starts suspended and must be resumed after a gesture
      if (ctx && ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {
          /* ignore */
        }
      }
      // Attempt a silent play on the tag to pass autoplay gating (won’t always succeed)
      try {
        const el = audioRef.current;
        if (el) {
          el.muted = true;
          el.volume = 0;
          el.currentTime = 0;
          await el.play().catch(() => {});
          // Stop quickly
          el.pause();
          el.currentTime = 0;
          // Restore user volume/mute
          el.muted = muted;
          el.volume = volume;
        }
      } catch {
        /* ignore */
      }
      unlockedRef.current = true;
    };

    const onDown = () => tryUnlock();
    const onKey = () => tryUnlock();

    document.addEventListener('mousedown', onDown, { passive: true });
    document.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensureAudioContext, muted, volume]);

  /**
   * Explicitly enable audio (unlock).
   * Call this after a user interaction, e.g., when opening the bell menu or clicking a toggle.
   */
  const enable = useCallback(async () => {
    if (unlockedRef.current) return;
    const ctx = ensureAudioContext();
    if (ctx && ctx.state === 'suspended') {
      try { await ctx.resume(); } catch { /* ignore */ }
    }
    unlockedRef.current = true;
  }, [ensureAudioContext]);

  // Fallback beep: short 200ms sine with ramp
  const playBeep = useCallback(async () => {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880; // A5
      // Apply volume; clamp to [0,1]; also respect muted
      const target = muted ? 0.0 : Math.min(1, Math.max(0, volume));
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, 0.2 * target), ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.20);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch {
      // Ignore any runtime audio errors
    }
  }, [ensureAudioContext, muted, volume]);

  const play = useCallback(async () => {
    if (muted) return;
    if (!allowWhenHidden && document.visibilityState !== 'visible') return;

    const el = audioRef.current;
    if (el) {
      try {
        el.muted = false; 
        el.volume = Math.min(1, Math.max(0, volume));
        el.currentTime = 0;
        await el.play();
        return;
      } catch (err) {
      }
    }

    await playBeep();
  }, [muted, allowWhenHidden, volume, playBeep]);

  const toggleMuted = useCallback(() => setMuted(m => !m), []);
  const setMute = useCallback((value) => setMuted(Boolean(value)), []);
  const setVol = useCallback((value) => setVolume(Math.min(1, Math.max(0, Number(value)))), []);

  return {
    play,
    enable,         
    muted,
    toggleMuted,
    setMute,
    volume,
    setVolume: setVol,
  };
}