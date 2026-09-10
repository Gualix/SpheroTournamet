import React, { useState, useMemo } from 'react';
import { Tournament, Participant, Race, RaceTopResult } from '../types';
import { AnimalAvatar } from './AnimalAvatar';
import {
  Trophy,
  Flame,
  Clock,
  Zap,
  Sliders,
  Flag,
  RotateCcw,
  CheckCircle2,
  Medal,
  Award,
  Sparkles,
  Play,
  Edit3,
} from 'lucide-react';
import { playClickSfx } from '../utils/audio';

interface RoundRobinViewProps {
  tournament: Tournament;
  onStartRaceTimer: (race: Race) => void;
  onRecordRaceResults: (race: Race) => void;
  onOpenChampionModal: () => void;
  onAddRace?: () => void;
}

export const RoundRobinView: React.FC<RoundRobinViewProps> = ({
  tournament,
  onStartRaceTimer,
  onRecordRaceResults,
  onOpenChampionModal,
}) => {
  const [activeTab, setActiveTab] = useState<'standings' | 'races'>('standings');

  const races = tournament.races || [];
  const completedRacesCount = races.filter(r => r.status === 'completed').length;
  const totalRacesCount = races.length;
  const nextPendingRace = races.find(r => r.status !== 'completed');

  const participantMap = useMemo(() => {
    const map = new Map<string, Participant>();
    tournament.participants.forEach(p => map.set(p.id, p));
    return map;
  }, [tournament.participants]);

  // Compute standings sorted by raceStats totalPoints desc
  const standings = useMemo(() => {
    return [...tournament.participants]
      .map(p => {
        const stats = p.raceStats || {
          totalPoints: p.stats?.pointsScored || 0,
          racesCompleted: 0,
          podiumsCount: 0,
          victoriesCount: 0,
          top5Count: 0,
          racePointsMap: {},
        };
        return {
          participant: p,
          stats,
        };
      })
      .sort((a, b) => {
        if (b.stats.totalPoints !== a.stats.totalPoints) {
          return b.stats.totalPoints - a.stats.totalPoints;
        }
        if (b.stats.victoriesCount !== a.stats.victoriesCount) {
          return b.stats.victoriesCount - a.stats.victoriesCount;
        }
        return b.stats.podiumsCount - a.stats.podiumsCount;
      });
  }, [tournament.participants]);

  const leader = standings[0];
  const secondPlace = standings[1];
  const thirdPlace = standings[2];

  // Helper to format duration
  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (s === 0) return `${m} min`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="w-full bg-slate-900/50 rounded-3xl border border-slate-800/80 backdrop-blur-md shadow-2xl p-4 sm:p-7 space-y-6">
      {/* Top Sphero Grand Prix Header & Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 border border-slate-700/80 p-5 sm:p-6 shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.5)] shrink-0">
              <Flame className="w-8 h-8 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  SPHERO GRAND PRIX
                </span>
                <span className="text-xs font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                  {completedRacesCount} de {totalRacesCount} Carreras Completadas
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Circuito de Carreras & Clasificación por Puntos
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Puntajes proporcionales acumulados según posición y dificultad progresiva.
              </p>
            </div>
          </div>

          {/* Quick Action Button for Next Race */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-end flex-wrap">
            {nextPendingRace ? (
              <button
                onClick={() => {
                  playClickSfx();
                  onStartRaceTimer(nextPendingRace);
                }}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Lanzar Carrera #{nextPendingRace.raceNumber} ({nextPendingRace.difficulty.multiplier}x)</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  playClickSfx();
                  onOpenChampionModal();
                }}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Trophy className="w-4 h-4 fill-slate-950" />
                <span>Ver Podio y Campeón del Grand Prix</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Podium Preview (Top 3) */}
        {leader && leader.stats.totalPoints > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 2nd Place */}
            {secondPlace && (
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-700/60 flex items-center gap-3">
                <div className="relative shrink-0">
                  <AnimalAvatar animal={secondPlace.participant.animal} size={42} />
                  <span className="absolute -top-1.5 -right-1.5 text-lg">🥈</span>
                </div>
                <div className="truncate">
                  <div className="text-[10px] uppercase font-bold text-slate-400">2º Lugar General</div>
                  <div className="text-sm font-black text-white truncate">{secondPlace.participant.name}</div>
                  <div className="text-xs font-mono font-bold text-slate-300">{secondPlace.stats.totalPoints} PTS</div>
                </div>
              </div>
            )}

            {/* 1st Place (Leader) */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/10 border border-amber-500/50 flex items-center gap-3 shadow-lg shadow-amber-500/10">
              <div className="relative shrink-0">
                <AnimalAvatar animal={leader.participant.animal} size={48} isChampion={true} />
                <span className="absolute -top-2 -right-2 text-xl">🥇</span>
              </div>
              <div className="truncate">
                <div className="text-[10px] uppercase font-black text-amber-400 flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> Líder del Grand Prix
                </div>
                <div className="text-base font-black text-white truncate">{leader.participant.name}</div>
                <div className="text-xs font-mono font-black text-amber-300">{leader.stats.totalPoints} PTS</div>
              </div>
            </div>

            {/* 3rd Place */}
            {thirdPlace && (
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-700/60 flex items-center gap-3">
                <div className="relative shrink-0">
                  <AnimalAvatar animal={thirdPlace.participant.animal} size={42} />
                  <span className="absolute -top-1.5 -right-1.5 text-lg">🥉</span>
                </div>
                <div className="truncate">
                  <div className="text-[10px] uppercase font-bold text-amber-600">3º Lugar General</div>
                  <div className="text-sm font-black text-white truncate">{thirdPlace.participant.name}</div>
                  <div className="text-xs font-mono font-bold text-amber-500">{thirdPlace.stats.totalPoints} PTS</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => {
              playClickSfx();
              setActiveTab('standings');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'standings'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Tabla de Clasificación</span>
          </button>
          <button
            onClick={() => {
              playClickSfx();
              setActiveTab('races');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'races'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Parrilla de Carreras ({races.length})</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Dificultad escalonada: Cada carrera otorga multiplicador superior
        </div>
      </div>

      {/* TAB 1: STANDINGS TABLE WITH RACE BREAKDOWN */}
      {activeTab === 'standings' && (
        <div className="bg-slate-950/90 rounded-2xl border border-slate-800/90 shadow-2xl p-4 sm:p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <h3 className="font-black text-base sm:text-lg text-white">
                Clasificación General del Sphero Tournament
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Desglose detallado por carrera y puntos proporcionales
            </span>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-900/90 text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="py-3 px-3 text-center">Pos</th>
                  <th className="py-3 px-4">Piloto</th>
                  {/* Dynamic race columns */}
                  {races.map(race => (
                    <th
                      key={race.id}
                      className="py-3 px-2 text-center text-[11px] font-bold text-cyan-400"
                      title={`${race.title} (${race.difficulty.multiplier}x)`}
                    >
                      C{race.raceNumber}
                      <span className="block text-[9px] text-slate-500 font-normal">
                        x{race.difficulty.multiplier}
                      </span>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center text-slate-400">Podios</th>
                  <th className="py-3 px-3 text-center text-slate-400">Victorias</th>
                  <th className="py-3 px-4 text-center font-black text-amber-400">PUNTOS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {standings.map((item, idx) => {
                  const isTop1 = idx === 0;
                  const isTop3 = idx < 3;

                  return (
                    <tr
                      key={item.participant.id}
                      className={`hover:bg-slate-900/60 transition-colors ${
                        isTop1 && item.stats.totalPoints > 0
                          ? 'bg-amber-500/10 font-semibold text-white'
                          : ''
                      }`}
                    >
                      {/* Pos Badge */}
                      <td className="py-3 px-3 text-center font-mono">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                            idx === 0
                              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/40'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-950 font-bold'
                              : idx === 2
                              ? 'bg-amber-700 text-white font-bold'
                              : 'text-slate-500 bg-slate-900 border border-slate-800'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>

                      {/* Participant Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <AnimalAvatar animal={item.participant.animal} size={32} />
                          <div>
                            <div className="font-bold text-slate-200">{item.participant.name}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                              <span>{item.participant.animal.emoji}</span>
                              <span>{item.participant.animal.name}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Race columns points */}
                      {races.map(race => {
                        const pts = item.stats.racePointsMap[race.raceNumber];
                        const isScored = pts !== undefined && pts > 0;
                        return (
                          <td
                            key={race.id}
                            className="py-3 px-2 text-center font-mono text-xs font-semibold"
                          >
                            {race.status === 'completed' ? (
                              isScored ? (
                                <span className="text-cyan-400 font-bold bg-cyan-950/60 border border-cyan-800/40 px-1.5 py-0.5 rounded">
                                  +{pts}
                                </span>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )
                            ) : (
                              <span className="text-slate-700 text-[10px]">Pend.</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Podiums */}
                      <td className="py-3 px-3 text-center font-mono text-slate-300 font-medium">
                        {item.stats.podiumsCount > 0 ? (
                          <span className="text-amber-400 font-bold">{item.stats.podiumsCount}</span>
                        ) : (
                          '0'
                        )}
                      </td>

                      {/* Victories */}
                      <td className="py-3 px-3 text-center font-mono text-emerald-400 font-bold">
                        {item.stats.victoriesCount > 0 ? (
                          <span className="bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                            {item.stats.victoriesCount} 🥇
                          </span>
                        ) : (
                          '0'
                        )}
                      </td>

                      {/* Total Points */}
                      <td className="py-3 px-4 text-center font-mono font-black text-base text-amber-400">
                        {item.stats.totalPoints} PTS
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: RACES GRID & RUNNER CARDS */}
      {activeTab === 'races' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {races.map((race, index) => {
              const isCompleted = race.status === 'completed';
              const isNext = nextPendingRace?.id === race.id;

              return (
                <div
                  key={race.id}
                  className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                    isCompleted
                      ? 'bg-slate-950/80 border-slate-800'
                      : isNext
                      ? 'bg-gradient-to-b from-cyan-950/30 to-slate-950 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-950/40 border-slate-800/60 opacity-85'
                  }`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          CARRERA #{race.raceNumber}
                        </span>
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                          x{race.difficulty.multiplier} {race.difficulty.name.split(' ')[0]}
                        </span>
                      </div>

                      {isCompleted ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-950/50 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completada
                        </span>
                      ) : isNext ? (
                        <span className="flex items-center gap-1 text-cyan-400 text-xs font-bold bg-cyan-950/50 border border-cyan-800/50 px-2 py-0.5 rounded-full animate-pulse">
                          ⚡ Próxima en Pista
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs font-medium">Por disputar</span>
                      )}
                    </div>

                    <h4 className="text-base font-black text-white">{race.title}</h4>

                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        {formatDuration(race.durationSeconds)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        Multiplicador x{race.difficulty.multiplier}
                      </span>
                    </div>

                    {/* If completed, show Top 5 positions */}
                    {isCompleted && race.top5Results && race.top5Results.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Medal className="w-3 h-3 text-amber-400" /> Resultados del Top 5:
                        </div>
                        {race.top5Results.map(r => {
                          const p = participantMap.get(r.participantId);
                          const medalEmojis = ['🥇', '🥈', '🥉', '🏅', '🎖️'];
                          return (
                            <div
                              key={r.position}
                              className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-slate-900/70 border border-slate-800/50"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span>{medalEmojis[r.position - 1]}</span>
                                <span className="font-bold text-slate-200 truncate">
                                  {p ? p.name : 'Piloto'}
                                </span>
                              </div>
                              <span className="font-mono font-black text-amber-400 shrink-0">
                                +{r.finalPoints} PTS
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="mt-5 pt-3 border-t border-slate-800 flex items-center gap-2">
                    <button
                      onClick={() => {
                        playClickSfx();
                        onStartRaceTimer(race);
                      }}
                      className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isCompleted
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          : 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-md shadow-cyan-500/20'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isCompleted ? 'Volver a Correr Timer' : 'Iniciar Carrera con Timer'}</span>
                    </button>

                    <button
                      onClick={() => {
                        playClickSfx();
                        onRecordRaceResults(race);
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Registrar o editar podio y puntajes"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isCompleted ? 'Editar Podio' : 'Registrar'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
