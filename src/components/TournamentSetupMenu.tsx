import React, { useState, useMemo, useRef } from 'react';
import { TournamentFormat, RaceTournamentConfig, PointDistributionScheme } from '../types';
import {
  PRESET_8_PLAYERS,
  PRESET_16_PLAYERS,
  PRESET_32_PLAYERS,
  getAnimalForParticipant,
  parseParticipantInput,
  POINT_SCHEMES,
} from '../utils/tournamentEngine';
import { AnimalAvatar } from './AnimalAvatar';
import {
  Swords,
  Users,
  Shuffle,
  Play,
  Trophy,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Maximize,
  Plus,
  Trash2,
  Edit2,
  X,
  ClipboardList,
  UserPlus,
  RotateCcw,
  Check,
  Flame,
  Clock,
  Zap,
  Sliders,
} from 'lucide-react';
import { playClickSfx, playAdvanceSfx } from '../utils/audio';

interface TournamentSetupMenuProps {
  initialTitle: string;
  initialNames: string[];
  initialFormat: TournamentFormat;
  hasExistingProgress?: boolean;
  onResumeTournament?: () => void;
  onClearSavedData?: () => void;
  onStartTournament: (
    title: string,
    names: string[],
    format: TournamentFormat,
    launchFullscreen: boolean,
    raceConfig?: RaceTournamentConfig
  ) => void;
}

