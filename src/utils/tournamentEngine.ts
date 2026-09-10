import {
  Tournament,
  Participant,
  Match,
  TournamentFormat,
  Race,
  RaceDifficulty,
  PointDistributionScheme,
  RaceTopResult,
  RaceTournamentConfig,
  DifficultyLevel,
  PodiumPlace,
} from '../types';
import { getAnimalForParticipant } from '../data/animals';

export { getAnimalForParticipant };

export const RACE_CIRCUIT_NAMES = [
  'Circuito Inicial Sphero',
  'Pista de Obstáculos STEM',
  'Laberinto de Precisión',
  'Rally de Velocidad Acrobático',
  'Gran Prix Master Akamai',
  'Circuito de Resistencia Gravitacional',
  'Desafío Espiral de Alta Frecuencia',
  'Super Copa Final de Campeones',
];

export const POINT_SCHEMES: Record<PointDistributionScheme, {
  id: PointDistributionScheme;
  name: string;
  description: string;
  basePoints: [number, number, number, number, number];
}> = {
  f1: {
    id: 'f1',
    name: 'F1 Grand Prix (Oficial)',
    description: '25, 18, 15, 12, 10 — Estándar internacional competitivo',
    basePoints: [25, 18, 15, 12, 10],
  },
  proportional: {
    id: 'proportional',
    name: 'Proporcional Escalonado',
    description: '50, 40, 30, 20, 10 — Reparto escalonado equitativo',
    basePoints: [50, 40, 30, 20, 10],
  },
  exponential: {
    id: 'exponential',
    name: 'Podio Exponencial',
    description: '100, 60, 40, 20, 10 — Gran bonificación para el 1º lugar',
    basePoints: [100, 60, 40, 20, 10],
  },
  stem_linear: {
    id: 'stem_linear',
    name: 'Sprint STEM',
    description: '30, 24, 18, 12, 6 — Múltiplos ágiles ideales para competencias STEM',
    basePoints: [30, 24, 18, 12, 6],
  },
  custom: {
    id: 'custom',
    name: 'Personalizado',
    description: 'Puntajes base configurables manualmente',
    basePoints: [25, 18, 15, 12, 10],
  },
};

export const DIFFICULTY_PRESETS: { level: DifficultyLevel; name: string; multiplier: number }[] = [
  { level: 'easy', name: 'Fácil (Circuito Abierto)', multiplier: 1.0 },
  { level: 'medium', name: 'Medio (Pista con Curvas)', multiplier: 1.25 },
  { level: 'hard', name: 'Difícil (Obstáculos y Rampas)', multiplier: 1.5 },
  { level: 'expert', name: 'Experto (Laberinto y Slalom)', multiplier: 1.75 },
  { level: 'extreme', name: 'Extremo (Circuito Maestro)', multiplier: 2.0 },
];

export function generateDefaultRaces(
  totalRaces: number = 4,
  durationSeconds: number = 120,
  progression: 'standard' | 'accelerated' | 'epic_final' | 'custom' = 'standard',
  defaultScheme: PointDistributionScheme = 'f1'
): Race[] {
  const races: Race[] = [];
  for (let i = 0; i < totalRaces; i++) {
    const raceNumber = i + 1;
    let multiplier = 1.0;
    let level: DifficultyLevel = 'easy';

    if (progression === 'standard') {
      // Step +0.25 per race: 1.0, 1.25, 1.5, 1.75, 2.0...
      multiplier = Number((1.0 + i * 0.25).toFixed(2));
    } else if (progression === 'accelerated') {
      // Step +0.5 per race: 1.0, 1.5, 2.0, 2.5, 3.0...
      multiplier = Number((1.0 + i * 0.5).toFixed(2));
    } else if (progression === 'epic_final') {
      const epicSteps = [1.0, 1.25, 1.5, 2.0, 3.0, 4.0];
      multiplier = epicSteps[Math.min(i, epicSteps.length - 1)];
    } else {
      multiplier = Number((1.0 + i * 0.25).toFixed(2));
    }

    if (multiplier <= 1.0) level = 'easy';
    else if (multiplier <= 1.25) level = 'medium';
    else if (multiplier <= 1.5) level = 'hard';
    else if (multiplier <= 1.75) level = 'expert';
    else level = 'extreme';

    const defaultTitle = RACE_CIRCUIT_NAMES[i % RACE_CIRCUIT_NAMES.length] || `Carrera #${raceNumber}`;

    races.push({
      id: `race-${raceNumber}-${Date.now() + i}`,
      raceNumber,
      title: defaultTitle,
      durationSeconds,
      difficulty: {
        level,
        name: `Nivel ${raceNumber} (${level.toUpperCase()})`,
        multiplier,
      },
      status: 'pending',
      pointScheme: defaultScheme,
    });
  }
  return races;
}

