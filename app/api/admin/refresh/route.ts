import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin";
import { computeLeaderboard } from "@/lib/scoring";
import { fetchWorldCupGroupStage } from "@/lib/worldcup";
import { listPicks, listUsers, replaceLeaderboard, upsertMatches } from "@/lib/repositories";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { login?: string; pin?: string };
    if (!verifyAdmin(body.login ?? "", body.pin ?? "")) {
      return NextResponse.json({ error: "Niepoprawne dane admina." }, { status: 401 });
    }

    const matches = await fetchWorldCupGroupStage();
    await upsertMatches(matches);

    const users = await listUsers();
    const picks = await listPicks();
    const leaderboard = computeLeaderboard(
      users.map((user) => ({ userId: user.loginLower, login: user.login })),
      matches,
      picks
    );

    await replaceLeaderboard(leaderboard);

    return NextResponse.json({
      ok: true,
      matchesSynced: matches.length,
      leaderboardUsers: leaderboard.length
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Nie udało się odświeżyć wyników." }, { status: 500 });
  }
}
