import { useState, useRef, useCallback, useEffect } from "react";

export function useMicrophone() {
  const [micState, setMicState] = useState("idle"); // idle | requesting | granted | denied | error
  const [muted, setMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 0..100
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  // Monitor audio levels for VU meter
  const startLevelMeter = (stream) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current || !streamRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        // Normalize to 0..100 with sensitivity curve
        const level = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(level);
        animFrameRef.current = requestAnimationFrame(checkVolume);
      };
      animFrameRef.current = requestAnimationFrame(checkVolume);
    } catch (_) {}
  };

  const requestMic = useCallback(async () => {
    setMicState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      streamRef.current = stream;
      setMicState("granted");
      startLevelMeter(stream);
      return stream;
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMicState("denied");
      } else {
        setMicState("error");
      }
      return null;
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!streamRef.current) return muted;
    const nextMuted = !muted;
    streamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !nextMuted;
    });
    setMuted(nextMuted);
    if (nextMuted) setAudioLevel(0);
    return nextMuted;
  }, [muted]);

  const setExplicitMute = useCallback((shouldMute) => {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !shouldMute;
    });
    setMuted(shouldMute);
    if (shouldMute) setAudioLevel(0);
  }, []);

  const stopMic = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setMicState("idle");
    setMuted(false);
    setAudioLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return {
    micState,
    muted,
    audioLevel,
    streamRef,
    requestMic,
    toggleMute,
    setExplicitMute,
    stopMic,
  };
}
