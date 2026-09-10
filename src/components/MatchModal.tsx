import React, { useState, useEffect } from 'react';
import { Match, Participant } from '../types';
import { AnimalAvatar } from './AnimalAvatar';
import { X, Trophy, Swords, CheckCircle2, RotateCcw, Flame, Shield, Sparkles } from 'lucide-react';
import { playClickSfx, playAdvanceSfx } from '../utils/audio';

interface MatchModalProps {
  match: Match | null;
  participants: Participant[];
  isOpen: boolean;
  onClose: () => void;
  onSaveScore: (matchId: string, winnerId: string, score1: number, score2: number) => void;
  onResetMatch: (matchId: string) => void;
}

export const MatchModal: React.FC<MatchModalProps> = ({
  match,
  participants,
  isOpen,
  onClose,
  onSaveScore,
  onResetMatch,
}) => {
  if (!isOpen || !match) return null;

  const p1 = match.participant1Id
    ? participants.find(p => p.id === match.participant1Id) || null
    : null;
  const p2 = match.participant2Id
    ? participants.find(p => p.id === match.participant2Id) || null
    : null;

  const [score1, setScore1] = useState<number>(match.score1 ?? 0);
  const [score2, setScore2] = useState<number>(match.score2 ?? 0);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(match.winnerId);

  useEffect(() => {
    setScore1(match.score1 ?? 0);
    setScore2(match.score2 ?? 0);
    setSelectedWinnerId(match.winnerId);
  }, [match]);

  const handleScoreChange = (player: 1 | 2, delta: number) => {
    playClickSfx();
    if (player === 1) {
      const next = Math.max(0, score1 + delta);
      setScore1(next);
      if (next > score2 && p1) setSelectedWinnerId(p1.id);
      else if (score2 > next && p2) setSelectedWinnerId(p2.id);
    } else {
      const next = Math.max(0, score2 + delta);
      setScore2(next);
      if (next > score1 && p2) setSelectedWinnerId(p2.id);
      else if (score1 > next && p1) setSelectedWinnerId(p1.id);
    }
  };

  const handleSelectWinnerDirectly = (participantId: string) => {
    playClickSfx();
    setSelectedWinnerId(participantId);
    if (participantId === p1?.id && score1 <= score2) {
      setScore1(2);
      setScore2(0);
    } else if (participantId === p2?.id && score2 <= score1) {
      setScore2(2);
      setScore1(0);
    }
  };

  const handleConfirm = () => {
    if (!selectedWinnerId) return;
    playAdvanceSfx();
    onSaveScore(match.id, selectedWinnerId, score1, score2);
    onClose();
  };

  const handleReset = () => {
    playClickSfx();
    onResetMatch(match.id);
    onClose();
  };

  const canPlay = Boolean(p1 && p2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            match.isFinal
              ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-500/40'
              : match.isSemifinal
              ? 'bg-gradient-to-r from-pink-500/20 to-cyan-500/20 border-pink-500/40'
              : 'bg-slate-800/60 border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {match.isFinal ? (
              <Trophy className="w-5 h-5 text-amber-400 animate-bounce" />
            ) : match.isSemifinal ? (
              <Sparkles className="w-5 h-5 text-pink-400 animate-pulse" />
            ) : (
              <Swords className="w-5 h-5 text-cyan-400" />
            )}
            <h3 className="font-bold text-base text-white">
              {match.isFinal
                ? '⭐ Gran Final - Por la Corona'
                : match.isSemifinal
                ? '⚡ Semifinal Electrizante'
                : `Ronda ${match.roundIndex + 1} - Cruce #${match.matchIndex + 1}`}
            </h3>
          </div>
          <button
            onClick={() => {
              playClickSfx();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {!canPlay ? (
            <div className="text-center py-8 text-slate-400">
              <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="font-medium text-slate-300">Esperando que se definan los clasificados</p>
              <p className="text-xs text-slate-500 mt-1">
                Los participantes de rondas anteriores deben ganar sus partidos para avanzar a este cruce.
              </p>
            </div>
          ) : (
            <>
              {/* Contestants Versus Arena */}
              <div className="grid grid-cols-2 gap-4 items-center">
                {/* Player 1 Card */}
                <div
                  onClick={() => p1 && handleSelectWinnerDirectly(p1.id)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center text-center relative ${
                    selectedWinnerId === p1?.id
                      ? 'bg-emerald-950/40 border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.3)]'
                      : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-500'
                  }`}
                >
                  {selectedWinnerId === p1?.id && (
                    <span className="absolute -top-2.5 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                      Ganador
                    </span>
                  )}
                  {p1 && <AnimalAvatar animal={p1.animal} size={64} isWinner={selectedWinnerId === p1.id} />}
                  <div className="mt-2 font-bold text-sm text-white truncate max-w-full">
                    {p1?.name}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Semilla #{p1?.seed} • {p1?.animal.speciesName}
                  </div>

                  {/* Score Stepper */}
                  <div className="mt-4 flex items-center gap-2 bg-slate-900/90 rounded-lg p-1 border border-slate-700" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleScoreChange(1, -1)}
                      className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition-colors"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-mono font-black text-lg text-white">
                      {score1}
                    </span>
                    <button
                      onClick={() => handleScoreChange(1, 1)}
                      className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Player 2 Card */}
                <div
                  onClick={() => p2 && handleSelectWinnerDirectly(p2.id)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center text-center relative ${
                    selectedWinnerId === p2?.id
                      ? 'bg-emerald-950/40 border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.3)]'
                      : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-500'
                  }`}
                >
                  {selectedWinnerId === p2?.id && (
                    <span className="absolute -top-2.5 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                      Ganador
                    </span>
                  )}
                  {p2 && <AnimalAvatar animal={p2.animal} size={64} isWinner={selectedWinnerId === p2.id} />}
                  <div className="mt-2 font-bold text-sm text-white truncate max-w-full">
                    {p2?.name}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Semilla #{p2?.seed} • {p2?.animal.speciesName}
                  </div>

                  {/* Score Stepper */}
                  <div className="mt-4 flex items-center gap-2 bg-slate-900/90 rounded-lg p-1 border border-slate-700" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleScoreChange(2, -1)}
                      className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition-colors"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-mono font-black text-lg text-white">
                      {score2}
                    </span>
                    <button
                      onClick={() => handleScoreChange(2, 1)}
                      className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Score Presets */}
              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="text-xs text-slate-400 mr-1">Marcador rápido:</span>
                {[
                  { label: '2 - 0', s1: 2, s2: 0, win: p1?.id },
                  { label: '2 - 1', s1: 2, s2: 1, win: p1?.id },
                  { label: '1 - 2', s1: 1, s2: 2, win: p2?.id },
                  { label: '0 - 2', s1: 0, s2: 2, win: p2?.id },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      playClickSfx();
                      setScore1(preset.s1);
                      setScore2(preset.s2);
                      if (preset.win) setSelectedWinnerId(preset.win);
                    }}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono border border-slate-700 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <div>
            {match.status === 'completed' && (
              <button
                onClick={handleReset}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 flex items-center gap-1.5 transition-colors border border-rose-900/40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reiniciar Cruce
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playClickSfx();
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            {canPlay && (
              <button
                disabled={!selectedWinnerId}
                onClick={handleConfirm}
                className={`px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg transition-all ${
                  selectedWinnerId
                    ? match.isFinal
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black shadow-amber-500/20'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {match.isFinal ? '¡Coronar Campeón!' : 'Avanzar Ganador'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
