import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listMatches, saveUserPicks } from "@/lib/repositories";
import { isLocked } from "@/lib/scoring";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Brak aktywnej sesji." }, { status: 401 });
    }

    const body = (await request.json()) as {
      picks?: Array<{ matchId: string; homeScore: number | null; awayScore: number | null }>;
    };

    const incoming = body.picks ?? [];
    if (!incoming.length) {
      return NextResponse.json({ error: "Brak typów do zapisu." }, { status: 400 });
    }

    const matches = await listMatches();
    const matchMap = new Map(matches.map((match) => [match.matchId, match]));

    const accepted = incoming.filter((pick) => {
      const match = matchMap.get(pick.matchId);
      if (!match) return false;
      if (isLocked(match)) return false;
      if (pick.homeScore === null || pick.awayScore === null) return true;
      if (!Number.isInteger(pick.homeScore) || !Number.isInteger(pick.awayScore)) return false;
      if (pick.homeScore < 0 || pick.awayScore < 0) return false;
      return true;
    });

    if (!accepted.length) {
      return NextResponse.json({ error: "Żaden typ nie nadawał się do zapisu." }, { status: 400 });
    }

    await saveUserPicks(session.userId, session.login, accepted);

    return NextResponse.json({ ok: true, saved: accepted.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Nie udało się zapisać typów." }, { status: 500 });
  }
}
