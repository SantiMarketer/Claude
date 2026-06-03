import { useCallback, useEffect, useRef, useState } from "react";
import type { Settings, TimerMode } from "../types";

function durationFor(mode: TimerMode, s: Settings): number {
  switch (mode) {
    case "focus":
      return s.focusMinutes * 60;
    case "short":
      return s.shortBreakMinutes * 60;
    case "long":
      return s.longBreakMinutes * 60;
  }
}

export interface PomodoroApi {
  mode: TimerMode;
  secondsLeft: number;
  isRunning: boolean;
  round: number;
  total: number;
  progress: number; // 0..1
  start: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  skip: () => void;
  selectMode: (m: TimerMode) => void;
}

/**
 * Lógica del ciclo Pomodoro: cuenta atrás precisa (basada en marca de
 * tiempo real) y transición automática entre concentración y descansos.
 * `onComplete(mode, plannedSeconds)` se dispara al terminar cada fase.
 */
export function usePomodoro(
  settings: Settings,
  onComplete: (finished: TimerMode, plannedSeconds: number) => void
): PomodoroApi {
  const [mode, setMode] = useState<TimerMode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(() => settings.focusMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [round, setRound] = useState(0);
  const [sessionId, setSessionId] = useState(0);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const roundRef = useRef(round);
  roundRef.current = round;
  const isRunningRef = useRef(isRunning);
  isRunningRef.current = isRunning;
  const endRef = useRef<number | null>(null);

  const advance = useCallback((credit: boolean) => {
    const s = settingsRef.current;
    const finished = modeRef.current;
    if (credit) {
      onCompleteRef.current(finished, durationFor(finished, s));
    }

    let next: TimerMode;
    let autostart: boolean;
    if (finished === "focus") {
      const newRound = roundRef.current + 1;
      setRound(newRound);
      const isLong = newRound % s.roundsBeforeLongBreak === 0;
      next = isLong ? "long" : "short";
      autostart = s.autoStartBreaks;
    } else {
      if (finished === "long") setRound(0);
      next = "focus";
      autostart = s.autoStartFocus;
    }

    setMode(next);
    setSecondsLeft(durationFor(next, s));
    setIsRunning(autostart);
    if (autostart) setSessionId((x) => x + 1);
  }, []);

  // Cuenta atrás: se reinicia cada vez que cambia isRunning o sessionId.
  useEffect(() => {
    if (!isRunning) return;
    endRef.current = Date.now() + secondsLeft * 1000;
    const id = window.setInterval(() => {
      const remain = Math.round((endRef.current! - Date.now()) / 1000);
      if (remain <= 0) {
        window.clearInterval(id);
        setSecondsLeft(0);
        advance(true);
      } else {
        setSecondsLeft(remain);
      }
    }, 250);
    return () => window.clearInterval(id);
    // secondsLeft se captura intencionadamente al iniciar la sesión.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, sessionId, advance]);

  // Al cambiar la duración (ajustes) o el modo estando en pausa,
  // sincroniza el reloj con la duración de la fase actual.
  useEffect(() => {
    if (isRunningRef.current) return;
    setSecondsLeft(durationFor(modeRef.current, settingsRef.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings.focusMinutes,
    settings.shortBreakMinutes,
    settings.longBreakMinutes,
    mode,
  ]);

  const start = useCallback(() => {
    setIsRunning(true);
    setSessionId((x) => x + 1);
  }, []);

  const pause = useCallback(() => setIsRunning(false), []);

  const toggle = useCallback(() => {
    if (isRunningRef.current) setIsRunning(false);
    else {
      setIsRunning(true);
      setSessionId((x) => x + 1);
    }
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setSecondsLeft(durationFor(modeRef.current, settingsRef.current));
  }, []);

  const skip = useCallback(() => advance(false), [advance]);

  const selectMode = useCallback((m: TimerMode) => {
    setIsRunning(false);
    setMode(m);
    setSecondsLeft(durationFor(m, settingsRef.current));
  }, []);

  const total = durationFor(mode, settings);
  const progress = total > 0 ? 1 - secondsLeft / total : 0;

  return {
    mode,
    secondsLeft,
    isRunning,
    round,
    total,
    progress,
    start,
    pause,
    toggle,
    reset,
    skip,
    selectMode,
  };
}