export function applyRaceResults(
  tournament: Tournament,
  raceId: string,
  top5ParticipantIds: string[],
  pointScheme: PointDistributionScheme,
  difficulty: RaceDifficulty,
  customBasePoints?: [number, number, number, number, number]
): Tournament {
  const schemeConfig = POINT_SCHEMES[pointScheme] || POINT_SCHEMES.f1;
  const basePointsArray = customBasePoints || schemeConfig.basePoints;

  const top5Results: RaceTopResult[] = top5ParticipantIds.map((pId, index) => {
    const position = (index + 1) as 1 | 2 | 3 | 4 | 5;
    const basePoints = basePointsArray[index] ?? 0;
    const finalPoints = Math.round(basePoints * difficulty.multiplier);
    return {
      position,
      participantId: pId,
      basePoints,
      finalPoints,
    };
  });

  const updatedRaces = (tournament.races || []).map(race => {
    if (race.id === raceId) {
      return {
        ...race,
        difficulty,
        pointScheme,
        customBasePoints,
        top5Results,
        status: 'completed' as const,
        completedAt: new Date().toISOString(),
      };
    }
    return race;
  });

  const updatedParticipants = tournament.participants.map(p => {
    let totalPoints = 0;
    let racesCompleted = 0;
    let podiumsCount = 0;
    let victoriesCount = 0;
    let top5Count = 0;
    const racePointsMap: Record<number, number> = {};

    updatedRaces.forEach(race => {
      if (race.status === 'completed' && race.top5Results) {
        const racerResult = race.top5Results.find(r => r.participantId === p.id);
        if (racerResult) {
          totalPoints += racerResult.finalPoints;
          racesCompleted++;
          top5Count++;
          if (racerResult.position <= 3) podiumsCount++;
          if (racerResult.position === 1) victoriesCount++;
          racePointsMap[race.raceNumber] = racerResult.finalPoints;
        } else {
          racePointsMap[race.raceNumber] = 0;
        }
      }
    });

    return {
      ...p,
      stats: {
        ...p.stats,
        pointsScored: totalPoints,
      },
      raceStats: {
        totalPoints,
        racesCompleted,
        podiumsCount,
        victoriesCount,
        top5Count,
        racePointsMap,
      },
    };
  });

  const allCompleted = updatedRaces.length > 0 && updatedRaces.every(r => r.status === 'completed');
  let championId = tournament.championId;

  if (allCompleted) {
    const sorted = [...updatedParticipants].sort((a, b) => {
      const ptsA = a.raceStats?.totalPoints ?? 0;
      const ptsB = b.raceStats?.totalPoints ?? 0;
      if (ptsB !== ptsA) return ptsB - ptsA;
      const vicA = a.raceStats?.victoriesCount ?? 0;
      const vicB = b.raceStats?.victoriesCount ?? 0;
      return vicB - vicA;
    });
    championId = sorted[0]?.id || null;
  }

  return {
    ...tournament,
    races: updatedRaces,
    participants: updatedParticipants,
    championId,
  };
}

export const PRESET_8_PLAYERS = [
  'Alex "Fénix" Silva',
  'Elena "Nova" Chen',
  'Carlos "Tigre" Morales',
  'Sofia "Valquiria" Rossi',
  'Liam "Frost" Walker',
  'Yuki "Sombra" Tanaka',
  'Mateo "Titán" Gómez',
  'Aria "Cíber" Vance'
];

