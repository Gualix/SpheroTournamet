import React, { useState, useMemo, useRef } from 'react';
import { Tournament, TournamentFormat } from '../types';
import { AnimalAvatar } from './AnimalAvatar';
import { getAnimalForParticipant } from '../data/animals';
import {
  PRESET_8_PLAYERS,
  PRESET_16_PLAYERS,
  PRESET_32_PLAYERS,
  parseParticipantInput,
  createTournament,
} from '../utils/tournamentEngine';
import {
  X,
  Shuffle,
  Users,
  Sparkles,
  Play,
  Plus,
  Trash2,
  Edit2,
  Check,
  UserPlus,
  ClipboardList,
} from 'lucide-react';
import { playClickSfx, playAdvanceSfx } from '../utils/audio';

interface ParticipantManagerModalProps {
  currentTournament: Tournament;
  isOpen: boolean;
  onClose: () => void;
  onApplyNewTournament: (newTourney: Tournament) => void;
}

export const ParticipantManagerModal: React.FC<ParticipantManagerModalProps> = ({
  currentTournament,
  isOpen,
  onClose,
  onApplyNewTournament,
}) => {
  const [tournamentTitle, setTournamentTitle] = useState(currentTournament.title);
  const [format, setFormat] = useState<TournamentFormat>(currentTournament.format);

  // Current list of participants as an array
  const [participantsList, setParticipantsList] = useState<string[]>(() =>
    currentTournament.participants.map(p => p.name)
  );

  // Single participant input
  const [newParticipantName, setNewParticipantName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Mode: 'single' | 'bulk'
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [bulkText, setBulkText] = useState(() => currentTournament.participants.map(p => p.name).join('\n'));

  // Editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');

  if (!isOpen) return null;

  const handleAddSingle = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newParticipantName.trim();
    if (!trimmed) return;
    playClickSfx();
    setParticipantsList(prev => [...prev, trimmed]);
    setNewParticipantName('');
    if (inputRef.current) inputRef.current.focus();
  };

  const handleRemove = (idxToRemove: number) => {
    playClickSfx();
    setParticipantsList(prev => prev.filter((_, idx) => idx !== idxToRemove));
    if (editingIndex === idxToRemove) setEditingIndex(null);
  };

  const handleSaveEdit = (idx: number) => {
    playClickSfx();
    const trimmed = editingValue.trim();
    if (trimmed) {
      setParticipantsList(prev => {
        const next = [...prev];
        next[idx] = trimmed;
        return next;
      });
    }
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleApplyBulk = () => {
    playClickSfx();
    const parsed = parseParticipantInput(bulkText);
    if (parsed.length > 0) {
      setParticipantsList(parsed);
      setMode('single');
    }
  };

  const handleLoadPreset = (preset: string[]) => {
    playClickSfx();
    setParticipantsList([...preset]);
  };

  const handleShuffle = () => {
    playClickSfx();
    setParticipantsList(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  const handleClearAll = () => {
    playClickSfx();
    if (window.confirm('¿Vaciar la lista de participantes?')) {
      setParticipantsList([]);
    }
  };

  const handleCreate = () => {
    if (participantsList.length < 2) {
      alert('Debes incluir al menos 2 participantes para generar la llave.');
      return;
    }
    playAdvanceSfx();
    const newTourney = createTournament(tournamentTitle, participantsList, format);
    onApplyNewTournament(newTourney);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/70 border-b border-slate-700/80 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-base text-white">Gestionar Participantes • Sphero Tournament</h3>
            </div>
            <p className="text-[11px] text-cyan-400 font-medium ml-7 mt-0.5">
              Developed for STEM Pillar by Akamai Costa Rica
            </p>
          </div>
          <button
            onClick={() => {
              playClickSfx();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Title & Format Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Nombre del Torneo
              </label>
              <input
                type="text"
                value={tournamentTitle}
                onChange={e => setTournamentTitle(e.target.value)}
                placeholder="Ej. Sphero Tournament 2026"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-sm font-medium transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Sistema de Competencia
              </label>
              <select
                value={format}
                onChange={e => setFormat(e.target.value as TournamentFormat)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white focus:outline-none focus:border-cyan-400 text-sm font-medium transition-colors cursor-pointer"
              >
                <option value="single_elimination">Eliminación Directa (Radial / Árbol)</option>
                <option value="round_robin">Round Robin (Liga todos contra todos)</option>
              </select>
            </div>
          </div>

          {/* Preset Buttons & Shuffle Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-950/50 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 mr-1 uppercase">Presets:</span>
              <button
                type="button"
                onClick={() => handleLoadPreset(PRESET_8_PLAYERS)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
              >
                8 Jugadores
              </button>
              <button
                type="button"
                onClick={() => handleLoadPreset(PRESET_16_PLAYERS)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
              >
                16 Jugadores
              </button>
              <button
                type="button"
                onClick={() => handleLoadPreset(PRESET_32_PLAYERS)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
              >
                32 Jugadores
              </button>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                onClick={handleShuffle}
                disabled={participantsList.length < 2}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Sortear</span>
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={participantsList.length === 0}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-900/30 border border-slate-700 text-slate-400 hover:text-rose-400 text-xs font-medium transition-colors cursor-pointer disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Add Participant Tabs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setMode('single')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    mode === 'single'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Agregar Nombre</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBulkText(participantsList.join('\n'));
                    setMode('bulk');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    mode === 'bulk'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Pegar Lista</span>
                </button>
              </div>

              <span className="text-xs font-mono text-cyan-400">
                {participantsList.length} participantes
              </span>
            </div>

            {mode === 'single' ? (
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newParticipantName}
                  onChange={e => setNewParticipantName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSingle();
                    }
                  }}
                  placeholder="Escribe el nombre del participante y presiona Enter..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-sm font-medium transition-colors"
                />
                <button
                  type="button"
                  onClick={() => handleAddSingle()}
                  disabled={!newParticipantName.trim()}
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  rows={4}
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  placeholder="Ingresa los nombres (uno por línea)..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs font-mono transition-colors resize-none custom-scrollbar"
                />
                <button
                  type="button"
                  onClick={handleApplyBulk}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Aplicar Lista
                </button>
              </div>
            )}
          </div>

          {/* Current Participant List */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Roster Actual ({participantsList.length})
              </h4>
            </div>

            <div className="max-h-48 overflow-y-auto p-2 rounded-xl bg-slate-950/60 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 custom-scrollbar">
              {participantsList.map((name, index) => {
                const animal = getAnimalForParticipant(name, index);
                return (
                  <div
                    key={`p-${index}`}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900/90 border border-slate-800/90 group"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono text-[10px] text-slate-500 w-4 shrink-0">#{index + 1}</span>
                      <AnimalAvatar animal={animal} size={26} />

                      {editingIndex === index ? (
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                          <input
                            type="text"
                            value={editingValue}
                            onChange={e => setEditingValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveEdit(index);
                              if (e.key === 'Escape') setEditingIndex(null);
                            }}
                            autoFocus
                            className="w-full bg-slate-950 border border-cyan-400 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(index)}
                            className="text-emerald-400 hover:text-emerald-300 p-0.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="truncate min-w-0 flex-1">
                          <div
                            className="text-xs font-medium text-slate-200 truncate cursor-pointer hover:text-cyan-300"
                            onClick={() => {
                              setEditingIndex(index);
                              setEditingValue(name);
                            }}
                            title="Clic para editar"
                          >
                            {name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">
                            {animal.emoji} {animal.name}
                          </div>
                        </div>
                      )}
                    </div>

                    {editingIndex !== index && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingIndex(index);
                            setEditingValue(name);
                          }}
                          className="p-1 rounded text-slate-500 hover:text-cyan-400 hover:bg-slate-800"
                          title="Editar"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(index)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                          title="Eliminar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {participantsList.length === 0 && (
                <div className="col-span-2 py-6 text-center text-xs text-slate-500">
                  No hay participantes en la lista. Agrega nombres arriba.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              playClickSfx();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            onClick={handleCreate}
            disabled={participantsList.length < 2}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
              participantsList.length >= 2
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Aplicar y Regenerar Llave</span>
          </button>
        </div>
      </div>
    </div>
  );
};
