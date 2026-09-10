import React, { useState, useEffect, useMemo } from 'react';
import {
  Tournament,
  Match,
  ViewMode,
  TournamentFormat,
  Race,
  RaceDifficulty,
  PointDistributionScheme,
  RaceTournamentConfig,
} from './types';
import {
  PRESET_8_PLAYERS,
  PRESET_16_PLAYERS,
  PRESET_32_PLAYERS,
  createTournament,
  advanceWinner,
  resetMatch,
  parseParticipantInput,
  applyRaceResults,
} from './utils/tournamentEngine';
import { RadialBracket } from './components/RadialBracket';
import { TreeBracket } from './components/TreeBracket';
import { RoundRobinView } from './components/RoundRobinView';
import { MatchModal } from './components/MatchModal';
import { ChampionModal } from './components/ChampionModal';
import { ParticipantManagerModal } from './components/ParticipantManagerModal';
import { AnimalAvatar } from './components/AnimalAvatar';
import { AtmosphericBackground } from './components/AtmosphericBackground';
import { TournamentSetupMenu } from './components/TournamentSetupMenu';
import { SequentialDuelHUD } from './components/SequentialDuelHUD';
import { SpheroRaceTimerModal } from './components/SpheroRaceTimerModal';
import { RaceResultsModal } from './components/RaceResultsModal';
import {
  Trophy,
  Users,
  Compass,
  GitBranch,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Table,
  Swords,
  Shuffle,
  Zap,
  CheckCircle2,
  Play,
  Maximize,
  Minimize,
  Settings,
  Map,
  Layers,
  Flame,
  UserPlus,
  Plus,
  X,
  Save,
} from 'lucide-react';
import { toggleAudio, isAudioEnabled, playClickSfx, playAdvanceSfx } from './utils/audio';
import {
  saveAppState,
  loadAppState,
  clearAppState,
  TournamentPhase,
} from './utils/storage';