export const PRESET_16_PLAYERS = [
  'Alex "Fénix" Silva',
  'Elena "Nova" Chen',
  'Carlos "Tigre" Morales',
  'Sofia "Valquiria" Rossi',
  'Liam "Frost" Walker',
  'Yuki "Sombra" Tanaka',
  'Mateo "Titán" Gómez',
  'Aria "Cíber" Vance',
  'Diego "Relámpago" Ríos',
  'Maya "Esmeralda" Lin',
  'Lucas "Coloso" Bauer',
  'Zara "Vórtice" Khan',
  'Renzo "Garras" Díaz',
  'Kira "Nebula" Sato',
  'Oliver "Cazador" Reed',
  'Emma "Estrella" Blanco'
];

export const PRESET_32_PLAYERS = [
  'Alex "Fénix" Silva', 'Elena "Nova" Chen', 'Carlos "Tigre" Morales', 'Sofia "Valquiria" Rossi',
  'Liam "Frost" Walker', 'Yuki "Sombra" Tanaka', 'Mateo "Titán" Gómez', 'Aria "Cíber" Vance',
  'Diego "Relámpago" Ríos', 'Maya "Esmeralda" Lin', 'Lucas "Coloso" Bauer', 'Zara "Vórtice" Khan',
  'Renzo "Garras" Díaz', 'Kira "Nebula" Sato', 'Oliver "Cazador" Reed', 'Emma "Estrella" Blanco',
  'Viktor "Draco" Petrov', 'Chloe "Brisa" Martin', 'Dante "Inferno" Cruz', 'Isabella "Luz" Moreno',
  'Kai "Tsunami" Takahashi', 'Camila "Oasis" Vega', 'Max "Centella" Weber', 'Valeria "Ártico" Romero',
  'Samir "Onyx" Al-Mansoor', 'Clara "Sirena" Dupont', 'Bruno "Roca" Santos', 'Nadia "Cometa" Ivanova',
  'Kenji "Viper" Watanabe', 'Lucía "Aurora" Herrera', 'Noah "Apex" Sterling', 'Jimena "Sol" Navarro'
];

export function parseParticipantInput(rawInput: string): string[] {
  return rawInput
    .split(/[\n,]+/)
    .map(name => name.trim())
    .filter(name => name.length > 0);
}

// Find closest power of 2 >= count (minimum 4, maximum 32 for best radial layout)
export function getBracketSize(participantCount: number): number {
  if (participantCount <= 4) return 4;
  if (participantCount <= 8) return 8;
  if (participantCount <= 16) return 16;
  return 32;
}

