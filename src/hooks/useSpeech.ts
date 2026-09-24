import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

/** Speech-to-Text via the Web Speech API. */
export function useSpeechInput(onTranscript: (text: string, final: boolean) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const callbackRef = useRef(onTranscript);
  callbackRef.current = onTranscript;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const Ctor = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    setSupported(Boolean(Ctor));
    return () => recognitionRef.current?.abort();
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;
    const Ctor = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!Ctor) {
      setError("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }
    setError(null);
    const recognition: SpeechRecognitionLike = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }
      if (final) callbackRef.current(final.trim(), true);
      else if (interim) callbackRef.current(interim.trim(), false);
    };
    recognition.onerror = (event: any) => {
      const code = event?.error;
      setError(
        code === "not-allowed" || code === "service-not-allowed"
          ? "Microphone access was blocked. Allow it in your browser settings."
          : code === "no-speech"
            ? "I didn't hear anything. Try again."
            : "Voice input failed. Please try again.",
      );
      setListening(false);
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setError("Voice input could not start. Try again.");
    }
  }, []);

  const restart = useCallback(() => {
    recognitionRef.current?.abort();
    setTimeout(start, 120);
  }, [start]);

  return { listening, supported, error, start, stop, restart, clearError: () => setError(null) };
}

/** Text-to-Speech via the Web Speech API. */
export function useSpeechOutput() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback(
    (id: string, text: string) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      const clean = text.replace(/[#*`_>]/g, "").slice(0, 4000);
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = "en-US";
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onend = () => {
        setSpeakingId(null);
        setPaused(false);
      };
      utterance.onerror = () => {
        setSpeakingId(null);
        setPaused(false);
      };
      window.speechSynthesis.speak(utterance);
      setSpeakingId(id);
      setPaused(false);
    },
    [supported],
  );

  const pause = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.pause();
    setPaused(true);
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.resume();
    setPaused(false);
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeakingId(null);
    setPaused(false);
  }, [supported]);

  return { supported, speakingId, paused, speak, pause, resume, stop };
}
