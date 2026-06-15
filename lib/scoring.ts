import type { LeaderboardEntry, MatchDoc, PickDoc } from "@/lib/types";

export function isLocked(match: MatchDoc): boolean {
  return new Date(match.kickoffUtc).getTime() <= Date.now() || !["SCHEDULED", "TIMED"].includes(match.status);
}

export function getStatusLabel(match: MatchDoc): string {
  switch (match.status) {
    case "FINISHED":
    case "AWARDED":
      return "Zakończony";
    case "IN_PLAY":
    case "PAUSED":
    case "EXTRA_TIME":
    case "PENALTY_SHOOTOUT":
      return "Trwa";
    case "POSTPONED":
      return "Przełożony";
    case "CANCELLED":
      return "Odwołany";
    default:
      return isLocked(match) ? "Zablokowany" : "Do typowania";
  }
}

export function computeLeaderboard(users: { userId: string; login: string }[], matches: MatchDoc[], picks: PickDoc[]): LeaderboardEntry[] {
  const finishedMatches = new Map(
    matches
      .filter((match) => match.status === "FINISHED" && match.scoreHome !== null && match.scoreAway !== null)
      .map((match) => [match.matchId, match])
  );

  const scoreByUser = new Map<string, LeaderboardEntry>();

  for (const user of users) {
    scoreByUser.set(user.userId, {
      userId: user.userId,
      login: user.login,
      points: 0,
      exactHits: 0,
      updatedAt: new Date().toISOString()
    });
  }

  for (const pick of picks) {
    const match = finishedMatches.get(pick.matchId);
    if (!match) continue;

    if (pick.homeScore === match.scoreHome && pick.awayScore === match.scoreAway) {
      const current = scoreByUser.get(pick.userId);
      if (!current) continue;
      current.points += 1;
      current.exactHits += 1;
      current.updatedAt = new Date().toISOString();
    }
  }

  return [...scoreByUser.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.login.localeCompare(b.login, "pl");
  });
}
