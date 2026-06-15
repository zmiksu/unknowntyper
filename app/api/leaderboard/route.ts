import { NextResponse } from "next/server";
import { listLeaderboard } from "@/lib/repositories";

export async function GET() {
  try {
    const leaderboard = await listLeaderboard();
    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Nie udało się pobrać tabeli." }, { status: 500 });
  }
}
