import { NextResponse } from "next/server";
import { listMatches } from "@/lib/repositories";

export async function GET() {
  try {
    const matches = await listMatches();
    return NextResponse.json({ matches });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Nie udało się pobrać meczów." }, { status: 500 });
  }
}