export const TournamentSetupMenu: React.FC<TournamentSetupMenuProps> = ({
  initialTitle,
  initialNames,
  initialFormat,
  hasExistingProgress = false,
  onResumeTournament,
  onClearSavedData,
  onStartTournament,
}) => {
  const [title, setTitle] = useState<string>(initialTitle || 'Sphero Tournament');
  const [format, setFormat] = useState<TournamentFormat>(initialFormat || 'single_elimination');

  // Race-specific configuration for Round Robin
  const [totalRaces, setTotalRaces] = useState<number>(4);
  const [raceDurationSeconds, setRaceDurationSeconds] = useState<number>(120);
  const [difficultyProgression, setDifficultyProgression] = useState<'standard' | 'accelerated' | 'epic_final'>('standard');
  const [defaultPointScheme, setDefaultPointScheme] = useState<PointDistributionScheme>('f1');

  // Participants list managed directly as an array
  const [participantsList, setParticipantsList] = useState<string[]>(() =>
    initialNames && initialNames.length >= 2 ? initialNames : [...PRESET_8_PLAYERS]
  );

  // New participant input
  const [newParticipantName, setNewParticipantName] = useState<string>('');
  const newNameInputRef = useRef<HTMLInputElement>(null);

  // Input tab mode: 'single' (one-by-one addition) | 'bulk' (paste lines) | 'presets'
  const [addMode, setAddMode] = useState<'single' | 'bulk' | 'presets'>('single');
  const [bulkText, setBulkText] = useState<string>('');

  // Editing a specific participant inline
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  // Fullscreen option
  const [autoFullscreen, setAutoFullscreen] = useState<boolean>(true);

  // Preview participant objects with animal avatars
  const previewParticipants = useMemo(() => {
    return participantsList.map((name, idx) => ({
      name,
      seed: idx + 1,
      animal: getAnimalForParticipant(name, idx),
    }));
  }, [participantsList]);

  // Handler to add a single participant
  const handleAddParticipant = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newParticipantName.trim();
    if (!trimmed) return;

    playClickSfx();
    setParticipantsList(prev => [...prev, trimmed]);
    setNewParticipantName('');
    if (newNameInputRef.current) {
      newNameInputRef.current.focus();
    }
  };

  // Handler to remove a participant
  const handleRemoveParticipant = (indexToRemove: number) => {
    playClickSfx();
    setParticipantsList(prev => prev.filter((_, idx) => idx !== indexToRemove));
    if (editingIndex === indexToRemove) {
      setEditingIndex(null);
    }
  };

  // Handler to start inline edit
  const handleStartEdit = (index: number, currentName: string) => {
    playClickSfx();
    setEditingIndex(index);
    setEditingValue(currentName);
  };

  // Handler to save inline edit
  const handleSaveEdit = (index: number) => {
    playClickSfx();
    const trimmed = editingValue.trim();
    if (trimmed) {
      setParticipantsList(prev => {
        const next = [...prev];
        next[index] = trimmed;
        return next;
      });
    }
    setEditingIndex(null);
    setEditingValue('');
  };

  // Handler to apply bulk pasted text
  const handleApplyBulkText = () => {
    playClickSfx();
    const parsed = parseParticipantInput(bulkText);
    if (parsed.length > 0) {
      setParticipantsList(parsed);
      setBulkText('');
      setAddMode('single');
    }
  };

  // Handler to append bulk pasted text to existing
  const handleAppendBulkText = () => {
    playClickSfx();
    const parsed = parseParticipantInput(bulkText);
    if (parsed.length > 0) {
      setParticipantsList(prev => [...prev, ...parsed]);
      setBulkText('');
      setAddMode('single');
    }
  };

  // Handler to load presets
  const handleLoadPreset = (preset: string[]) => {
    playClickSfx();
    setParticipantsList([...preset]);
  };

  // Shuffle participant order
  const handleShuffle = () => {
    playClickSfx();
    setParticipantsList(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  // Clear all participants
  const handleClearAll = () => {
    playClickSfx();
    if (window.confirm('¿Deseas vaciar toda la lista de participantes?')) {
      setParticipantsList([]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (participantsList.length < 2) {
      alert('Debes agregar al menos 2 participantes para generar el torneo.');
      return;
    }
    playAdvanceSfx();

    const raceConfig: RaceTournamentConfig | undefined =
      format === 'round_robin'
        ? {
            totalRaces,
            raceDurationSeconds,
            difficultyProgression,
            defaultPointScheme,
          }
        : undefined;

    onStartTournament(
      title.trim() || 'Sphero Tournament',
      participantsList,
      format,
      autoFullscreen,
      raceConfig
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto my-auto p-4 sm:p-6 flex flex-col items-center justify-center animate-fadeIn">
      {/* Brand & Setup Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <Sparkles className="w-3.5 h-3.5 animate-spin-slow" />
          <span>Developed for STEM Pillar by Akamai Costa Rica</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md">
          SPHERO <span className="text-cyan-400">TOURNAMENT</span>
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto mt-2">
          Configuración oficial del torneo para la iniciativa STEM. Registra los participantes y genera la llave interactiva.
        </p>
      </div>

      {/* Main Configuration Card */}
      <form
        onSubmit={handleSubmit}
        className="w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-7"
      >
        {/* Saved Tournament Resumption Notice */}
        {hasExistingProgress && onResumeTournament && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/70 via-slate-900 to-blue-950/70 border border-cyan-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-cyan-950/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="text-sm font-black text-white flex items-center gap-2">
                  <span>Tienes un torneo guardado en curso</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold uppercase">
                    Guardado local
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Tus duelos, carreras y resultados están guardados en tu navegador. Puedes continuar directamente.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={onResumeTournament}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md hover:shadow-cyan-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Continuar Torneo</span>
              </button>
              {onClearSavedData && (
                <button
                  type="button"
                  onClick={onClearSavedData}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
                  title="Descartar torneo guardado"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 1: Tournament Title */}
        <div>
          <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-cyan-400" />
            <span>1. Nombre del Torneo / Evento</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-slate-950/70 border border-slate-700/80 rounded-2xl px-4 py-3.5 text-white font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 transition-all placeholder-slate-500 shadow-inner text-sm"
            placeholder="Ej: Sphero Tournament 2026"
            required
          />
        </div>

        {/* Step 2: Format Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Swords className="w-4 h-4 text-cyan-400" />
            <span>2. Formato de Competición</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                playClickSfx();
                setFormat('single_elimination');
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                format === 'single_elimination'
                  ? 'bg-cyan-500/15 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-white uppercase">Eliminación Directa</span>
                {format === 'single_elimination' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Llave radial o árbol por rondas sucesivas hasta proclamar un Campeón.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSfx();
                setFormat('round_robin');
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                format === 'round_robin'
                  ? 'bg-amber-500/15 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-white uppercase">Round Robin (Por Carreras & Puntos)</span>
                {format === 'round_robin' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Circuito de carreras con temporizador, posiciones de Top 5 y puntos proporcionales por dificultad.
              </p>
            </button>
          </div>
        </div>

        {/* SPECIAL SUB-CONFIG FOR RACE-BASED ROUND ROBIN */}
        {format === 'round_robin' && (
          <div className="bg-slate-950/75 border border-amber-500/40 rounded-2xl p-5 space-y-5 animate-fadeIn">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                Configuración del Circuito de Carreras Sphero (Round Robin)
              </span>
            </div>

            {/* Sub-Question 1: Total Races */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-cyan-400" />
                  <span>¿Cuántas carreras son en el circuito?</span>
                </label>
                <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                  {totalRaces} Carreras
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[2, 3, 4, 5, 6, 8].map(count => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => {
                      playClickSfx();
                      setTotalRaces(count);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                      totalRaces === count
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                        : 'bg-slate-900 border border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    {count} carreras
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-Question 2: Time per Race */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>¿Qué tiempo se asigna a cada carrera? (Temporizador)</span>
                </label>
                <span className="text-xs font-mono font-black text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                  {Math.floor(raceDurationSeconds / 60)}m {raceDurationSeconds % 60 ? `${raceDurationSeconds % 60}s` : ''} ({raceDurationSeconds}s)
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { sec: 60, label: '1 min' },
                  { sec: 90, label: '1:30 min' },
                  { sec: 120, label: '2 min (Recomendado)' },
                  { sec: 180, label: '3 min' },
                  { sec: 240, label: '4 min' },
                  { sec: 300, label: '5 min' },
                ].map(opt => (
                  <button
                    key={opt.sec}
                    type="button"
                    onClick={() => {
                      playClickSfx();
                      setRaceDurationSeconds(opt.sec);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      raceDurationSeconds === opt.sec
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                        : 'bg-slate-900 border border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-Question 3: Difficulty Progression */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Dificultad de la carrera (cada una da más puntos que la anterior):</span>
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    id: 'standard' as const,
                    title: 'Progresión Estándar',
                    badge: '+25% por carrera',
                    desc: 'x1.0 → x1.25 → x1.50 → x1.75 → x2.0...',
                  },
                  {
                    id: 'accelerated' as const,
                    title: 'Progresión Acelerada',
                    badge: '+50% por carrera',
                    desc: 'x1.0 → x1.50 → x2.00 → x2.50 → x3.0...',
                  },
                  {
                    id: 'epic_final' as const,
                    title: 'Gran Final Épica',
                    badge: 'Puntaje Triple en Final',
                    desc: 'x1.0 → x1.25 → x1.50 → x2.00 → x3.00',
                  },
                ].map(item => {
                  const isSelected = difficultyProgression === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        playClickSfx();
                        setDifficultyProgression(item.id);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400 text-white shadow-md shadow-amber-500/20'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">{item.title}</span>
                        <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-slate-400">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sub-Question 4: Default Point Distribution Scheme for Top 5 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Esquema inicial para repartir puntos al Top 5:</span>
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {(['f1', 'proportional', 'exponential', 'stem_linear'] as PointDistributionScheme[]).map(schemeId => {
                  const scheme = POINT_SCHEMES[schemeId];
                  const isSelected = defaultPointScheme === schemeId;
                  return (
                    <button
                      key={schemeId}
                      type="button"
                      onClick={() => {
                        playClickSfx();
                        setDefaultPointScheme(schemeId);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-md shadow-cyan-500/20'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-200 mb-0.5">{scheme.name.split(' ')[0]}</div>
                      <div className="text-[10px] font-mono text-cyan-300 font-bold">
                        {scheme.basePoints.join('-')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: PARTICIPANTS MANAGEMENT SECTION */}
        <div className="bg-slate-950/50 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                3. Participantes ({participantsList.length})
              </span>
              <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-2 py-0.5 rounded-full font-mono">
                {participantsList.length < 2
                  ? 'Mínimo 2 requeridos'
                  : `${participantsList.length} listos`}
              </span>
            </div>

            {/* Quick Actions: Shuffle & Clear */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShuffle}
                disabled={participantsList.length < 2}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 flex items-center gap-1.5 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Sortear / Mezclar el orden de cabezas de serie"
              >
                <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
                <span>Sortear Semillas</span>
              </button>

              <button
                type="button"
                onClick={handleClearAll}
                disabled={participantsList.length === 0}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-rose-900/30 text-slate-400 hover:text-rose-400 flex items-center gap-1.5 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Borrar todos los participantes"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpiar</span>
              </button>
            </div>
          </div>

          {/* Subtabs for adding participants */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800 w-fit">
            <button
              type="button"
              onClick={() => {
                playClickSfx();
                setAddMode('single');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                addMode === 'single'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Agregar Uno a Uno</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSfx();
                setAddMode('bulk');
                setBulkText(participantsList.join('\n'));
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                addMode === 'bulk'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Pegar Lista en Bloque</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSfx();
                setAddMode('presets');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                addMode === 'presets'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Presets de Prueba</span>
            </button>
          </div>

          {/* TAB 1: ADD SINGLE PARTICIPANT INPUT */}
          {addMode === 'single' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    ref={newNameInputRef}
                    type="text"
                    value={newParticipantName}
                    onChange={e => setNewParticipantName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddParticipant();
                      }
                    }}
                    placeholder="Escribe el nombre del jugador o equipo y presiona Enter..."
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 transition-all font-medium"
                  />
                  {newParticipantName && (
                    <button
                      type="button"
                      onClick={() => setNewParticipantName('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleAddParticipant()}
                  disabled={!newParticipantName.trim()}
                  className="px-4 sm:px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0 shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>
                  Consejo: Escribe el nombre y presiona <strong className="text-slate-300">Enter</strong> para agregar múltiples participantes rápidamente.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: BULK LIST TEXTAREA */}
          {addMode === 'bulk' && (
            <div className="space-y-3 animate-fadeIn">
              <label className="block text-xs font-medium text-slate-400">
                Pega aquí una lista de competidores (un nombre por renglón o separados por coma):
              </label>
              <textarea
                rows={4}
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                placeholder="Alex Silva&#10;Elena Chen&#10;Carlos Morales&#10;Sofia Rossi..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none h-28 custom-scrollbar placeholder-slate-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleApplyBulkText}
                  disabled={!bulkText.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Reemplazar Lista Completa
                </button>
                <button
                  type="button"
                  onClick={handleAppendBulkText}
                  disabled={!bulkText.trim()}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Añadir al Final
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: QUICK PRESET SIZES */}
          {addMode === 'presets' && (
            <div className="space-y-3 animate-fadeIn">
              <p className="text-xs text-slate-400">
                Carga un grupo predeterminado con avatares temáticos para probar el sistema:
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleLoadPreset(PRESET_8_PLAYERS)}
                  className="py-3 px-3 rounded-xl border bg-slate-900/80 hover:bg-cyan-500/10 border-slate-700 hover:border-cyan-500/50 text-slate-200 text-center font-bold text-xs transition-all cursor-pointer"
                >
                  <div className="text-cyan-400 font-black text-sm mb-0.5">8 Jugadores</div>
                  <div className="text-[10px] text-slate-400 font-normal">Cuartos a Gran Final</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleLoadPreset(PRESET_16_PLAYERS)}
                  className="py-3 px-3 rounded-xl border bg-slate-900/80 hover:bg-cyan-500/10 border-slate-700 hover:border-cyan-500/50 text-slate-200 text-center font-bold text-xs transition-all cursor-pointer"
                >
                  <div className="text-cyan-400 font-black text-sm mb-0.5">16 Jugadores</div>
                  <div className="text-[10px] text-slate-400 font-normal">Octavos a Gran Final</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleLoadPreset(PRESET_32_PLAYERS)}
                  className="py-3 px-3 rounded-xl border bg-slate-900/80 hover:bg-cyan-500/10 border-slate-700 hover:border-cyan-500/50 text-slate-200 text-center font-bold text-xs transition-all cursor-pointer"
                >
                  <div className="text-cyan-400 font-black text-sm mb-0.5">32 Jugadores</div>
                  <div className="text-[10px] text-slate-400 font-normal">Cuadro Master Completo</div>
                </button>
              </div>
            </div>
          )}

          {/* INTERACTIVE PARTICIPANT ROSTER LIST / CHIPS */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Participantes Registrados ({previewParticipants.length})
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">
                Avatares Animal Flat Asignados Automáticamente
              </span>
            </div>

            {previewParticipants.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center">
                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">Aún no has agregado ningún participante.</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Usa el campo superior para escribir nombres o elige un preset.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                {previewParticipants.map((p, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-2.5 flex items-center justify-between gap-2 transition-all group shadow-sm"
                  >
                    {/* Left: Seed + Avatar + Name / Edit Input */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[10px] font-mono font-bold text-slate-500 w-4 shrink-0 text-center">
                        #{p.seed}
                      </span>
                      <div className="shrink-0">
                        <AnimalAvatar animal={p.animal} size={28} />
                      </div>

                      {editingIndex === idx ? (
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                          <input
                            type="text"
                            value={editingValue}
                            onChange={e => setEditingValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveEdit(idx);
                              if (e.key === 'Escape') setEditingIndex(null);
                            }}
                            autoFocus
                            className="w-full bg-slate-950 border border-cyan-400 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(idx)}
                            className="text-emerald-400 hover:text-emerald-300 p-0.5 shrink-0"
                            title="Guardar nombre"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="min-w-0 flex-1">
                          <div
                            className="text-xs font-semibold text-slate-200 truncate cursor-pointer hover:text-cyan-300"
                            onClick={() => handleStartEdit(idx, p.name)}
                            title="Haz clic para renombrar"
                          >
                            {p.name}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate font-mono">
                            {p.animal.emoji} {p.animal.name}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Action Icons: Edit & Delete */}
                    {editingIndex !== idx && (
                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(idx, p.name)}
                          className="p-1 rounded-md text-slate-500 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                          title="Editar nombre"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(idx)}
                          className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Eliminar de la lista"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Fullscreen Preference Toggle */}
        <div className="flex items-center justify-between p-3.5 bg-slate-950/40 rounded-2xl border border-slate-800/80">
          <div className="flex items-center gap-3">
            <Maximize className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-xs font-bold text-slate-200">Iniciar en Pantalla Completa</div>
              <div className="text-[11px] text-slate-400">
                Abre el mapa general en vista inmersiva cinematográfica al confirmar.
              </div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={autoFullscreen}
            onChange={e => setAutoFullscreen(e.target.checked)}
            className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
          />
        </div>

        {/* Launch Button */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={participantsList.length < 2}
            className={`w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider transition-all flex items-center justify-center gap-3 group ${
              participantsList.length >= 2
                ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400 hover:from-cyan-400 hover:to-blue-400 text-slate-950 shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
            }`}
          >
            <Play className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" />
            <span>
              {participantsList.length < 2
                ? 'Agrega al menos 2 participantes para comenzar'
                : `Confirmar y Generar Llave con ${participantsList.length} Competidores`}
            </span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </form>
    </div>
  );
};