export function createTournament(
  title: string,
  rawNames: string[],
  format: TournamentFormat = 'single_elimination',
  shuffle: boolean = false,
  raceConfig?: RaceTournamentConfig
): Tournament {
  let names = rawNames.filter(n => n.trim().length > 0);
  if (names.length < 2) {
    names = [...PRESET_8_PLAYERS];
  }

  if (shuffle) {
    names = [...names].sort(() => Math.random() - 0.5);
  }

  // In round_robin, all players participate directly without padding to power of 2
  const isRoundRobin = format === 'round_robin';
  const participantCount = isRoundRobin ? names.length : getBracketSize(names.length);

  // Fill participants
  const participants: Participant[] = [];
  for (let i = 0; i < participantCount; i++) {
    const name = names[i] || `Jugador Bye ${i + 1}`;
    const animal = getAnimalForParticipant(name, i);
    participants.push({
      id: `p-${i + 1}-${Date.now()}`,
      name,
      seed: i + 1,
      animal,
      stats: {
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        pointsScored: 0,
        pointsConceded: 0,
      },
      raceStats: {
        totalPoints: 0,
        racesCompleted: 0,
        podiumsCount: 0,
        victoriesCount: 0,
        top5Count: 0,
        racePointsMap: {},
      },
    });
  }

  const bracketSize = getBracketSize(names.length);
  const totalRounds = Math.log2(bracketSize);
  const matches: Match[] = [];

  // Generate Single Elimination Bracket Matches
  for (let r = 0; r < totalRounds; r++) {
    const matchesInRound = bracketSize / Math.pow(2, r + 1);
    const isSemifinal = r === totalRounds - 2;
    const isFinal = r === totalRounds - 1;

    for (let m = 0; m < matchesInRound; m++) {
      const matchId = `r${r}-m${m}`;
      let p1Id: string | null = null;
      let p2Id: string | null = null;

      // Seed first round
      if (r === 0) {
        p1Id = participants[m * 2]?.id || null;
        p2Id = participants[m * 2 + 1]?.id || null;
      }

      matches.push({
        id: matchId,
        roundIndex: r,
        matchIndex: m,
        participant1Id: p1Id,
        participant2Id: p2Id,
        score1: null,
        score2: null,
        winnerId: null,
        status: 'pending',
        isSemifinal,
        isFinal,
        bestOf: isFinal ? 5 : isSemifinal ? 3 : 1,
      });
    }
  }

  // Initialize races for round_robin format
  const finalRaceConfig: RaceTournamentConfig = raceConfig || {
    totalRaces: 4,
    raceDurationSeconds: 120,
    difficultyProgression: 'standard',
    defaultPointScheme: 'f1',
  };

  const races = isRoundRobin
    ? generateDefaultRaces(
        finalRaceConfig.totalRaces,
        finalRaceConfig.raceDurationSeconds,
        finalRaceConfig.difficultyProgression,
        finalRaceConfig.defaultPointScheme
      )
    : undefined;

  return {
    id: `tourney-${Date.now()}`,
    title: title || 'Sphero Tournament',
    format,
    participants,
    matches,
    races,
    raceConfig: isRoundRobin ? finalRaceConfig : undefined,
    championId: null,
    totalRounds,
    createdAt: new Date().toISOString(),
  };
}

export function advanceWinner(
  tournament: Tournament,
  matchId: string,
  winnerId: string,
  score1: number,
  score2: number
): Tournament {
  const match = tournament.matches.find(m => m.id === matchId);
  if (!match) return tournament;

  const previousWinnerId = match.winnerId;

  // Clone matches
  const updatedMatches = tournament.matches.map(m => {
    if (m.id === matchId) {
      return {
        ...m,
        score1,
        score2,
        winnerId,
        status: 'completed' as const,
      };
    }
    return { ...m };
  });

  const nextRoundIndex = match.roundIndex + 1;
  const nextMatchIndex = Math.floor(match.matchIndex / 2);
  const isSlot1 = match.matchIndex % 2 === 0;

  // If this was the final match
  let newChampionId = tournament.championId;
  if (match.isFinal) {
    newChampionId = winnerId;
  } else if (nextRoundIndex < tournament.totalRounds) {
    // Propagate winner to next match
    const nextMatchId = `r${nextRoundIndex}-m${nextMatchIndex}`;
    const nextMatch = updatedMatches.find(m => m.id === nextMatchId);
    if (nextMatch) {
      if (isSlot1) {
        // If changing winner, cascade reset next match if previous winner had already played or won
        if (previousWinnerId && previousWinnerId !== winnerId && nextMatch.winnerId) {
          cascadeResetMatch(updatedMatches, nextRoundIndex, nextMatchIndex);
        }
        nextMatch.participant1Id = winnerId;
      } else {
        if (previousWinnerId && previousWinnerId !== winnerId && nextMatch.winnerId) {
          cascadeResetMatch(updatedMatches, nextRoundIndex, nextMatchIndex);
        }
        nextMatch.participant2Id = winnerId;
      }
      if (nextMatch.status === 'completed' && previousWinnerId && previousWinnerId !== winnerId) {
        nextMatch.status = 'in_progress';
        nextMatch.winnerId = null;
        nextMatch.score1 = null;
        nextMatch.score2 = null;
      }
    }
  }

  // Recalculate participant stats
  const participants = tournament.participants.map(p => {
    let played = 0;
    let won = 0;
    let lost = 0;
    let pointsScored = 0;
    let pointsConceded = 0;

    updatedMatches.forEach(m => {
      if (m.status === 'completed') {
        if (m.participant1Id === p.id) {
          played++;
          pointsScored += m.score1 || 0;
          pointsConceded += m.score2 || 0;
          if (m.winnerId === p.id) won++;
          else lost++;
        } else if (m.participant2Id === p.id) {
          played++;
          pointsScored += m.score2 || 0;
          pointsConceded += m.score1 || 0;
          if (m.winnerId === p.id) won++;
          else lost++;
        }
      }
    });

    return {
      ...p,
      stats: {
        matchesPlayed: played,
        matchesWon: won,
        matchesLost: lost,
        pointsScored,
        pointsConceded,
      }
    };
  });

  return {
    ...tournament,
    matches: updatedMatches,
    participants,
    championId: newChampionId,
  };
}