export default function App() {
  // Load previously saved state from localStorage if available
  const [initialStoredState] = useState(() => loadAppState());

  // Sequential Phases: 'setup' -> 'overview' (full map / fullscreen) -> 'sequential' (active duel zoom & winner pick)
  const [phase, setPhase] = useState<TournamentPhase>(
    () => initialStoredState?.phase ?? 'setup'
  );

  // Initialize tournament (restored from storage or created fresh)
  const [tournament, setTournament] = useState<Tournament>(() => {
    if (initialStoredState?.tournament) {
      return initialStoredState.tournament;
    }
    return createTournament('Sphero Tournament', PRESET_8_PLAYERS, 'single_elimination');
  });

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (initialStoredState?.viewMode) {
      return initialStoredState.viewMode;
    }
    return initialStoredState?.tournament?.format === 'round_robin' ? 'round_robin' : 'radial';
  });

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState<boolean>(false);
  const [isChampionModalOpen, setIsChampionModalOpen] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Active focused match in sequential mode
  const [activeSequentialMatchId, setActiveSequentialMatchId] = useState<string | null>(
    () => initialStoredState?.activeSequentialMatchId ?? null
  );

  // Active race modals for Round Robin (Sphero Races)
  const [activeRaceForTimer, setActiveRaceForTimer] = useState<Race | null>(null);
  const [activeRaceForResults, setActiveRaceForResults] = useState<Race | null>(null);

  // Local storage save feedback state
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<number | null>(
    () => initialStoredState?.savedAt ?? null
  );
  const [showSavedFeedback, setShowSavedFeedback] = useState<boolean>(false);

  // Synchronous auto-save to localStorage on every change
  useEffect(() => {
    const success = saveAppState({
      tournament,
      phase,
      viewMode,
      activeSequentialMatchId,
    });
    if (success) {
      setLastSavedTimestamp(Date.now());
      setShowSavedFeedback(true);
      const timer = setTimeout(() => setShowSavedFeedback(false), 1800);
      return () => clearTimeout(timer);
    }
  }, [tournament, phase, viewMode, activeSequentialMatchId]);

  // Window beforeunload flush to guarantee state is written on unexpected tab close/reload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveAppState({
        tournament,
        phase,
        viewMode,
        activeSequentialMatchId,
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [tournament, phase, viewMode, activeSequentialMatchId]);

  // Track native fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    playClickSfx();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Helper to find the next pending match that has both participants ready
  const findNextPlayableMatch = (tourney: Tournament): Match | null => {
    for (let r = 0; r < tourney.totalRounds; r++) {
      const roundMatches = tourney.matches.filter(m => m.roundIndex === r);
      for (const m of roundMatches) {
        if (m.status !== 'completed' && m.participant1Id && m.participant2Id) {
          return m;
        }
      }
    }
    return null;
  };

  // Handler when user confirms the initial setup menu
  const handleConfirmSetup = (
    title: string,
    names: string[],
    format: TournamentFormat,
    launchFullscreen: boolean,
    raceConfig?: RaceTournamentConfig
  ) => {
    const newTourney = createTournament(title, names, format, false, raceConfig);
    setTournament(newTourney);
    setViewMode(format === 'round_robin' ? 'round_robin' : 'radial');
    setActiveSequentialMatchId(null);
    setPhase('overview');

    if (launchFullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  // Race handlers for Round Robin
  const handleStartRaceTimer = (race: Race) => {
    setActiveRaceForTimer(race);
  };

  const handleFinishRaceTimer = (race: Race) => {
    setActiveRaceForTimer(null);
    // Automatically transition to results entry modal
    setActiveRaceForResults(race);
  };

  const handleOpenRaceResults = (race: Race) => {
    setActiveRaceForResults(race);
  };

  const handleSaveRaceResults = (
    raceId: string,
    top5ParticipantIds: string[],
    pointScheme: PointDistributionScheme,
    difficulty: RaceDifficulty,
    customBasePoints?: [number, number, number, number, number]
  ) => {
    const updated = applyRaceResults(
      tournament,
      raceId,
      top5ParticipantIds,
      pointScheme,
      difficulty,
      customBasePoints
    );
    setTournament(updated);
    setActiveRaceForResults(null);

    // If all races are now completed, proclaim champion
    if (updated.championId && updated.races?.every(r => r.status === 'completed')) {
      setTimeout(() => {
        setIsChampionModalOpen(true);
      }, 400);
    }
  };

  // Handler when user clicks "INICIAR TORNEO" on the full map overview
  const handleStartTournamentSequence = () => {
    playAdvanceSfx();
    const nextMatch = findNextPlayableMatch(tournament);
    if (nextMatch) {
      setActiveSequentialMatchId(nextMatch.id);
      setPhase('sequential');
    } else if (tournament.championId) {
      setIsChampionModalOpen(true);
    } else {
      // Fallback: pick the first match
      if (tournament.matches.length > 0) {
        setActiveSequentialMatchId(tournament.matches[0].id);
        setPhase('sequential');
      }
    }
  };

  // Sequential winner selection handler
  const handleSequentialWinnerSelected = (
    matchId: string,
    winnerId: string,
    score1: number,
    score2: number
  ) => {
    const updated = advanceWinner(tournament, matchId, winnerId, score1, score2);
    setTournament(updated);

    const completedMatch = tournament.matches.find(m => m.id === matchId);

    // If final completed, crown champion
    if (completedMatch?.isFinal || updated.championId) {
      setActiveSequentialMatchId(null);
      setTimeout(() => {
        setIsChampionModalOpen(true);
        setPhase('overview');
      }, 500);
      return;
    }

    // Automatically transition camera to the next playable match
    const nextMatch = findNextPlayableMatch(updated);
    if (nextMatch) {
      setActiveSequentialMatchId(nextMatch.id);
    } else {
      // All matches done or waiting
      setActiveSequentialMatchId(null);
      setPhase('overview');
    }
  };

  // Sidebar text input
  const [sidebarInput, setSidebarInput] = useState<string>(() =>
    tournament.participants.map(p => p.name).join('\n')
  );

  useEffect(() => {
    setSidebarInput(tournament.participants.map(p => p.name).join('\n'));
  }, [tournament]);

  // When a match is saved manually via modal
  const handleSaveScore = (
    matchId: string,
    winnerId: string,
    score1: number,
    score2: number
  ) => {
    const updated = advanceWinner(tournament, matchId, winnerId, score1, score2);
    setTournament(updated);

    const match = tournament.matches.find(m => m.id === matchId);
    if (match?.isFinal) {
      setTimeout(() => {
        setIsChampionModalOpen(true);
      }, 350);
    }
  };

  const handleResetMatch = (matchId: string) => {
    const updated = resetMatch(tournament, matchId);
    setTournament(updated);
    if (phase === 'sequential') {
      const nextMatch = findNextPlayableMatch(updated);
      if (nextMatch) setActiveSequentialMatchId(nextMatch.id);
    }
  };

  const handleApplyNewTournament = (newTourney: Tournament) => {
    setTournament(newTourney);
    setActiveSequentialMatchId(null);
    if (newTourney.format === 'round_robin') {
      setViewMode('round_robin');
    } else if (viewMode === 'round_robin') {
      setViewMode('radial');
    }
  };

  const handleApplySidebarInput = () => {
    playClickSfx();
    const names = parseParticipantInput(sidebarInput);
    if (names.length >= 2) {
      const newTourney = createTournament(tournament.title, names, tournament.format);
      setTournament(newTourney);
      setActiveSequentialMatchId(null);
    }
  };

  const handleShuffleRoster = () => {
    playClickSfx();
    const names = parseParticipantInput(sidebarInput);
    const shuffled = [...names].sort(() => Math.random() - 0.5);
    setSidebarInput(shuffled.join('\n'));
    const newTourney = createTournament(tournament.title, shuffled, tournament.format);
    setTournament(newTourney);
    setActiveSequentialMatchId(null);
  };

  const handleToggleSound = () => {
    const next = toggleAudio();
    setSoundOn(next);
  };

  const handleResetCurrentTournament = () => {
    playClickSfx();
    if (window.confirm('¿Reiniciar todos los resultados de la llave actual manteniendo los participantes?')) {
      const names = tournament.participants.map(p => p.name);
      const newTourney = createTournament(tournament.title, names, tournament.format, false, tournament.raceConfig);
      setTournament(newTourney);
      setActiveSequentialMatchId(null);
    }
  };

  const handleClearAllSavedData = () => {
    playClickSfx();
    if (
      window.confirm(
        '¿Deseas descartar el torneo guardado y comenzar una configuración desde cero?'
      )
    ) {
      clearAppState();
      const freshTourney = createTournament('Sphero Tournament', PRESET_8_PLAYERS, 'single_elimination');
      setTournament(freshTourney);
      setPhase('setup');
      setViewMode('radial');
      setActiveSequentialMatchId(null);
      setLastSavedTimestamp(null);
    }
  };

  // Quick addition of participant from sidebar
  const [sidebarNewParticipant, setSidebarNewParticipant] = useState('');

  const handleQuickAddParticipant = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = sidebarNewParticipant.trim();
    if (!trimmed) return;

    if (completedMatches > 0) {
      if (
        !window.confirm(
          'El torneo tiene duelos ya jugados. Agregar un participante reiniciará la llave con los nuevos competidores. ¿Deseas continuar?'
        )
      ) {
        return;
      }
    }

    playClickSfx();
    const currentNames = tournament.participants.map(p => p.name);
    const updatedNames = [...currentNames, trimmed];
    const newTourney = createTournament(tournament.title, updatedNames, tournament.format);
    setTournament(newTourney);
    setSidebarNewParticipant('');
    setActiveSequentialMatchId(null);
  };

  const handleQuickRemoveParticipant = (participantId: string) => {
    if (tournament.participants.length <= 2) {
      alert('Debe haber al menos 2 participantes en el torneo.');
      return;
    }
    if (completedMatches > 0) {
      if (
        !window.confirm(
          'Eliminar un participante reiniciará la llave con los participantes restantes. ¿Deseas continuar?'
        )
      ) {
        return;
      }
    }
    playClickSfx();
    const remaining = tournament.participants
      .filter(p => p.id !== participantId)
      .map(p => p.name);
    const newTourney = createTournament(tournament.title, remaining, tournament.format);
    setTournament(newTourney);
    setActiveSequentialMatchId(null);
  };

  const completedMatches = tournament.matches.filter(m => m.status === 'completed').length;
  const totalMatches = tournament.matches.length;
  const progressPercent = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

  // Active match for HUD and info
  const currentSequentialMatch = useMemo(() => {
    if (activeSequentialMatchId) {
      return tournament.matches.find(m => m.id === activeSequentialMatchId) || null;
    }
    return findNextPlayableMatch(tournament);
  }, [activeSequentialMatchId, tournament]);

  const activeMatchLabel = useMemo(() => {
    if (tournament.championId) {
      const champ = tournament.participants.find(p => p.id === tournament.championId);
      return `¡Campeón Proclamado: ${champ?.name || 'Vencedor'}!`;
    }
    if (!currentSequentialMatch) return 'Todos los duelos completados';
    const p1 = tournament.participants.find(p => p.id === currentSequentialMatch.participant1Id);
    const p2 = tournament.participants.find(p => p.id === currentSequentialMatch.participant2Id);
    const name1 = p1 ? p1.name : 'Por Definir';
    const name2 = p2 ? p2.name : 'Por Definir';
    return `${name1} vs ${name2}`;
  }, [tournament, currentSequentialMatch]);

  // Status helper for participants
  const getParticipantStatus = (participantId: string) => {
    if (tournament.championId === participantId) {
      return { label: 'CAMPEÓN', color: 'text-amber-400 font-bold' };
    }
    const lostMatch = tournament.matches.find(
      m =>
        m.status === 'completed' &&
        m.winnerId !== participantId &&
        (m.participant1Id === participantId || m.participant2Id === participantId)
    );
    if (lostMatch) {
      return { label: 'OUT', color: 'text-slate-500 font-mono' };
    }
    const wonMatch = tournament.matches.find(
      m => m.status === 'completed' && m.winnerId === participantId
    );
    if (wonMatch) {
      return { label: 'AVANZÓ', color: 'text-cyan-400 font-mono font-bold' };
    }
    return { label: 'READY', color: 'text-green-400 font-mono' };
  };

  return (
    <div
      className="relative w-full min-h-screen bg-[#0f172a] text-slate-100 font-sans overflow-x-hidden flex flex-col p-3 sm:p-5 select-none"
      style={{ background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)' }}
    >
      {/* Subtle animated particles and slow-moving radial gradient mesh */}
      <AtmosphericBackground />

      <div className="relative z-10 flex flex-col flex-1 w-full">
        {/* ========================================================================= */}
        {/* PHASE 1: INITIAL TOURNAMENT SETUP MENU                                    */}
        {/* ========================================================================= */}
        {phase === 'setup' && (
          <div className="flex-1 flex items-center justify-center py-6">
            <TournamentSetupMenu
              initialTitle={tournament.title}
              initialNames={tournament.participants.map(p => p.name)}
              initialFormat={tournament.format}
              hasExistingProgress={
                Boolean(
                  tournament &&
                    tournament.participants.length >= 2 &&
                    (tournament.matches.some(m => m.status === 'completed') ||
                      tournament.races?.some(r => r.status === 'completed') ||
                      lastSavedTimestamp !== null)
                )
              }
              onResumeTournament={() => {
                playClickSfx();
                setPhase('overview');
              }}
              onClearSavedData={handleClearAllSavedData}
              onStartTournament={handleConfirmSetup}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* PHASES 2 & 3: FULL MAP OVERVIEW & SEQUENTIAL ACTIVE DUEL MODE             */}
        {/* ========================================================================= */}
        {phase !== 'setup' && (
          <>
            {/* Header: Atmospheric / Immersive Media Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 px-2 sm:px-4">
              {/* Brand & Tournament Meta */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_18px_rgba(6,182,212,0.5)] shrink-0 border border-cyan-300/30">
                  <svg className="w-6 h-6 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="8.5" strokeWidth="2.5" />
                    <circle cx="12" cy="12" r="3.5" strokeWidth="2" strokeDasharray="3 2" />
                    <circle cx="12" cy="12" r="1" fill="currentColor" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">
                      SPHERO TOURNAMENT
                    </h1>
                    {phase === 'sequential' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/50 text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        <span>MODO SECUENCIAL EN VIVO</span>
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 flex-wrap">
                    <span className="text-cyan-400 font-semibold tracking-tight">Developed for STEM Pillar by Akamai Costa Rica</span>
                    <span>•</span>
                    <span className="truncate max-w-[200px] text-slate-300 font-bold">{tournament.title}</span>
                    <span>•</span>
                    <span>{tournament.participants.length} PARTICIPANTES</span>
                    <span>•</span>
                    <span className="text-cyan-400 font-bold">{progressPercent}% COMPLETADO</span>
                    <span>•</span>
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800/90 border border-emerald-500/40 text-[10px] font-mono font-medium text-emerald-400 cursor-help"
                      title={
                        lastSavedTimestamp
                          ? `Autoguardado local activo en tu navegador. Último cambio guardado a las ${new Date(
                              lastSavedTimestamp
                            ).toLocaleTimeString()}`
                          : 'Autoguardado local activo: no se pierde información ante recargas o caídas'
                      }
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          showSavedFeedback
                            ? 'bg-emerald-300 ring-2 ring-emerald-400/50 scale-125'
                            : 'bg-emerald-400'
                        }`}
                      />
                      <Save className="w-3 h-3" />
                      <span>{showSavedFeedback ? '¡Guardado!' : 'Guardado local'}</span>
                      {lastSavedTimestamp && (
                        <span className="text-slate-400 opacity-80 hidden lg:inline">
                          ({new Date(lastSavedTimestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })})
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation & Live Controls */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
                {/* PRIMARY ACTION: START TOURNAMENT BUTTON */}
                {phase === 'overview' && (
                  <button
                    onClick={handleStartTournamentSequence}
                    className="flex items-center gap-2 bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black px-5 py-2 rounded-full shadow-[0_0_25px_rgba(6,182,212,0.5)] hover:shadow-[0_0_35px_rgba(6,182,212,0.8)] text-xs uppercase tracking-wider transition-all transform hover:scale-105 active:scale-95 cursor-pointer group"
                    title="Iniciar torneo secuencial con zoom dinámico al match actual"
                  >
                    <Play className="w-4 h-4 fill-slate-950 group-hover:scale-110 transition-transform" />
                    <span>⚡ INICIAR TORNEO</span>
                  </button>
                )}

                {/* Return to full overview when in sequential mode */}
                {phase === 'sequential' && (
                  <button
                    onClick={() => {
                      playClickSfx();
                      setPhase('overview');
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white shadow-md transition-all"
                    title="Ver vista panorámica completa del mapa"
                  >
                    <Map className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Ver Mapa Completo</span>
                  </button>
                )}

                {/* Pill View Mode Switcher */}
                <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 p-1 rounded-full flex flex-wrap gap-1">
                  <button
                    onClick={() => {
                      playClickSfx();
                      setViewMode('radial');
                    }}
                    className={`px-3 sm:px-4 py-1.5 rounded-full text-xs transition-all ${
                      viewMode === 'radial'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/30'
                        : 'text-slate-400 hover:text-white font-medium'
                    }`}
                  >
                    RADIAL
                  </button>
                  <button
                    onClick={() => {
                      playClickSfx();
                      setViewMode('tree_horizontal');
                    }}
                    className={`px-3 sm:px-4 py-1.5 rounded-full text-xs transition-all ${
                      viewMode === 'tree_horizontal'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/30'
                        : 'text-slate-400 hover:text-white font-medium'
                    }`}
                  >
                    ÁRBOL H
                  </button>
                  <button
                    onClick={() => {
                      playClickSfx();
                      setViewMode('tree_vertical');
                    }}
                    className={`px-3 sm:px-4 py-1.5 rounded-full text-xs transition-all ${
                      viewMode === 'tree_vertical'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/30'
                        : 'text-slate-400 hover:text-white font-medium'
                    }`}
                  >
                    ÁRBOL V
                  </button>
                  <button
                    onClick={() => {
                      playClickSfx();
                      setViewMode('round_robin');
                    }}
                    className={`px-3 sm:px-4 py-1.5 rounded-full text-xs transition-all ${
                      viewMode === 'round_robin'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/30'
                        : 'text-slate-400 hover:text-white font-medium'
                    }`}
                  >
                    ROUND ROBIN
                  </button>
                </div>

                {/* Participants Manager Button */}
                <button
                  onClick={() => {
                    playClickSfx();
                    setIsParticipantModalOpen(true);
                  }}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-cyan-400 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                  title="Gestionar y agregar participantes"
                >
                  <UserPlus className="w-4 h-4 text-cyan-400" />
                  <span className="hidden sm:inline">Participantes</span>
                </button>

                {/* Reconfigure Menu Button */}
                <button
                  onClick={() => {
                    playClickSfx();
                    setPhase('setup');
                  }}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-cyan-400 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                  title="Abrir Menú de Configuración"
                >
                  <Settings className="w-4 h-4 text-cyan-400" />
                  <span className="hidden sm:inline">Config</span>
                </button>

                {/* Fullscreen Toggle */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-cyan-400 transition-colors"
                  title={isFullscreen ? 'Salir de Pantalla Completa' : 'Pantalla Completa'}
                >
                  {isFullscreen ? <Minimize className="w-4 h-4 text-amber-400" /> : <Maximize className="w-4 h-4" />}
                </button>

                {/* Sound Audio Toggle */}
                <button
                  onClick={handleToggleSound}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
                  title={soundOn ? 'Silenciar Sonido' : 'Activar Sonido'}
                >
                  {soundOn ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                </button>

                {/* Reset Tournament */}
                <button
                  onClick={handleResetCurrentTournament}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Reiniciar resultados del torneo"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* Overview Banner: Instructions to start the sequential tournament */}
            {phase === 'overview' && (
              <div className="mb-4 px-4 py-2.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-cyan-400 animate-spin-slow" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-white uppercase tracking-wider">
                      Fase 2: Mapa Completo de la Llave
                    </span>
                    <p className="text-[11px] text-slate-300">
                      Explora la estructura completa. Haz clic en{' '}
                      <strong className="text-cyan-400">"⚡ INICIAR TORNEO"</strong> para entrar en el modo secuencial con auto-zoom en cada match.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleStartTournamentSequence}
                  className="shrink-0 px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md hover:shadow-cyan-500/40 transition-all flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Comenzar Duelos</span>
                </button>
              </div>
            )}

            {/* Main Grid: Management Sidebar + Main Canvas Area */}
            <main className="flex-1 grid grid-cols-12 gap-5 overflow-hidden">
              {/* Sidebar: Participants Management & Live Roster (visible in overview, or collapsible) */}
              <section
                className={`${
                  phase === 'sequential'
                    ? 'hidden lg:flex lg:col-span-3'
                    : 'col-span-12 xl:col-span-3'
                } flex flex-col gap-4`}
              >
                {/* Live Roster Box */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-5 shadow-2xl flex flex-col flex-1">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-cyan-400" />
                      <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                        Roster ({tournament.participants.length})
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          playClickSfx();
                          setIsParticipantModalOpen(true);
                        }}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Gestionar lista completa de participantes"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                        EN VIVO
                      </span>
                    </div>
                  </div>

                  {/* Inline quick-add input for participant names */}
                  <form onSubmit={handleQuickAddParticipant} className="flex gap-1.5 mb-3">
                    <input
                      type="text"
                      value={sidebarNewParticipant}
                      onChange={e => setSidebarNewParticipant(e.target.value)}
                      placeholder="+ Agregar competidor..."
                      className="flex-1 bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-medium"
                    />
                    <button
                      type="submit"
                      disabled={!sidebarNewParticipant.trim()}
                      className="px-2.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer flex items-center justify-center shadow-md shadow-cyan-500/20"
                      title="Agregar participante al torneo"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </form>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[440px] custom-scrollbar">
                    {tournament.participants.map(participant => {
                      const st = getParticipantStatus(participant.id);
                      return (
                        <div
                          key={participant.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-cyan-500/40 transition-colors group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <AnimalAvatar animal={participant.animal} size={30} />
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-medium text-slate-200 block truncate group-hover:text-cyan-300">
                                {participant.name}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate font-mono">
                                {participant.animal.name}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700/60 ${st.color}`}>
                              {st.label}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuickRemoveParticipant(participant.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all cursor-pointer"
                              title="Eliminar del torneo"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Main Canvas Area */}
              <section
                className={`${
                  phase === 'sequential' ? 'col-span-12 lg:col-span-9' : 'col-span-12 xl:col-span-9'
                } flex flex-col gap-4`}
              >
                {viewMode === 'radial' && (
                  <RadialBracket
                    tournament={tournament}
                    onSelectMatch={match => setSelectedMatch(match)}
                    onOpenChampionModal={() => setIsChampionModalOpen(true)}
                    focusedMatchId={phase === 'sequential' ? activeSequentialMatchId : null}
                    isSequentialMode={phase === 'sequential'}
                  />
                )}

                {viewMode === 'tree_horizontal' && (
                  <TreeBracket
                    tournament={tournament}
                    orientation="horizontal"
                    onSelectMatch={match => setSelectedMatch(match)}
                    onOpenChampionModal={() => setIsChampionModalOpen(true)}
                  />
                )}

                {viewMode === 'tree_vertical' && (
                  <TreeBracket
                    tournament={tournament}
                    orientation="vertical"
                    onSelectMatch={match => setSelectedMatch(match)}
                    onOpenChampionModal={() => setIsChampionModalOpen(true)}
                  />
                )}

                {viewMode === 'round_robin' && (
                  <RoundRobinView
                    tournament={tournament}
                    onStartRaceTimer={handleStartRaceTimer}
                    onRecordRaceResults={handleOpenRaceResults}
                    onOpenChampionModal={() => setIsChampionModalOpen(true)}
                  />
                )}
              </section>
            </main>

            {/* Sequential Duel Bottom HUD: Focuses on current match and awaits winner pick */}
            {phase === 'sequential' && currentSequentialMatch && (
              <div className="sticky bottom-2 z-40 mt-3 animate-fadeIn">
                <SequentialDuelHUD
                  currentMatch={currentSequentialMatch}
                  participants={tournament.participants}
                  totalMatches={totalMatches}
                  completedMatchesCount={completedMatches}
                  matchSequenceIndex={completedMatches + 1}
                  totalSequentialMatches={totalMatches}
                  onSelectWinner={handleSequentialWinnerSelected}
                  onExitSequentialMode={() => setPhase('overview')}
                  onResetMatch={handleResetMatch}
                />
              </div>
            )}

            {/* Atmospheric Media Footer when in overview mode */}
            {phase === 'overview' && (
              <footer className="mt-4 py-3 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center px-4 gap-4 bg-slate-900/30 backdrop-blur-md rounded-2xl border border-slate-800/40">
                <div className="flex gap-6 items-center flex-wrap">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      Active Match
                    </span>
                    <span className="text-xs font-medium text-slate-200">{activeMatchLabel}</span>
                  </div>
                  <div className="h-6 w-px bg-slate-800 hidden sm:block" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                      STEM Initiative
                    </span>
                    <span className="text-xs font-semibold text-slate-200">
                      Developed for STEM Pillar by Akamai Costa Rica
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap justify-end">
                  <span className="text-xs text-slate-400">
                    Completados: <span className="text-white font-mono font-bold">{completedMatches}/{totalMatches}</span> •{' '}
                    Progreso: <span className="text-cyan-400 font-mono font-bold">{progressPercent}%</span>
                  </span>
                  <button
                    onClick={handleStartTournamentSequence}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black px-6 py-2 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                    <span>INICIAR TORNEO</span>
                  </button>
                </div>
              </footer>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <MatchModal
        match={selectedMatch}
        participants={tournament.participants}
        isOpen={Boolean(selectedMatch)}
        onClose={() => setSelectedMatch(null)}
        onSaveScore={handleSaveScore}
        onResetMatch={handleResetMatch}
      />

      <ChampionModal
        tournament={tournament}
        isOpen={isChampionModalOpen}
        onClose={() => setIsChampionModalOpen(false)}
      />

      <ParticipantManagerModal
        currentTournament={tournament}
        isOpen={isParticipantModalOpen}
        onClose={() => setIsParticipantModalOpen(false)}
        onApplyNewTournament={handleApplyNewTournament}
      />

      {/* Sphero Race Modals */}
      {activeRaceForTimer && (
        <SpheroRaceTimerModal
          race={activeRaceForTimer}
          onClose={() => setActiveRaceForTimer(null)}
          onFinishRace={handleFinishRaceTimer}
        />
      )}

      {activeRaceForResults && (
        <RaceResultsModal
          race={activeRaceForResults}
          participants={tournament.participants}
          onClose={() => setActiveRaceForResults(null)}
          onSaveResults={handleSaveRaceResults}
        />
      )}
    </div>
  );
}
