import React from 'react';
import { Tournament, Match, Participant } from '../types';
import { AnimalAvatar } from './AnimalAvatar';
import { Trophy, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { playClickSfx } from '../utils/audio';

interface TreeBracketProps {
  tournament: Tournament;
  orientation?: 'horizontal' | 'vertical';
  onSelectMatch: (match: Match) => void;
  onOpenChampionModal: () => void;
}

export const TreeBracket: React.FC<TreeBracketProps> = ({
  tournament,
  orientation = 'horizontal',
  onSelectMatch,
  onOpenChampionModal,
}) => {
  const participantMap = new Map<string, Participant>();
  tournament.participants.forEach(p => participantMap.set(p.id, p));

  const roundsCount = tournament.totalRounds;
  const champion = tournament.championId ? participantMap.get(tournament.championId) : null;

  const roundNames = (rIdx: number) => {
    if (rIdx === roundsCount - 1) return 'Gran Final';
    if (rIdx === roundsCount - 2) return 'Semifinales';
    if (rIdx === roundsCount - 3) return 'Cuartos de Final';
    if (rIdx === roundsCount - 4) return 'Octavos de Final';
    return `Ronda ${rIdx + 1}`;
  };

  return (
    <div className="w-full bg-slate-900/40 rounded-3xl border border-slate-800/50 backdrop-blur-md shadow-2xl p-6 overflow-x-auto min-h-[740px]">
      {/* Champion Banner if finished */}
      {champion && (
        <div
          onClick={onOpenChampionModal}
          className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-500/40 flex items-center justify-between cursor-pointer hover:border-amber-400 transition-colors shadow-lg"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <AnimalAvatar animal={champion.animal} size={50} isChampion={true} />
              <span className="absolute -top-2 -right-2 text-xl">👑</span>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-amber-400 font-bold">¡Torneo Finalizado!</div>
              <div className="text-xl font-black text-white flex items-center gap-2">
                <span>Campeón: {champion.name}</span>
                <span className="text-sm font-normal text-slate-300">({champion.animal.name})</span>
              </div>
            </div>
          </div>
          <button className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md transition-all">
            Ver Coronación
          </button>
        </div>
      )}

      {/* Rounds Columns in Horizontal Mode */}
      <div
        className={`flex ${
          orientation === 'horizontal'
            ? 'flex-row gap-8 items-stretch min-w-max pb-4'
            : 'flex-col gap-8'
        }`}
      >
        {Array.from({ length: roundsCount }).map((_, rIdx) => {
          const matchesInRound = tournament.matches.filter(m => m.roundIndex === rIdx);
          const isFinalRound = rIdx === roundsCount - 1;
          const isSemiRound = rIdx === roundsCount - 2;

          return (
            <div
              key={`round-col-${rIdx}`}
              className={`flex flex-col ${
                orientation === 'horizontal' ? 'w-72 shrink-0' : 'w-full'
              }`}
            >
              {/* Round Header */}
              <div className="mb-4 pb-2 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isFinalRound
                        ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                        : isSemiRound
                        ? 'bg-pink-500 shadow-[0_0_8px_#ec4899]'
                        : 'bg-cyan-400'
                    }`}
                  />
                  <h3 className="font-bold text-sm text-slate-200 tracking-wide uppercase">
                    {roundNames(rIdx)}
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  {matchesInRound.filter(m => m.status === 'completed').length}/{matchesInRound.length}
                </span>
              </div>

              {/* Match Cards List */}
              <div className="flex flex-col justify-around flex-1 gap-6">
                {matchesInRound.map(match => {
                  const p1 = match.participant1Id ? participantMap.get(match.participant1Id) : null;
                  const p2 = match.participant2Id ? participantMap.get(match.participant2Id) : null;
                  const isCompleted = match.status === 'completed';
                  const isP1Winner = isCompleted && match.winnerId === p1?.id;
                  const isP2Winner = isCompleted && match.winnerId === p2?.id;

                  return (
                    <div
                      key={match.id}
                      onClick={() => {
                        playClickSfx();
                        onSelectMatch(match);
                      }}
                      className={`relative rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden p-3 group ${
                        match.isFinal
                          ? 'bg-slate-900/90 border-amber-500/50 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                          : match.isSemifinal
                          ? 'bg-slate-900/80 border-pink-500/40 hover:border-pink-400 hover:shadow-[0_0_20px_rgba(236,72,153,0.2)]'
                          : 'bg-slate-900/70 border-slate-800 hover:border-cyan-500/60 hover:shadow-lg'
                      }`}
                    >
                      {/* Top Match Status & Info Bar */}
                      <div className="flex items-center justify-between mb-2 text-xs">
                        <span className="font-mono text-slate-400 text-[10px]">
                          Cruce #{match.matchIndex + 1} • Al mejor de {match.bestOf}
                        </span>
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Finalizado
                          </span>
                        ) : p1 && p2 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 animate-pulse">
                            <Clock className="w-3 h-3" /> Por jugar
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">Esperando</span>
                        )}
                      </div>

                      {/* Participant 1 Slot */}
                      <div
                        className={`flex items-center justify-between p-2 rounded-lg mb-1.5 transition-colors ${
                          isP1Winner
                            ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 font-bold'
                            : 'bg-slate-950/50 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          {p1 ? (
                            <AnimalAvatar animal={p1.animal} size={28} isWinner={isP1Winner} />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-500 font-mono">
                              ?
                            </div>
                          )}
                          <div className="truncate">
                            <div className="text-xs truncate">{p1 ? p1.name : 'Pendiente...'}</div>
                            {p1 && (
                              <div className="text-[10px] text-slate-400 font-normal">
                                Semilla #{p1.seed} • {p1.animal.speciesName}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-sm px-2 text-right">
                          {match.score1 !== null ? match.score1 : '-'}
                        </div>
                      </div>

                      {/* Participant 2 Slot */}
                      <div
                        className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                          isP2Winner
                            ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 font-bold'
                            : 'bg-slate-950/50 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          {p2 ? (
                            <AnimalAvatar animal={p2.animal} size={28} isWinner={isP2Winner} />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-500 font-mono">
                              ?
                            </div>
                          )}
                          <div className="truncate">
                            <div className="text-xs truncate">{p2 ? p2.name : 'Pendiente...'}</div>
                            {p2 && (
                              <div className="text-[10px] text-slate-400 font-normal">
                                Semilla #{p2.seed} • {p2.animal.speciesName}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-sm px-2 text-right">
                          {match.score2 !== null ? match.score2 : '-'}
                        </div>
                      </div>

                      {/* Hover action prompt */}
                      <div className="mt-2 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-cyan-400 transition-colors">
                        <span>Gestionar resultado</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