export function resetMatch(tournament: Tournament, matchId: string): Tournament {
  const match = tournament.matches.find(m => m.id === matchId);
  if (!match) return tournament;

  const updatedMatches = tournament.matches.map(m => ({ ...m }));
  cascadeResetMatch(updatedMatches, match.roundIndex, match.matchIndex);

  const resetTarget = updatedMatches.find(m => m.id === matchId);
  if (resetTarget) {
    resetTarget.score1 = null;
    resetTarget.score2 = null;
    resetTarget.winnerId = null;
    resetTarget.status = 'pending';
  }

  const championStillValid = tournament.championId && updatedMatches.find(m => m.isFinal)?.winnerId;

  return {
    ...tournament,
    matches: updatedMatches,
    championId: championStillValid ? tournament.championId : null,
  };
}

function cascadeResetMatch(matches: Match[], roundIndex: number, matchIndex: number) {
  const targetId = `r${roundIndex}-m${matchIndex}`;
  const target = matches.find(m => m.id === targetId);
  if (!target) return;

  const nextRound = roundIndex + 1;
  const nextMatchIndex = Math.floor(matchIndex / 2);
  const nextMatchId = `r${nextRound}-m${nextMatchIndex}`;
  const nextMatch = matches.find(m => m.id === nextMatchId);

  if (nextMatch) {
    if (matchIndex % 2 === 0) {
      nextMatch.participant1Id = null;
    } else {
      nextMatch.participant2Id = null;
    }
    nextMatch.score1 = null;
    nextMatch.score2 = null;
    nextMatch.winnerId = null;
    nextMatch.status = 'pending';
    cascadeResetMatch(matches, nextRound, nextMatchIndex);
  }
}

