export interface AnimalProfile {
  id: string;
  name: string;
  speciesName: string;
  emoji: string;
  accentColor: string;
  glowColor: string;
  bgGradient: [string, string];
  avatarPath: string; // Type key for custom vector renderer
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert' | 'extreme';

export interface RaceDifficulty {
  level: DifficultyLevel;
  name: string; // e.g. "Circuito Inicial", "Pista de Obstáculos", "Laberinto STEM", "Desafío de Precisión", "Gran Prix Master"
  multiplier: number; // e.g. 1.0, 1.25, 1.5, 1.75, 2.0
}

export type PointDistributionScheme = 'f1' | 'proportional' | 'exponential' | 'stem_linear' | 'custom';

export interface RaceTopResult {
  position: 1 | 2 | 3 | 4 | 5;
  participantId: string;
  basePoints: number;
  finalPoints: number; // basePoints * multiplier
}

export interface Race {
  id: string;
  raceNumber: number;
  title: string;
  durationSeconds: number; // e.g. 120 (2 min)
  difficulty: RaceDifficulty;
  status: 'pending' | 'in_progress' | 'completed';
  pointScheme: PointDistributionScheme;
  customBasePoints?: [number, number, number, number, number];
  top5Results?: RaceTopResult[];
  completedAt?: string;
}

export interface RaceTournamentConfig {
  totalRaces: number;
  raceDurationSeconds: number;
  difficultyProgression: 'standard' | 'accelerated' | 'epic_final' | 'custom';
  defaultPointScheme: PointDistributionScheme;
}

export interface ParticipantRaceStats {
  totalPoints: number;
  racesCompleted: number;
  podiumsCount: number;
  victoriesCount: number;
  top5Count: number;
  racePointsMap: Record<number, number>; // raceNumber -> points
}

export interface Participant {
  id: string;
  name: string;
  seed: number;
  animal: AnimalProfile;
  customAvatarUrl?: string;
  stats: {
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    pointsScored: number;
    pointsConceded: number;
  };
  raceStats?: ParticipantRaceStats;
}

export interface Match {
  id: string;
  roundIndex: number; // 0 is initial round, max is final
  matchIndex: number;
  participant1Id: string | null;
  participant2Id: string | null;
  score1: number | null;
  score2: number | null;
  winnerId: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  isSemifinal?: boolean;
  isFinal?: boolean;
  bestOf: number;
  notes?: string;
}

export type TournamentFormat = 'single_elimination' | 'round_robin' | 'double_elimination';
export type ViewMode = 'radial' | 'tree_horizontal' | 'tree_vertical' | 'round_robin';

export interface Tournament {
  id: string;
  title: string;
  format: TournamentFormat;
  participants: Participant[];
  matches: Match[];
  races?: Race[]; // For round robin / carreras format
  raceConfig?: RaceTournamentConfig;
  championId: string | null;
  totalRounds: number;
  createdAt: string;
}

export interface PodiumPlace {
  place: 1 | 2 | 3;
  participant: Participant;
  title: string;
  medal: string;
  colorScheme: 'gold' | 'silver' | 'bronze';
  scoreSummary: string;
  details: string;
}
