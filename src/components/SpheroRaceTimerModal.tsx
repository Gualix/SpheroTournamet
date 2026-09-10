import React, { useState, useEffect, useRef } from 'react';
import { Race, RaceDifficulty } from '../types';
import {
  Play,
  Pause,
  RotateCcw,
  Flag,
  Volume2,
  VolumeX,
  X,
  Flame,
  Plus,
  Minus,
  CheckCircle,
  Music,
} from 'lucide-react';
import {
  playClickSfx,
  playRaceCountdownBeep,
  playRaceTick,
  playRaceFinishHorn,
  isAudioEnabled,
  toggleAudio,
  startRaceMusic,
  stopRaceMusic,
  toggleRaceMusicMute,
  isRaceMusicMuted,
} from '../utils/audio';

interface SpheroRaceTimerModalProps {
  race: Race;
  onClose: () => void;
  onFinishRace: (race: Race) => void;
  onUpdateRaceDifficulty?: (raceId: string, difficulty: RaceDifficulty) => void;
}

export const SpheroRaceTimerModal: React.FC<SpheroRaceTimerModalProps> = ({
  race,
  onClose,
  onFinishRace,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(race.durationSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [audioOn, setAudioOn] = useState<boolean>(isAudioEnabled());
  const [musicMuted, setMusicMuted] = useState<boolean>(isRaceMusicMuted());
  const [countdownPrep, setCountdownPrep] = useState<number | null>(null); // 3, 2, 1, 0 (GO)
  const [isFinished, setIsFinished] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prepTimerRef = useRef<NodeJS.Timeout | null>(null);

  const totalDuration = race.durationSeconds > 0 ? race.durationSeconds : 120;
  const progressRatio = Math.max(0, Math.min(1, timeLeft / totalDuration));

  // Stop music on unmount
  useEffect(() => {
    return () => {
      stopRaceMusic();
    };
  }, []);

  // Handle countdown prep (3, 2, 1, GO!)
  useEffect(() => {
    if (countdownPrep !== null) {
      if (countdownPrep > 0) {
        playRaceCountdownBeep(false);
        prepTimerRef.current = setTimeout(() => {
          setCountdownPrep(prev => (prev !== null ? prev - 1 : null));
        }, 800);
      } else if (countdownPrep === 0) {
        playRaceCountdownBeep(true);
        prepTimerRef.current = setTimeout(() => {
          setCountdownPrep(null);
          setIsRunning(true);
          startRaceMusic();
        }, 600);
      }
    }
    return () => {
      if (prepTimerRef.current) clearTimeout(prepTimerRef.current);
    };
  }, [countdownPrep]);

  // Main timer tick
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      startRaceMusic();
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const next = prev - 1;
          if (next <= 10 && next > 0) {
            playRaceTick();
          } else if (next === 0) {
            stopRaceMusic();
            playRaceFinishHorn();
            setIsFinished(true);
            setIsRunning(false);
          }
          return next;
        });
      }, 1000);
    } else {
      if (!isRunning) {
        stopRaceMusic();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeft]);

  const handleStartWithPrep = () => {
    playClickSfx();
    if (timeLeft <= 0) {
      setTimeLeft(totalDuration);
      setIsFinished(false);
    }
    setCountdownPrep(3);
  };

  const handlePause = () => {
    playClickSfx();
    setIsRunning(false);
    stopRaceMusic();
    if (countdownPrep !== null) {
      setCountdownPrep(null);
    }
  };

  const handleReset = () => {
    playClickSfx();
    setIsRunning(false);
    stopRaceMusic();
    setCountdownPrep(null);
    setTimeLeft(totalDuration);
    setIsFinished(false);
  };

  const handleAdjustTime = (seconds: number) => {
    playClickSfx();
    setTimeLeft(prev => Math.max(5, prev + seconds));
  };

  const handleToggleSound = () => {
    const newState = toggleAudio();
    setAudioOn(newState);
  };

  const handleToggleMusic = () => {
    playClickSfx();
    const muted = toggleRaceMusicMute();
    setMusicMuted(muted);
  };

  const handleClose = () => {
    stopRaceMusic();
    onClose();
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Circular gauge calculations
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progressRatio * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-xl bg-slate-900/95 border border-slate-700/80 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden flex flex-col">
        {/* Glow Accent Top Header */}
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-sky-400 to-amber-400" />

        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  CARRERA #{race.raceNumber}
                </span>
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Dificultad: {race.difficulty.multiplier}x
                </span>
              </div>
              <h2 className="text-base font-black text-white truncate max-w-xs sm:max-w-md mt-0.5">
                {race.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleMusic}
              className={`p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-semibold ${
                !musicMuted && audioOn
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20'
                  : 'bg-slate-800/80 text-slate-500 hover:text-slate-300 border border-transparent'
              }`}
              title={!musicMuted && audioOn ? 'Silenciar música energética' : 'Activar música energética'}
            >
              <Music className={`w-4 h-4 ${isRunning && !musicMuted && audioOn ? 'animate-bounce text-amber-400' : ''}`} />
              <span className="hidden sm:inline">Música</span>
            </button>
            <button
              onClick={handleToggleSound}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
              title={audioOn ? 'Silenciar sonidos' : 'Activar sonidos'}
            >
              {audioOn ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              onClick={handleClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Timer Display */}
        <div className="p-6 sm:p-8 flex flex-col items-center justify-center relative">
          {/* Active Music Visualizer Bar */}
          {isRunning && !musicMuted && audioOn && (
            <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold uppercase tracking-wider animate-fadeIn">
              <span className="flex items-center gap-0.5 h-3">
                <span className="w-1 h-3 bg-amber-400 rounded-full animate-pulse" />
                <span className="w-1 h-4 bg-cyan-400 rounded-full animate-pulse delay-75" />
                <span className="w-1 h-2 bg-pink-400 rounded-full animate-pulse delay-150" />
                <span className="w-1 h-3.5 bg-yellow-400 rounded-full animate-pulse delay-100" />
              </span>
              <span>⚡ Música Energética en Pista (134 BPM)</span>
            </div>
          )}
          {/* Visual Sphero Timer Circular Ring */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 260 260">
              {/* Background track */}
              <circle
                cx="130"
                cy="130"
                r={radius}
                className="text-slate-800"
                strokeWidth="10"
                stroke="currentColor"
                fill="transparent"
              />
              {/* Active progress ring */}
              <circle
                cx="130"
                cy="130"
                r={radius}
                stroke="url(#timerGradient)"
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-300"
              />
              <defs>
                <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="70%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor={timeLeft <= 10 ? '#ef4444' : '#f59e0b'} />
                </linearGradient>
              </defs>
            </svg>

            {/* Central Big Digits or Countdown Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              {countdownPrep !== null ? (
                <div className="animate-ping text-6xl sm:text-7xl font-black text-cyan-400 font-mono">
                  {countdownPrep === 0 ? '¡YA!' : countdownPrep}
                </div>
              ) : (
                <>
                  <span
                    className={`text-5xl sm:text-6xl font-black font-mono tracking-tight transition-colors ${
                      isFinished
                        ? 'text-rose-400 animate-pulse'
                        : timeLeft <= 10
                        ? 'text-amber-400 drop-shadow-[0_0_20px_rgba(245,158,11,0.6)]'
                        : 'text-white drop-shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                    }`}
                  >
                    {formatTime(timeLeft)}
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-2">
                    {isFinished
                      ? '🏁 ¡TIEMPO CUMPLIDO!'
                      : isRunning
                      ? '⚡ CARRERA EN PISTA'
                      : 'EN ESPERA DE SALIDA'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Quick Time Adjustment Pills */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => handleAdjustTime(-15)}
              disabled={isRunning || timeLeft <= 15}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Minus className="w-3 h-3" /> 15s
            </button>
            <button
              onClick={() => handleAdjustTime(-5)}
              disabled={isRunning || timeLeft <= 5}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Minus className="w-3 h-3" /> 5s
            </button>
            <span className="text-[11px] text-slate-500 font-mono">Ajustar tiempo</span>
            <button
              onClick={() => handleAdjustTime(15)}
              disabled={isRunning}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 disabled:opacity-30 transition-all"
            >
              <Plus className="w-3 h-3" /> 15s
            </button>
            <button
              onClick={() => handleAdjustTime(60)}
              disabled={isRunning}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 disabled:opacity-30 transition-all"
            >
              <Plus className="w-3 h-3" /> 1m
            </button>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6 w-full">
            {!isRunning ? (
              <button
                onClick={handleStartWithPrep}
                className="px-7 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>{timeLeft < totalDuration && timeLeft > 0 ? 'Reanudar Carrera' : 'Iniciar Carrera'}</span>
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="px-7 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Pause className="w-4 h-4 fill-slate-950" />
                <span>Pausar Carrera</span>
              </button>
            )}

            <button
              onClick={handleReset}
              className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Reiniciar cronómetro al tiempo original"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reiniciar</span>
            </button>
          </div>
        </div>

        {/* Footer Finish & Record Action */}
        <div className="px-6 py-4 bg-slate-950/70 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-cyan-400" />
            <span>Al cruzar la meta registra los 5 primeros lugares.</span>
          </div>

          <button
            onClick={() => {
              playClickSfx();
              stopRaceMusic();
              if (isRunning) setIsRunning(false);
              onFinishRace(race);
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Flag className="w-4 h-4 fill-slate-950" />
            <span>Finalizar y Registrar Top 5</span>
          </button>
        </div>
      </div>
    </div>
  );
};
