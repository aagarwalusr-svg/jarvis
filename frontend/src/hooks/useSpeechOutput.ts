"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeechOutput(
  api: string,
  token: string,
  engine: "fish" | "browser",
) {
  const config = useRef({ token, engine });
  config.current = { token, engine };
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);
  const pending = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const [speaking, setSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState("");

  const stop = useCallback(() => {
    generation.current++;
    pending.current?.abort();
    pending.current = null;
    audio.current?.pause();
    audio.current = null;
    if (url.current) {
      URL.revokeObjectURL(url.current);
      url.current = null;
    }
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    async (content: string) => {
      stop();
      setSpeechError("");
      const current = generation.current;
      if (content.length > 10000) {
        setSpeechError(
          "Response is too long for speech. Read the full answer in chat.",
        );
        return;
      }
      setSpeaking(true);
      if (config.current.engine === "browser") {
        if (!("speechSynthesis" in window)) {
          setSpeaking(false);
          setSpeechError("Speech output is unavailable in this browser.");
          return;
        }
        const utterance = new SpeechSynthesisUtterance(content);
        utterance.rate = 1.02;
        utterance.onend = () => {
          if (current === generation.current) setSpeaking(false);
        };
        utterance.onerror = () => {
          if (current === generation.current) {
            setSpeaking(false);
            setSpeechError("Browser speech playback failed.");
          }
        };
        window.speechSynthesis.speak(utterance);
        return;
      }
      const controller = new AbortController();
      pending.current = controller;
      try {
        const response = await fetch(`${api}/api/voice/speak`, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            ...(config.current.token
              ? { Authorization: `Bearer ${config.current.token}` }
              : {}),
          },
          body: JSON.stringify({ content }),
        });
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(
            error.detail || `Speech request failed (${response.status}).`,
          );
        }
        const blob = await response.blob();
        if (current !== generation.current) return;
        const source = URL.createObjectURL(blob);
        url.current = source;
        const player = new Audio(source);
        audio.current = player;
        player.onended = () => {
          if (current === generation.current) stop();
        };
        player.onerror = () => {
          if (current === generation.current) {
            stop();
            setSpeechError(
              "Audio playback failed. Try again in a supported browser.",
            );
          }
        };
        await player.play();
      } catch (error) {
        if (current !== generation.current || controller.signal.aborted) return;
        stop();
        setSpeechError(
          error instanceof Error ? error.message : "Speech output failed.",
        );
      }
    },
    [api, stop],
  );

  useEffect(
    () => () => {
      generation.current++;
      pending.current?.abort();
      audio.current?.pause();
      if (url.current) URL.revokeObjectURL(url.current);
      window.speechSynthesis?.cancel();
    },
    [],
  );
  return {
    speak,
    stop,
    speaking,
    speechError,
    clearSpeechError: () => setSpeechError(""),
  };
}
