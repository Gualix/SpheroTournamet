import React, { useState, useMemo } from 'react';
import {
  Race,
  Participant,
  PointDistributionScheme,
  RaceDifficulty,
  DifficultyLevel,
} from '../types';
import { AnimalAvatar } from './AnimalAvatar';
import { POINT_SCHEMES, DIFFICULTY_PRESETS } from '../utils/tournamentEngine';
import {
  Trophy,
  Award,
  Sparkles,
  Sliders,
  CheckCircle2,
  X,
  Shuffle,
  Shield,
  Zap,
} from 'lucide-react';
import { playClickSfx, playChampionFanfare } from '../utils/audio';

interface RaceResultsModalProps {
  race: Race;
  participants: Participant[];
  onClose: () => void;
  onSaveResults: (
    raceId: string,
    top5ParticipantIds: string[],
    pointScheme: PointDistributionScheme,
    difficulty: RaceDifficulty,
    customBasePoints?: [number, number, number, number, number]
  ) => void;
}

const POSITION_MEDALS = [
  { pos: 1, label: '1º Lugar', emoji: '🥇', color: 'border-amber-400/80 bg-amber-500/15 text-amber-300' },
  { pos: 2, label: '2º Lugar', emoji: '🥈', color: 'border-slate-300/80 bg-slate-300/15 text-slate-200' },
  { pos: 3, label: '3º Lugar', emoji: '🥉', color: 'border-amber-700/80 bg-amber-700/15 text-amber-500' },
  { pos: 4, label: '4º Lugar', emoji: '🏅', color: 'border-cyan-500/80 bg-cyan-500/15 text-cyan-300' },
  { pos: 5, label: '5º Lugar', emoji: '🎖️', color: 'border-purple-500/80 bg-purple-500/15 text-purple-300' },
];