export function getTopThreePodium(tournament: Tournament): PodiumPlace[] {
  if (!tournament.participants || tournament.participants.length === 0) return [];

  if (tournament.format === 'round_robin') {
    // Sort participants by totalPoints desc, victoriesCount desc, podiumsCount desc, seed asc
    const sorted = [...tournament.participants].sort((a, b) => {
      const ptsA = a.raceStats?.totalPoints ?? 0;
      const ptsB = b.raceStats?.totalPoints ?? 0;
      if (ptsB !== ptsA) return ptsB - ptsA;

      const vicA = a.raceStats?.victoriesCount ?? 0;
      const vicB = b.raceStats?.victoriesCount ?? 0;
      if (vicB !== vicA) return vicB - vicA;

      const podA = a.raceStats?.podiumsCount ?? 0;
      const podB = b.raceStats?.podiumsCount ?? 0;
      if (podB !== podA) return podB - podA;

      return a.seed - b.seed;
    });

    const podium: PodiumPlace[] = [];
    if (sorted[0]) {
      podium.push({
        place: 1,
        participant: sorted[0],
        title: 'Gran Campeón de Oro',
        medal: '🥇',
        colorScheme: 'gold',
        scoreSummary: `${sorted[0].raceStats?.totalPoints ?? 0} PTS`,
        details: `${sorted[0].raceStats?.victoriesCount ?? 0} Victorias • ${sorted[0].raceStats?.podiumsCount ?? 0} Podios`,
      });
    }
    if (sorted[1]) {
      podium.push({
        place: 2,
        participant: sorted[1],
        title: 'Subcampeón de Plata',
        medal: '🥈',
        colorScheme: 'silver',
        scoreSummary: `${sorted[1].raceStats?.totalPoints ?? 0} PTS`,
        details: `${sorted[1].raceStats?.victoriesCount ?? 0} Victorias • ${sorted[1].raceStats?.podiumsCount ?? 0} Podios`,
      });
    }
    if (sorted[2]) {
      podium.push({
        place: 3,
        participant: sorted[2],
        title: 'Tercer Lugar de Bronce',
        medal: '🥉',
        colorScheme: 'bronze',
        scoreSummary: `${sorted[2].raceStats?.totalPoints ?? 0} PTS`,
        details: `${sorted[2].raceStats?.victoriesCount ?? 0} Victorias • ${sorted[2].raceStats?.podiumsCount ?? 0} Podios`,
      });
    }
    return podium;
  }

  // Single Elimination
  const champion = tournament.championId
    ? tournament.participants.find(p => p.id === tournament.championId) || null
    : null;

  const finalMatch = tournament.matches.find(m => m.isFinal);
  let runnerUp: Participant | null = null;
  if (finalMatch && champion) {
    const runnerUpId =
      finalMatch.participant1Id === champion.id
        ? finalMatch.participant2Id
        : finalMatch.participant1Id;
    if (runnerUpId) {
      runnerUp = tournament.participants.find(p => p.id === runnerUpId) || null;
    }
  }

  // Find third place: candidate from semifinal matches who is not champion or runnerUp
  const semifinalMatches = tournament.matches.filter(m => m.isSemifinal);
  const semiLoserCandidates: Participant[] = [];
  semifinalMatches.forEach(m => {
    [m.participant1Id, m.participant2Id].forEach(pid => {
      if (pid && pid !== champion?.id && pid !== runnerUp?.id) {
        const p = tournament.participants.find(part => part.id === pid);
        if (p && !semiLoserCandidates.some(cand => cand.id === p.id)) {
          semiLoserCandidates.push(p);
        }
      }
    });
  });

  let thirdPlace: Participant | null = null;
  if (semiLoserCandidates.length > 0) {
    semiLoserCandidates.sort((a, b) => {
      if (b.stats.pointsScored !== a.stats.pointsScored) {
        return b.stats.pointsScored - a.stats.pointsScored;
      }
      return b.stats.matchesWon - a.stats.matchesWon;
    });
    thirdPlace = semiLoserCandidates[0];
  } else {
    // Fallback: highest points scored among remaining participants
    const remaining = tournament.participants
      .filter(p => p.id !== champion?.id && p.id !== runnerUp?.id)
      .sort((a, b) => b.stats.pointsScored - a.stats.pointsScored);
    if (remaining.length > 0) {
      thirdPlace = remaining[0];
    }
  }

  const podium: PodiumPlace[] = [];
  if (champion) {
    podium.push({
      place: 1,
      participant: champion,
      title: 'Gran Campeón Supremo',
      medal: '🥇',
      colorScheme: 'gold',
      scoreSummary: `${champion.stats.matchesWon} Victorias`,
      details: `${champion.stats.pointsScored} pts anotados • Invictos`,
    });
  }
  if (runnerUp) {
    podium.push({
      place: 2,
      participant: runnerUp,
      title: 'Subcampeón de Plata',
      medal: '🥈',
      colorScheme: 'silver',
      scoreSummary: `${runnerUp.stats.matchesWon} Victorias`,
      details: `${runnerUp.stats.pointsScored} pts anotados • Finalista`,
    });
  }
  if (thirdPlace) {
    podium.push({
      place: 3,
      participant: thirdPlace,
      title: 'Tercer Lugar de Bronce',
      medal: '🥉',
      colorScheme: 'bronze',
      scoreSummary: `${thirdPlace.stats.matchesWon} Victorias`,
      details: `${thirdPlace.stats.pointsScored} pts anotados • Semifinalista`,
    });
  }

  return podium;
}
