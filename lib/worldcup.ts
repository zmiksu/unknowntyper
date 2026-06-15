import type { FootballDataMatch, MatchDoc } from "@/lib/types";

const API_BASE = "https://api.football-data.org/v4";

function footballToken() {
  const token = process.env.FOOTBALL_DATA_API_TOKEN;
  if (!token) throw new Error("Brakuje FOOTBALL_DATA_API_TOKEN");
  return token;
}

export async function fetchWorldCupGroupStage(): Promise<MatchDoc[]> {
  const response = await fetch(
    `${API_BASE}/competitions/WC/matches?stage=GROUP_STAGE&season=2026`,
    {
      headers: {
        "X-Auth-Token": footballToken()
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(`football-data.org zwróciło ${response.status}`);
  }

  const data = (await response.json()) as { matches: FootballDataMatch[] };
  return (data.matches ?? []).map(normalizeMatch).sort((a, b) => {
    if (a.groupLabel === b.groupLabel) {
      return new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime();
    }
    return a.groupLabel.localeCompare(b.groupLabel);
  });
}

export function normalizeMatch(match: FootballDataMatch): MatchDoc {
  const group = match.group ?? "GROUP_UNKNOWN";
  const groupLabel = group.replace("GROUP_", "");

  return {
    matchId: String(match.id),
    group,
    groupLabel,
    matchday: match.matchday ?? null,
    stage: match.stage,
    homeTeam: match.homeTeam?.name ?? "TBD",
    awayTeam: match.awayTeam?.name ?? "TBD",
    homeTla: match.homeTeam?.tla ?? initials(match.homeTeam?.name ?? "TBD"),
    awayTla: match.awayTeam?.tla ?? initials(match.awayTeam?.name ?? "TBD"),
    kickoffUtc: match.utcDate,
    status: match.status,
    scoreHome: match.score?.fullTime?.home ?? null,
    scoreAway: match.score?.fullTime?.away ?? null,
    updatedAt: new Date().toISOString()
  };
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}
