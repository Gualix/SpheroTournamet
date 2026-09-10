import React, { useState, useEffect } from 'react';
import { Match, Participant } from '../types';
import { AnimalAvatar } from './AnimalAvatar';
import { Swords, Trophy, Crown, Sparkles, Map, ChevronRight, CheckCircle2, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { playClickSfx, playAdvanceSfx } from '../utils/audio';

interface SequentialDuelHUDProps {
  currentMatch: Match;
  participants: Participant[];
  totalMatches: number;
  completedMatchesCount: number;
  matchSequenceIndex: number; // e.g. 1st, 2nd, etc.
  totalSequentialMatches: number;
  onSelectWinner: (matchId: string, winnerId: string, score1: number, score2: number) => void;
  onExitSequentialMode: () => void;
  onResetMatch?: (matchId: string) => void;
}

export const SequentialDuelHUD: React.FC<SequentialDuelHUDProps> = ({
  currentMatch,
  participants,
  matchSequenceIndex,
  totalSequentialMatches,
  onSelectWinner,
  onExitSequentialMode,
  onResetMatch,
}) => {
  const p1 = currentMatch.participant1Id
    ? participants.find(p => p.id === currentMatch.participant1Id) || null
    : null;
  const p2 = currentMatch.participant2Id
    ? participants.find(p => p.id === currentMatch.participant2Id) || null
    : null;

  const [score1, setScore1] = useState<number>(currentMatch.score1 ?? (currentMatch.isFinal ? 3 : 2));
  const [score2, setScore2] = useState<number>(currentMatch.score2 ?? 0);
  const [celebratingWinner, setCelebratingWinner] = useState<Participant | null>(null);

  // Sync scores when match changes
  useEffect(() => {
    setScore1(currentMatch.score1 ?? 2);
    setScore2(currentMatch.score2 ?? 1);
    setCelebratingWinner(null);
  }, [currentMatch.id]);

  const handlePickWinner = (winnerParticipant: Participant | null, isP1: boolean) => {
    if (!winnerParticipant) return;
    playAdvanceSfx();
    setCelebratingWinner(winnerParticipant);

    // Give 700ms for visual celebration then advance
    const finalScore1 = isP1 ? Math.max(score1, score2 + 1) : Math.min(score1, score2 - 1);
    const finalScore2 = isP1 ? Math.min(score2, score1 - 1) : Math.max(score2, score1 + 1);

    setTimeout(() => {
      onSelectWinner(
        currentMatch.id,
        winnerParticipant.id,
        Math.max(0, finalScore1),
        Math.max(0, finalScore2)
      );
      setCelebratingWinner(null);
    }, 650);
  };

  const getRoundLabel = () => {
    if (currentMatch.isFinal) return '🏆 GRAN FINAL DEFINITIVA';
    if (currentMatch.isSemifinal) return '⚡ SEMIFINAL';
    return `⚔️ RONDA ${currentMatch.roundIndex + 1} • CRUCE #${currentMatch.matchIndex + 1}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto z-30 transition-all animate-fadeIn">
      <div className="bg-slate-900/90 backdrop-blur-2xl border-2 border-cyan-500/50 rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col gap-4">
        {/* Top Sequence Status Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
            </span>
            <span className="text-xs font-black text-cyan-400 uppercase tracking-widest font-mono">
              {getRoundLabel()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              Duelo {matchSequenceIndex} de {totalSequentialMatches}
            </span>
            <button
              onClick={() => {
                playClickSfx();
                onExitSequentialMode();
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
              title="Alejar y ver el mapa completo"
            >
              <Map className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ver Mapa Completo</span>
            </button>
          </div>
        </div>

        {/* Versus Matchup Stage */}
        <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-4 py-2">
          {/* Player 1 Card */}
          <div
            onClick={() => p1 && handlePickWinner(p1, true)}
            className={`md:col-span-5 relative group cursor-pointer p-4 rounded-2xl border-2 transition-all duration-300 flex items-center gap-4 ${
              celebratingWinner?.id === p1?.id
                ? 'bg-cyan-500/30 border-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.6)] scale-[1.03]'
                : 'bg-slate-950/70 border-slate-800 hover:border-cyan-400 hover:bg-slate-900/80 hover:shadow-[0_0_25px_rgba(6,182,212,0.25)]'
            }`}
          >
            {p1 ? (
              <>
                <div className="relative shrink-0">
                  <AnimalAvatar animal={p1.animal} size={54} />
                  <span className="absolute -bottom-1 -right-1 bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    #{p1.seed}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-cyan-400 font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                    <span>{p1.animal.emoji} {p1.animal.name}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white truncate group-hover:text-cyan-300 transition-colors">
                    {p1.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Clic para declarar ganador
                  </p>
                </div>

                {/* Direct Action Button */}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handlePickWinner(p1, true);
                  }}
                  className="shrink-0 px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center gap-1"
                >
                  <Crown className="w-3.5 h-3.5 fill-slate-950" />
                  <span className="hidden sm:inline">GANA</span>
                </button>
              </>
            ) : (
              <div className="text-slate-500 italic text-xs py-4 text-center w-full font-mono">
                Por Definir (Ganador de cruce previo)
              </div>
            )}
          </div>

          {/* Versus Center Divider & Score Modifier */}
          <div className="md:col-span-1 flex flex-col items-center justify-center py-2">
            <div className="w-10 h-10 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center shadow-lg">
              <Swords className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <span className="text-[11px] font-black text-slate-400 font-mono tracking-widest mt-1">
              VS
            </span>
          </div>

          {/* Player 2 Card */}
          <div
            onClick={() => p2 && handlePickWinner(p2, false)}
            className={`md:col-span-5 relative group cursor-pointer p-4 rounded-2xl border-2 transition-all duration-300 flex items-center gap-4 ${
              celebratingWinner?.id === p2?.id
                ? 'bg-fuchsia-500/30 border-fuchsia-400 shadow-[0_0_35px_rgba(217,70,239,0.6)] scale-[1.03]'
                : 'bg-slate-950/70 border-slate-800 hover:border-fuchsia-400 hover:bg-slate-900/80 hover:shadow-[0_0_25px_rgba(217,70,239,0.25)]'
            }`}
          >
            {p2 ? (
              <>
                <div className="relative shrink-0">
                  <AnimalAvatar animal={p2.animal} size={54} />
                  <span className="absolute -bottom-1 -right-1 bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    #{p2.seed}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-fuchsia-400 font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                    <span>{p2.animal.emoji} {p2.animal.name}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white truncate group-hover:text-fuchsia-300 transition-colors">
                    {p2.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Clic para declarar ganador
                  </p>
                </div>

                {/* Direct Action Button */}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handlePickWinner(p2, false);
                  }}
                  className="shrink-0 px-3 py-2 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 text-white font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center gap-1"
                >
                  <Crown className="w-3.5 h-3.5 fill-white" />
                  <span className="hidden sm:inline">GANA</span>
                </button>
              </>
            ) : (
              <div className="text-slate-500 italic text-xs py-4 text-center w-full font-mono">
                Por Definir (Ganador de cruce previo)
              </div>
            )}
          </div>
        </div>

        {/* Bottom Banner Status / Prompt */}
        <div className="bg-slate-950/50 rounded-xl px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-spin-slow shrink-0" />
            <span>
              {celebratingWinner ? (
                <strong className="text-yellow-400">
                  ¡{celebratingWinner.name} clasifica a la siguiente ronda! Actualizando llave...
                </strong>
              ) : (
                <span>
                  Esperando selección: Elige quién gana haciendo clic sobre el participante o su botón.
                </span>
              )}
            </span>
          </div>

          <div className="text-[11px] font-mono text-cyan-400">
            La cámara enfocará el siguiente cruce automáticamente al ganar
          </div>
        </div>
      </div>
    </div>
  );
};
