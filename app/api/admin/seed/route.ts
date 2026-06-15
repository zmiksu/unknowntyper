import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin";
import { upsertMatches } from "@/lib/repositories";
import { fetchWorldCupGroupStage } from "@/lib/worldcup";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { login?: string; pin?: string };
    if (!verifyAdmin(body.login ?? "", body.pin ?? "")) {
      return NextResponse.json({ error: "Niepoprawne dane admina." }, { status: 401 });
    }

    const matches = await fetchWorldCupGroupStage();
    await upsertMatches(matches);

    return NextResponse.json({ ok: true, imported: matches.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Nie udało się zaimportować meczów." }, { status: 500 });
  }
}
