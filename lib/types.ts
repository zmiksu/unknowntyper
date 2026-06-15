export type MatchStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "EXTRA_TIME"
  | "PENALTY_SHOOTOUT"
  | "FINISHED"
  | "SUSPENDED"
  | "POSTPONED"
  | "CANCELLED"
  | "AWARDED";

export type AppUser = {
  login: string;
  loginLower: string;
  pinHash: string;
  createdAt: string;
  lastLoginAt: string;
};

export type MatchDoc = {
  matchId: string;
  group: string;
  groupLabel: string;
  matchday: number | null;
  stage: string;
  homeTeam: string;
  awayTeam: string;
  homeTla: string;
  awayTla: string;
  kickoffUtc: string;
  status: MatchStatus;
  scoreHome: number | null;
  scoreAway: number | null;
  updatedAt: string;
};

export type PickDoc = {
  userId: string;
  login: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  updatedAt: string;
};

export type LeaderboardEntry = {
  userId: string;
  login: string;
  points: number;
  exactHits: number;
  updatedAt: string;
};

export type SessionPayload = {
  userId: string;
  login: string;
};

export type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: MatchStatus;
  stage: string;
  group: string;
  matchday: number | null;
  homeTeam: {
    name: string;
    tla?: string | null;
    shortName?: string | null;
  };
  awayTeam: {
    name: string;
    tla?: string | null;
    shortName?: string | null;
  };
  score: {
    fullTime?: {
      home?: number | null;
      away?: number | null;
    };
  };
};