export const RaceResultsModal: React.FC<RaceResultsModalProps> = ({
  race,
  participants,
  onClose,
  onSaveResults,
}) => {
  // Pre-fill with existing results if any
  const initialTop5 = useMemo(() => {
    if (race.top5Results && race.top5Results.length > 0) {
      return race.top5Results.map(r => r.participantId);
    }
    return ['', '', '', '', ''];
  }, [race.top5Results]);

  const [top5Ids, setTop5Ids] = useState<string[]>(initialTop5);
  const [pointScheme, setPointScheme] = useState<PointDistributionScheme>(race.pointScheme || 'f1');
  const [multiplier, setMultiplier] = useState<number>(race.difficulty.multiplier);
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>(race.difficulty.level);
  const [difficultyName, setDifficultyName] = useState<string>(race.difficulty.name);

  // Custom base points
  const [customPoints, setCustomPoints] = useState<[number, number, number, number, number]>(
    race.customBasePoints || [...POINT_SCHEMES.f1.basePoints]
  );

  const participantMap = useMemo(() => {
    const map = new Map<string, Participant>();
    participants.forEach(p => map.set(p.id, p));
    return map;
  }, [participants]);

  // Handle position select
  const handleSelectParticipant = (positionIndex: number, participantId: string) => {
    playClickSfx();
    setTop5Ids(prev => {
      const next = [...prev];
      next[positionIndex] = participantId;
      return next;
    });
  };

  // Quick randomize / demo fill
  const handleRandomFill = () => {
    playClickSfx();
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const newTop5 = shuffled.slice(0, 5).map(p => p.id);
    while (newTop5.length < 5) newTop5.push('');
    setTop5Ids(newTop5);
  };

  // Handle scheme change
  const handleSchemeChange = (schemeId: PointDistributionScheme) => {
    playClickSfx();
    setPointScheme(schemeId);
    if (schemeId !== 'custom') {
      setCustomPoints([...POINT_SCHEMES[schemeId].basePoints]);
    }
  };

  // Handle difficulty preset select
  const handleDifficultyPreset = (preset: typeof DIFFICULTY_PRESETS[0]) => {
    playClickSfx();
    setDifficultyLevel(preset.level);
    setMultiplier(preset.multiplier);
    setDifficultyName(preset.name);
  };

  // Active base points
  const activeBasePoints = pointScheme === 'custom' ? customPoints : POINT_SCHEMES[pointScheme].basePoints;

  // Calculate final proportional points for preview
  const previewAllocations = useMemo(() => {
    return [0, 1, 2, 3, 4].map(idx => {
      const pId = top5Ids[idx];
      const participant = pId ? participantMap.get(pId) : null;
      const basePoint = activeBasePoints[idx] ?? 0;
      const finalPoint = Math.round(basePoint * multiplier);
      return {
        pos: idx + 1,
        participant,
        basePoint,
        finalPoint,
      };
    });
  }, [top5Ids, participantMap, activeBasePoints, multiplier]);

  const isValidToSave = top5Ids.some(id => id !== '');

  const handleSave = () => {
    if (!isValidToSave) return;
    playChampionFanfare();
    const cleanTop5 = top5Ids.filter(id => id.trim().length > 0);
    const currentDifficulty: RaceDifficulty = {
      level: difficultyLevel,
      name: difficultyName || `Nivel (x${multiplier})`,
      multiplier,
    };

    onSaveResults(
      race.id,
      cleanTop5,
      pointScheme,
      currentDifficulty,
      pointScheme === 'custom' ? customPoints : undefined
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Glow Accent Top Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-cyan-400 to-blue-500" />

        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wide">
                  Carrera #{race.raceNumber} • Registro de Podio
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                  {multiplier}x Dificultad
                </span>
              </div>
              <h2 className="text-lg font-black text-white">{race.title}</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* STEP 1: SELECT TOP 5 PARTICIPANTS */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  1. Posiciones de los Primeros 5 Jugadores en Cruzar la Meta
                </h3>
              </div>
              <button
                type="button"
                onClick={handleRandomFill}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 bg-cyan-950/40 border border-cyan-800/60 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                title="Completar aleatoriamente para demostración rápida"
              >
                <Shuffle className="w-3 h-3" />
                <span>Auto-Completar Demo</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {POSITION_MEDALS.map((badge, idx) => {
                const selectedId = top5Ids[idx] || '';
                const selectedParticipant = selectedId ? participantMap.get(selectedId) : null;

                // Disable already picked options in other slots
                const otherSelectedIds = top5Ids.filter((id, i) => i !== idx && id !== '');

                return (
                  <div
                    key={badge.pos}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${badge.color}`}
                  >
                    <div className="flex items-center gap-2 w-28 shrink-0 font-bold text-xs">
                      <span className="text-lg">{badge.emoji}</span>
                      <span>{badge.label}</span>
                    </div>

                    <div className="flex-1 relative">
                      <select
                        value={selectedId}
                        onChange={e => handleSelectParticipant(idx, e.target.value)}
                        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-cyan-400 cursor-pointer"
                      >
                        <option value="">-- Seleccionar piloto que cruzó en {badge.label} --</option>
                        {participants.map(p => {
                          const isAlreadySelected = otherSelectedIds.includes(p.id);
                          return (
                            <option
                              key={p.id}
                              value={p.id}
                              disabled={isAlreadySelected}
                              className="bg-slate-900 text-white"
                            >
                              {isAlreadySelected ? `✓ ${p.name} (Ya asignado)` : `${p.name} (#${p.seed})`}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {selectedParticipant && (
                      <div className="shrink-0">
                        <AnimalAvatar animal={selectedParticipant.animal} size={28} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 2: CONSULTAR / DEFINIR DIFICULTAD DE LA CARRERA */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  2. Dificultad de la Carrera (Multiplicador Progresivo de Puntos)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-cyan-400 font-bold bg-cyan-950/50 border border-cyan-800/50 px-2.5 py-0.5 rounded-full">
                Multiplicador Actual: x{multiplier}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Cada carrera da más puntos que la anterior. Puedes elegir o ajustar el nivel de dificultad para esta pista:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {DIFFICULTY_PRESETS.map(preset => {
                const isSelected = multiplier === preset.multiplier;
                return (
                  <button
                    key={preset.level}
                    type="button"
                    onClick={() => handleDifficultyPreset(preset)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                      x{preset.multiplier} Puntos
                    </div>
                    <div className="text-xs font-black text-slate-200 mt-0.5">{preset.name.split(' ')[0]}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 3: OPCIONES PARA DISTRIBUIR PUNTAJE PROPORCIONAL */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                3. Opciones para Distribuir Puntaje (Reparto Proporcional al Top 5)
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Selecciona el sistema de reparto para que cada uno de los 5 jugadores obtenga puntos proporcionales a su posición:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(Object.keys(POINT_SCHEMES) as PointDistributionScheme[]).map(schemeId => {
                const item = POINT_SCHEMES[schemeId];
                const isSelected = pointScheme === schemeId;

                return (
                  <button
                    key={schemeId}
                    type="button"
                    onClick={() => handleSchemeChange(schemeId)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">{item.name}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug">{item.description}</p>
                    {schemeId !== 'custom' && (
                      <div className="flex items-center gap-1 mt-2 font-mono text-[10px] text-amber-300 font-bold">
                        <span>Puntos Base:</span>
                        <span>{item.basePoints.join(' • ')}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom base inputs if custom scheme */}
            {pointScheme === 'custom' && (
              <div className="mt-3 p-3 bg-slate-900/90 rounded-xl border border-amber-500/40">
                <div className="text-[11px] font-bold text-amber-400 mb-2">
                  Configura los puntos base para cada una de las 5 posiciones:
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[0, 1, 2, 3, 4].map(idx => (
                    <div key={idx}>
                      <label className="block text-[10px] text-slate-400 mb-1 font-bold">
                        {idx + 1}º Lugar
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={customPoints[idx]}
                        onChange={e => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          setCustomPoints(prev => {
                            const next = [...prev] as [number, number, number, number, number];
                            next[idx] = val;
                            return next;
                          });
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-center text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* STEP 4: RESULTING POINTS PREVIEW TABLE */}
          <div className="bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  4. Puntos Otorgados Resultantes (Base × Dificultad {multiplier}x)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                Fórmula: Base × Multiplicador ({multiplier})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {previewAllocations.map(alloc => (
                <div
                  key={alloc.pos}
                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center text-center justify-between"
                >
                  <div className="text-xs font-black font-mono text-slate-400 mb-1">
                    {POSITION_MEDALS[alloc.pos - 1].emoji} Pos {alloc.pos}
                  </div>
                  {alloc.participant ? (
                    <div className="flex flex-col items-center my-1 truncate w-full">
                      <AnimalAvatar animal={alloc.participant.animal} size={28} />
                      <span className="text-xs font-bold text-slate-200 truncate max-w-[100px] mt-1">
                        {alloc.participant.name}
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 italic my-2">Por asignar</div>
                  )}

                  <div className="mt-1 pt-1 border-t border-slate-800 w-full">
                    <div className="text-[10px] text-slate-500 font-mono">
                      {alloc.basePoint} × {multiplier}x
                    </div>
                    <div className="text-sm font-black font-mono text-amber-400">
                      +{alloc.finalPoint} PTS
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400">
            {isValidToSave ? (
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Listo para guardar y actualizar la tabla
              </span>
            ) : (
              <span>Selecciona al menos el 1º lugar para poder guardar.</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isValidToSave}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 fill-slate-950" />
              <span>Guardar Resultados y Asignar Puntos</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
